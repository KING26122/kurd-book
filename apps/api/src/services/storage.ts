import fs from 'node:fs';
import path from 'node:path';
import { env } from '../env';

/** Resolve the API package root regardless of the shell's working directory. */
export const uploadRoot = path.resolve(__dirname, '../..', env.UPLOAD_DIR);
export const publicUploadDir = path.join(uploadRoot, 'public');
export const privateUploadDir = path.join(uploadRoot, 'private');

export function ensureUploadDirs(): void {
  fs.mkdirSync(publicUploadDir, { recursive: true });
  fs.mkdirSync(privateUploadDir, { recursive: true });
}

export function publicUrlFor(filename: string): string {
  return `/uploads/${filename}`;
}

export function privateUrlFor(filename: string): string {
  return `/api/uploads/private/${filename}`;
}

/** Returns an absolute path only when the basename is a plain safe filename. */
export function privateFilePath(filenameOrUrl: string): string | null {
  const filename = path.basename(filenameOrUrl.split('?')[0] || '');
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  return path.join(privateUploadDir, filename);
}

export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'application/octet-stream': '.enc',
    'application/pdf': '.pdf',
  };
  return map[mime] || '.bin';
}

export function mediaKindForMime(mime: string): 'image' | 'video' | 'audio' | 'file' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

export function mimeForPrivateFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}
