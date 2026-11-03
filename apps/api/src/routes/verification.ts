import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { conflict, notFound, parseWith, unauthorized } from '../utils/errors';
import { notifyAdmins } from '../services/notifications';

const privateUrl = z.string().regex(/^\/api\/uploads\/private\/[A-Za-z0-9._-]+$/);

const verificationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const [user, requests] = await Promise.all([
      db.user.findUnique({
        where: { id: req.auth.userId },
        select: { verificationStatus: true, verifiedAt: true },
      }),
      db.verificationRequest.findMany({
        where: { userId: req.auth.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          note: true,
          createdAt: true,
          reviewedAt: true,
          frontUrl: true,
          backUrl: true,
          selfieUrl: true,
        },
      }),
    ]);
    if (!user) throw notFound();
    return { status: user.verificationStatus, verifiedAt: user.verifiedAt, requests };
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({
        frontUrl: privateUrl,
        backUrl: privateUrl,
        selfieUrl: privateUrl,
        consent: z.literal(true),
      }),
      req.body,
    );

    const pending = await db.verificationRequest.findFirst({
      where: { userId: req.auth.userId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) throw conflict('داواکارییەکی پشتڕاستکردنەوەت لە چاوەڕوانیدایە.');

    const me = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { verificationStatus: true, name: true, username: true },
    });
    if (!me) throw notFound();
    if (me.verificationStatus === 'VERIFIED') throw conflict('هەژمارەکەت پێشتر پشتڕاست کراوەتەوە.');

    const request = await db.verificationRequest.create({
      data: {
        userId: req.auth.userId,
        frontUrl: body.frontUrl,
        backUrl: body.backUrl,
        selfieUrl: body.selfieUrl,
      },
    });
    await db.user.update({
      where: { id: req.auth.userId },
      data: { verificationStatus: 'PENDING' },
    });
    await notifyAdmins(
      'VERIFICATION',
      'داواکاری پشتڕاستکردنەوەی نوێ',
      `${me.name} (@${me.username}) داواکاری پشتڕاستکردنەوەی ناسنامەی ناردووە.`,
      { verificationId: request.id, username: me.username },
    );
    return reply.status(201).send({ ok: true, request });
  });

  app.delete('/pending', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const pending = await db.verificationRequest.findFirst({
      where: { userId: req.auth.userId, status: 'PENDING' },
      select: { id: true },
    });
    if (!pending) throw notFound('داواکارییەکی چاوەڕوان نەدۆزرایەوە.');
    await db.$transaction([
      db.verificationRequest.delete({ where: { id: pending.id } }),
      db.user.update({
        where: { id: req.auth.userId },
        data: { verificationStatus: 'NONE' },
      }),
    ]);
    return { ok: true };
  });
};

export default verificationRoutes;
