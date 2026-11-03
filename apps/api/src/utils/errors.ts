import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type ZodTypeAny } from 'zod';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = 'داواکارییەکە دروست نییە', details?: unknown) =>
  new AppError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = 'تکایە سەرەتا بچۆ ژوورەوە') =>
  new AppError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'دەستڕاگەیشتن نییە') =>
  new AppError(403, message, 'FORBIDDEN');
export const notFound = (message = 'نەدۆزرایەوە') => new AppError(404, message, 'NOT_FOUND');
export const conflict = (message = 'ئەمە پێشتر هەیە') => new AppError(409, message, 'CONFLICT');

export function parseWith<S extends ZodTypeAny>(schema: S, data: unknown): S['_output'] {
  try {
    return schema.parse(data) as S['_output'];
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      const message = first ? translateZodMessage(first.path.join('.'), first.message) : 'داتای نادروست';
      throw new AppError(400, message, 'VALIDATION_ERROR', error.flatten());
    }
    throw error;
  }
}

function translateZodMessage(path: string, message: string): string {
  if (message.includes('Required')) return `خانەی «${path || 'زانیاری'}» پێویستە`;
  if (message.includes('Invalid email')) return 'ئیمەیڵەکە دروست نییە';
  if (message.includes('at least')) return 'تێکستەکە زۆر کورتە';
  if (message.includes('String must contain')) return 'ژمارەی پیتەکان دروست نییە';
  if (path) return `خانەی «${path}» دروست نییە`;
  return 'داتاکان دروست نین';
}

export function errorHandler(
  error: Error & { statusCode?: number; code?: string; details?: unknown },
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = error instanceof AppError ? error.statusCode : error.statusCode || 500;
  if (statusCode >= 500) {
    req.log.error({ err: error }, 'Unhandled error');
  }
  reply.status(statusCode).send({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message:
        statusCode >= 500 && process.env.NODE_ENV === 'production'
          ? 'هەڵەیەکی ناوخۆیی ڕوویدا. تکایە دواتر هەوڵ بدەوە.'
          : error.message || 'هەڵەیەکی نەزانراو',
      details: error instanceof AppError ? error.details : undefined,
    },
  });
}
