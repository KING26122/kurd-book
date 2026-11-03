import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { AppError, badRequest, forbidden, parseWith, unauthorized } from '../utils/errors';
import {
  ensureUploadDirs,
  extensionForMime,
  mediaKindForMime,
  privateUploadDir,
  privateUrlFor,
  publicUploadDir,
  publicUrlFor,
} from '../services/storage';

const imageMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);
const videoMimes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska']);
const audioMimes = new Set(['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav']);

const uploadsRoutes: FastifyPluginAsync = async (app) => {
  ensureUploadDirs();

  app.post(
    '/',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 80, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      if (!req.auth) throw unauthorized();
      const query = parseWith(
        z.object({
          kind: z
            .enum(['avatar', 'cover', 'post', 'story', 'chat', 'verification', 'receipt'])
            .default('post'),
        }),
        req.query,
      );

      if (!req.isMultipart()) throw badRequest('فایلی دروست بنێرە (multipart/form-data).');
      const upload = await req.file();
      if (!upload) throw badRequest('فایلەکە نەدۆزرایەوە.');

      const mime = (upload.mimetype || 'application/octet-stream').toLowerCase();
      const isPrivate = query.kind === 'verification' || query.kind === 'receipt';
      const isEncryptedBlob = query.kind === 'chat' && mime === 'application/octet-stream';

      const allowed =
        imageMimes.has(mime) ||
        videoMimes.has(mime) ||
        audioMimes.has(mime) ||
        (query.kind === 'chat' && mime === 'application/octet-stream') ||
        (query.kind === 'verification' && isPrivate && imageMimes.has(mime)) ||
        (query.kind === 'receipt' && (imageMimes.has(mime) || mime === 'application/pdf'));

      if (!allowed) {
        upload.file.resume();
        throw badRequest('جۆری ئەم فایلە پشتگیری نەکراوە.');
      }

      if (query.kind === 'verification' && !imageMimes.has(mime)) {
        upload.file.resume();
        throw badRequest('بەڵگەنامەی پشتڕاستکردنەوە دەبێت وێنە بێت.');
      }

      if ((query.kind === 'avatar' || query.kind === 'cover') && !imageMimes.has(mime)) {
        upload.file.resume();
        throw badRequest('وێنەی پرۆفایل دەبێت وێنە بێت.');
      }

      const targetDir = isPrivate ? privateUploadDir : publicUploadDir;
      fs.mkdirSync(targetDir, { recursive: true });
      const filename = `${Date.now()}-${crypto.randomUUID()}${extensionForMime(mime)}`;
      const dest = path.join(targetDir, filename);
      let size = 0;

      upload.file.on('data', (chunk: Buffer) => {
        size += chunk.length;
      });

      try {
        await pipeline(upload.file, fs.createWriteStream(dest, { flags: 'wx' }));
      } catch (error) {
        fs.rm(dest, { force: true }, () => undefined);
        if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          throw new AppError(413, 'فایلەکە زۆر گەورەیە.');
        }
        throw error;
      }

      if (size === 0) {
        fs.rm(dest, { force: true }, () => undefined);
        throw badRequest('فایلەکە بەتاڵە.');
      }

      const url = isPrivate ? privateUrlFor(filename) : publicUrlFor(filename);
      app.log.info(
        { userId: req.auth.userId, kind: query.kind, size, filename, encrypted: isEncryptedBlob },
        'upload stored',
      );

      return reply.status(201).send({
        url,
        filename,
        size,
        mime,
        kind: mediaKindForMime(mime),
        encrypted: isEncryptedBlob,
      });
    },
  );

  // Only the owner can download their own private verification/receipt file.
  // Admins use dedicated endpoints under /api/admin.
  app.get('/private/:filename', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const { filename } = parseWith(z.object({ filename: z.string().min(1) }), req.params);
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) throw badRequest('ناوی فایل دروست نییە.');

    const url = privateUrlFor(filename);
    const ownerFilter = req.auth.role === 'ADMIN' ? {} : { userId: req.auth.userId };
    const [ownedVerification, ownedReceipt] = await Promise.all([
      db.verificationRequest.findFirst({
        where: {
          ...ownerFilter,
          OR: [{ frontUrl: url }, { backUrl: url }, { selfieUrl: url }],
        },
        select: { id: true },
      }),
      db.proRequest.findFirst({
        where: { ...ownerFilter, receiptUrl: url },
        select: { id: true },
      }),
    ]);
    if (!ownedVerification && !ownedReceipt) throw forbidden('دەستڕاگەیشتن نییە.');

    const filePath = path.join(privateUploadDir, path.basename(filename));
    if (!fs.existsSync(filePath)) throw badRequest('فایلەکە بوونی نییە.');
    reply.header('Cache-Control', 'private, no-store');
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    reply.type(mime);
    return reply.send(fs.createReadStream(filePath));
  });
};

export default uploadsRoutes;
