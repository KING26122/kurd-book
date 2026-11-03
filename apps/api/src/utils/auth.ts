import type { FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { env, isProd } from '../env';
import { forbidden, unauthorized } from './errors';
import { touchActivity } from './activity';

export type Role = 'USER' | 'ADMIN';

export interface AuthContext {
  userId: string;
  role: Role;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string, role: Role, sessionId: string): string {
  return jwt.sign({ sub: userId, role, sid: sessionId, type: 'access' }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'kurdbook',
    audience: 'kurdbook-app',
  });
}

export function signChallenge(userId: string, purpose: '2fa' | 'reset'): string {
  return jwt.sign({ sub: userId, type: purpose }, env.JWT_SECRET, {
    expiresIn: '7m',
    issuer: 'kurdbook',
    audience: 'kurdbook-challenge',
  });
}

export function verifyChallenge(token: string, purpose: '2fa' | 'reset'): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'kurdbook',
      audience: 'kurdbook-challenge',
    }) as jwt.JwtPayload;
    if (payload.type !== purpose || !payload.sub) throw new Error('bad challenge');
    return payload.sub;
  } catch {
    throw unauthorized('کۆدی پشتڕاستکردنەوە بەسەرچووە. تکایە دووبارە هەوڵ بدەوە.');
  }
}

const ACCESS_AUDIENCE = 'kurdbook-app';
const ACCESS_ISSUER = 'kurdbook';

export function verifyAccessToken(token: string): { userId: string; role: Role; sessionId: string } {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ACCESS_ISSUER,
      audience: ACCESS_AUDIENCE,
    }) as jwt.JwtPayload;
    if (payload.type !== 'access' || !payload.sub || !payload.sid) throw new Error('bad token');
    return {
      userId: payload.sub,
      role: (payload.role as Role) || 'USER',
      sessionId: payload.sid,
    };
  } catch {
    throw unauthorized('دانیشتنەکەت بەسەرچووە. تکایە دووبارە بچۆ ژوورەوە.');
  }
}

function getBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = getBearer(req);
  if (!token) throw unauthorized();
  const data = verifyAccessToken(token);

  const session = await db.session.findUnique({
    where: { id: data.sessionId },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.userId !== data.userId) {
    throw unauthorized('دانیشتنەکەت بەسەرچووە. تکایە دووبارە بچۆ ژوورەوە.');
  }

  const user = await db.user.findUnique({
    where: { id: data.userId },
    select: { role: true, disabled: true },
  });
  if (!user || user.disabled) throw forbidden('هەژمارەکەت ناچالاک کراوە.');

  req.auth = { userId: data.userId, role: user.role as Role, sessionId: data.sessionId };
  touchActivity(data.userId);
}

export async function optionalAuth(req: FastifyRequest): Promise<void> {
  const token = getBearer(req);
  if (!token) return;
  try {
    const data = verifyAccessToken(token);
    const session = await db.session.findUnique({
      where: { id: data.sessionId },
      select: { userId: true, expiresAt: true, revokedAt: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return;
    req.auth = { userId: data.userId, role: data.role, sessionId: data.sessionId };
  } catch {
    // public route: ignore invalid tokens
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (req.auth?.role !== 'ADMIN') throw forbidden('تەنها بەڕێوەبەر دەتوانێت ئەمە بکات.');
}

export function refreshCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function secureCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
