import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import qrcode from 'qrcode';
import { authenticator } from 'otplib';
import { db } from '../db';
import {
  hashPassword,
  refreshCookieOptions,
  requireAuth,
  randomToken,
  sha256,
  signAccessToken,
  signChallenge,
  verifyChallenge,
  verifyPassword,
} from '../utils/auth';
import { AppError, badRequest, conflict, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { encryptSecret, decryptSecret } from '../utils/secrets';
import { selfUserSelect } from '../utils/serializers';
import { env, otpDebugEnabled } from '../env';
import {
  issueOtp,
  normalizeIdentifier,
  verifyOtp,
  type OtpChannel,
  type OtpPurpose,
} from '../services/otp';

authenticator.options = { window: 1 };

const REFRESH_COOKIE = 'kb_refresh';
const ADMIN_REFRESH_COOKIE = 'kb_admin_refresh';
const REFRESH_TTL_MS = env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

/**
 * The admin dashboard uses its own refresh cookie so that signing in as an
 * administrator in the same browser does not replace an ordinary user session
 * (and vice versa). The header is client-controlled, but the server still
 * enforces the ADMIN role before issuing or rotating this cookie.
 */
function isAdminClient(req: FastifyRequest): boolean {
  return req.headers['x-kb-client'] === 'admin';
}

function refreshCookieName(req: FastifyRequest): string {
  return isAdminClient(req) ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE;
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'ناوی بەکارهێنەر لانیکەم ٣ پیت بێت')
  .max(24, 'ناوی بەکارهێنەر زۆر درێژە')
  .regex(/^[a-z0-9_]+$/, 'تەنها پیتی ئینگلیزی بچووک، ژمارە و _');

const passwordSchema = z
  .string()
  .min(8, 'وشەی نهێنی لانیکەم ٨ پیت بێت')
  .max(128, 'وشەی نهێنی زۆر درێژە');

async function sessionPayload(
  userId: string,
  sessionId: string,
  role: string,
) {
  const user = await db.user.findUnique({ where: { id: userId }, select: selfUserSelect });
  if (!user) throw unauthorized();
  const [notifications, friendRequests] = await Promise.all([
    db.notification.count({ where: { userId, readAt: null } }),
    db.friendship.count({ where: { addresseeId: userId, status: 'PENDING' } }),
  ]);
  return {
    accessToken: signAccessToken(userId, role as 'USER' | 'ADMIN', sessionId),
    user: {
      ...user,
      email: user.email || null,
      phone: user.phone || null,
      unreadNotifications: notifications,
      pendingFriendRequests: friendRequests,
      isPro: Boolean(user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
      online: true,
    },
  };
}

async function createSession(
  req: FastifyRequest,
  reply: FastifyReply,
  userId: string,
  role: string,
) {
  if (isAdminClient(req) && role !== 'ADMIN') {
    throw forbidden('ئەم هەژمارە دەستگەیشتنی بەڕێوەبەر نییە.');
  }
  const refreshToken = randomToken();
  const session = await db.session.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: (req.headers['user-agent'] || '').slice(0, 300),
      ip: req.ip,
    },
  });
  reply.setCookie(refreshCookieName(req), refreshToken, refreshCookieOptions(REFRESH_TTL_MS));
  const payload = await sessionPayload(userId, session.id, role);
  // `refreshToken` is returned in the JSON body so native (Flutter) clients can
  // persist it alongside the httpOnly cookie used by web clients. Web clients
  // simply ignore it; behaviour stays identical.
  return { ...payload, refreshToken };
}

function channelOf(identifier: string): { channel: OtpChannel; value: string } {
  const isEmail = identifier.includes('@');
  const channel: OtpChannel = isEmail ? 'email' : 'phone';
  return { channel, value: normalizeIdentifier(channel, identifier) };
}

const authRoutes: FastifyPluginAsync = async (app) => {
  // ── Register ────────────────────────────────────────────────────────────
  app.post(
    '/register',
    { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parseWith(
        z.object({
          name: z.string().trim().min(2, 'ناو لانیکەم ٢ پیت بێت').max(60, 'ناو زۆر درێژە'),
          username: usernameSchema,
          channel: z.enum(['email', 'phone']),
          identifier: z.string().trim().min(3).max(120),
          password: passwordSchema,
          avatarUrl: z.string().max(500).optional().nullable(),
        }),
        req.body,
      );

      const identifier = normalizeIdentifier(body.channel, body.identifier);
      const identifierWhere =
        body.channel === 'email' ? { email: identifier } : { phone: identifier };

      const existing = await db.user.findFirst({
        where: { OR: [{ email: identifier }, { phone: identifier }] },
        include: {
          _count: { select: { posts: true } },
        },
      });

      if (existing) {
        const verified =
          body.channel === 'email' ? Boolean(existing.emailVerifiedAt) : Boolean(existing.phoneVerifiedAt);
        if (verified) throw conflict('ئەم هەژمارە پێشتر تۆمارکراوە. تکایە بچۆ ژوورەوە.');
        if (existing.username !== body.username) {
          const taken = await db.user.findFirst({
            where: { username: body.username, NOT: { id: existing.id } },
            select: { id: true },
          });
          if (taken) throw conflict('ناوی بەکارهێنەرەکە بەکارهاتووە.');
        }
        const updated = await db.user.update({
          where: { id: existing.id },
          data: {
            name: body.name,
            username: body.username,
            passwordHash: await hashPassword(body.password),
            avatarUrl: body.avatarUrl || existing.avatarUrl,
            ...(body.channel === 'email' ? { email: identifier } : { phone: identifier }),
          },
        });
        const otp = await issueOtp({
          identifier,
          channel: body.channel,
          purpose: 'REGISTER',
          userId: updated.id,
        });
        return reply.status(201).send({
          pending: true,
          channel: body.channel,
          identifier,
          ...(otp.debugCode ? { debugCode: otp.debugCode } : {}),
          message: 'کۆدی پشتڕاستکردنەوە نێردرا.',
        });
      }

      const usernameTaken = await db.user.findUnique({
        where: { username: body.username },
        select: { id: true },
      });
      if (usernameTaken) throw conflict('ناوی بەکارهێنەرەکە بەکارهاتووە.');

      const user = await db.user.create({
        data: {
          name: body.name,
          username: body.username,
          passwordHash: await hashPassword(body.password),
          avatarUrl: body.avatarUrl || null,
          ...(body.channel === 'email' ? { email: identifier } : { phone: identifier }),
        },
      });

      const otp = await issueOtp({
        identifier,
        channel: body.channel,
        purpose: 'REGISTER',
        userId: user.id,
      });

      return reply.status(201).send({
        pending: true,
        channel: body.channel,
        identifier,
        ...(otp.debugCode ? { debugCode: otp.debugCode } : {}),
        message: 'کۆدی پشتڕاستکردنەوە نێردرا.',
      });
    },
  );

  // ── Verify registration OTP ────────────────────────────────────────────
  app.post(
    '/verify-register',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parseWith(
        z.object({
          channel: z.enum(['email', 'phone']),
          identifier: z.string().min(3),
          code: z.string().regex(/^\d{6}$/, 'کۆد دەبێت ٦ ژمارە بێت'),
        }),
        req.body,
      );
      const identifier = normalizeIdentifier(body.channel, body.identifier);
      const user = await db.user.findFirst({
        where: {
          ...(body.channel === 'email' ? { email: identifier } : { phone: identifier }),
        },
      });
      if (!user) throw notFound('هەژمارەکە نەدۆزرایەوە.');
      if (user.disabled) throw forbidden('هەژمارەکە ناچالاک کراوە.');

      await verifyOtp({ identifier, purpose: 'REGISTER', code: body.code });

      const verifiedField =
        body.channel === 'email' ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() };
      await db.user.update({ where: { id: user.id }, data: verifiedField });

      const result = await createSession(req, reply, user.id, user.role);
      return { ...result, verified: true };
    },
  );

  // ── Resend OTP ─────────────────────────────────────────────────────────
  app.post(
    '/resend-otp',
    { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (req) => {
      const body = parseWith(
        z.object({
          channel: z.enum(['email', 'phone']),
          identifier: z.string().min(3),
          purpose: z.enum(['REGISTER', 'RESET']),
        }),
        req.body,
      );
      const identifier = normalizeIdentifier(body.channel, body.identifier);
      const user = await db.user.findFirst({
        where: {
          ...(body.channel === 'email' ? { email: identifier } : { phone: identifier }),
        },
      });
      if (!user) throw notFound('هەژمارەکە نەدۆزرایەوە.');
      if (user.disabled) throw forbidden('هەژمارەکە ناچالاک کراوە.');

      if (body.purpose === 'REGISTER') {
        const verified =
          body.channel === 'email' ? Boolean(user.emailVerifiedAt) : Boolean(user.phoneVerifiedAt);
        if (verified) throw conflict('هەژمارەکە پێشتر پشتڕاست کراوەتەوە.');
      }

      const otp = await issueOtp({
        identifier,
        channel: body.channel,
        purpose: body.purpose as OtpPurpose,
        userId: user.id,
      });
      return {
        ok: true,
        message: 'کۆدی نوێ نێردرا.',
        ...(otp.debugCode ? { debugCode: otp.debugCode } : {}),
      };
    },
  );

  // ── Login ───────────────────────────────────────────────────────────────
  app.post(
    '/login',
    { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parseWith(
        z.object({
          identifier: z.string().trim().min(3).max(120),
          password: z.string().min(1).max(128),
        }),
        req.body,
      );

      const { channel, value } = channelOf(body.identifier);
      const user = await db.user.findFirst({
        where: { ...(channel === 'email' ? { email: value } : { phone: value }) },
      });
      if (!user) throw unauthorized('ئیمەیڵ/مۆبایل یان وشەی نهێنی هەڵەیە.');
      if (user.disabled) throw forbidden('هەژمارەکەت ناچالاک کراوە. تکایە پەیوەندی بە بەڕێوەبەر بکە.');
      if (!(await verifyPassword(body.password, user.passwordHash))) {
        throw unauthorized('ئیمەیڵ/مۆبایل یان وشەی نهێنی هەڵەیە.');
      }

      const verified =
        channel === 'email' ? Boolean(user.emailVerifiedAt) : Boolean(user.phoneVerifiedAt);
      if (!verified) {
        throw new AppError(
          403,
          'سەرەتا ئیمەیڵ/مۆبایلەکەت پشتڕاست بکەوە. کۆدێکی نوێ داوا بکە.',
          'EMAIL_NOT_VERIFIED',
          { channel, identifier: value },
        );
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        return reply.send({
          twoFactorRequired: true,
          challenge: signChallenge(user.id, '2fa'),
          channel,
          identifier: value,
        });
      }

      const result = await createSession(req, reply, user.id, user.role);
      return result;
    },
  );

  // ── 2FA challenge during login ─────────────────────────────────────────
  app.post(
    '/2fa/verify-login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = parseWith(
        z.object({
          challenge: z.string().min(10),
          code: z.string().trim().min(6).max(8),
        }),
        req.body,
      );
      const userId = verifyChallenge(body.challenge, '2fa');
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw badRequest('پشتڕاستکردنەوەی دوو هەنگاوی بۆ ئەم هەژمارە چالاک نییە.');
      }
      if (user.disabled) throw forbidden('هەژمارەکە ناچالاک کراوە.');
      const secret = decryptSecret(user.twoFactorSecret);
      const valid = authenticator.verify({ token: body.code.replace(/\s/g, ''), secret });
      if (!valid) throw unauthorized('کۆدی 2FA هەڵەیە یان بەسەرچووە.');
      return createSession(req, reply, user.id, user.role);
    },
  );

  // ── Refresh session ─────────────────────────────────────────────────────
  app.post('/refresh', async (req, reply) => {
    const cookieName = refreshCookieName(req);
    // Refresh token may arrive via cookie (web) or JSON body (native client).
    const bodyToken = (req.body ?? {}) as { token?: unknown };
    const token = typeof bodyToken.token === 'string' && bodyToken.token.length > 0 ? bodyToken.token : req.cookies[cookieName];
    if (!token) throw unauthorized('دانیشتنەکەت بەسەرچووە.');
    const session = await db.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: selfUserSelect } },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      reply.clearCookie(cookieName, { path: '/api/auth' });
      throw unauthorized('دانیشتنەکەت بەسەرچووە. تکایە دووبارە بچۆ ژوورەوە.');
    }
    if (session.user.disabled) {
      await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      reply.clearCookie(cookieName, { path: '/api/auth' });
      throw forbidden('هەژمارەکەت ناچالاک کراوە.');
    }
    if (isAdminClient(req) && session.user.role !== 'ADMIN') {
      await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      reply.clearCookie(cookieName, { path: '/api/auth' });
      throw forbidden('ئەم دانیشتنە دەستگەیشتنی بەڕێوەبەر نییە.');
    }

    // Rotate the refresh token on every use.
    const newToken = randomToken();
    const updated = await db.session.update({
      where: { id: session.id },
      data: {
        tokenHash: sha256(newToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    reply.setCookie(cookieName, newToken, refreshCookieOptions(REFRESH_TTL_MS));

    const result = await sessionPayload(updated.userId, updated.id, session.user.role);
    // Return the rotated refresh token for native clients (additive).
    return { ...result, refreshToken: newToken };
  });

  // ── Logout ──────────────────────────────────────────────────────────────
  app.post('/logout', async (req, reply) => {
    const cookieName = refreshCookieName(req);
    const token = req.cookies[cookieName];
    if (token) {
      await db.session.updateMany({
        where: { tokenHash: sha256(token) },
        data: { revokedAt: new Date() },
      });
    }
    reply.clearCookie(cookieName, { path: '/api/auth' });
    return { ok: true };
  });

  app.post('/logout-all', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    await db.session.updateMany({
      where: { userId: req.auth.userId, id: { not: req.auth.sessionId } },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  });

  app.get('/sessions', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const sessions = await db.session.findMany({
      where: { userId: req.auth.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    });
    return {
      sessions: sessions.map((s) => ({ ...s, current: s.id === req.auth!.sessionId })),
    };
  });

  app.delete('/sessions/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    if (id === req.auth.sessionId) throw badRequest('ناتوانیت دانیشتنی ئێستا لەم ڕێگەیە دایبخەیت.');
    await db.session.updateMany({
      where: { id, userId: req.auth.userId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  });

  // ── Forgot / reset password ────────────────────────────────────────────
  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } },
    async (req) => {
      const body = parseWith(
        z.object({ identifier: z.string().trim().min(3).max(120) }),
        req.body,
      );
      const { channel, value } = channelOf(body.identifier);
      const user = await db.user.findFirst({
        where: { ...(channel === 'email' ? { email: value } : { phone: value }) },
      });
      if (!user || user.disabled) {
        return { ok: true, message: 'ئەگەر هەژمارەکە هەبێت، کۆد نێردرا.' };
      }
      const otp = await issueOtp({
        identifier: value,
        channel,
        purpose: 'RESET',
        userId: user.id,
      });
      return {
        ok: true,
        channel,
        identifier: value,
        message: 'کۆدی گۆڕینی وشەی نهێنی نێردرا.',
        ...(otp.debugCode ? { debugCode: otp.debugCode } : {}),
      };
    },
  );

  app.post(
    '/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req) => {
      const body = parseWith(
        z.object({
          identifier: z.string().trim().min(3).max(120),
          code: z.string().regex(/^\d{6}$/),
          password: passwordSchema,
        }),
        req.body,
      );
      const { channel, value } = channelOf(body.identifier);
      const user = await db.user.findFirst({
        where: { ...(channel === 'email' ? { email: value } : { phone: value }) },
      });
      if (!user) throw notFound('هەژمارەکە نەدۆزرایەوە.');
      await verifyOtp({ identifier: value, purpose: 'RESET', code: body.code });
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(body.password),
          ...(channel === 'email' ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }),
        },
      });
      await db.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true, message: 'وشەی نهێنی گۆڕدرا. تکایە بچۆ ژوورەوە.' };
    },
  );

  app.post(
    '/change-password',
    { preHandler: requireAuth, config: { rateLimit: { max: 8, timeWindow: '1 minute' } } },
    async (req) => {
      if (!req.auth) throw unauthorized();
      const body = parseWith(
        z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }),
        req.body,
      );
      const user = await db.user.findUnique({ where: { id: req.auth.userId } });
      if (!user) throw notFound();
      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
        throw badRequest('وشەی نهێنی ئێستا هەڵەیە.');
      }
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(body.newPassword) },
      });
      await db.session.updateMany({
        where: { userId: user.id, id: { not: req.auth.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    },
  );

  // ── Me ──────────────────────────────────────────────────────────────────
  app.get('/me', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: selfUserSelect,
    });
    if (!user) throw notFound();
    const [notifications, friendRequests, unreadMessages] = await Promise.all([
      db.notification.count({ where: { userId: user.id, readAt: null } }),
      db.friendship.count({ where: { addresseeId: user.id, status: 'PENDING' } }),
      db.conversationMember.count({
        where: {
          userId: user.id,
          conversation: {
            messages: {
              some: { senderId: { not: user.id } },
            },
          },
        },
      }),
    ]);
    return {
      user: {
        ...user,
        isPro: Boolean(user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
        unreadNotifications: notifications,
        pendingFriendRequests: friendRequests,
        unreadConversations: unreadMessages,
        online: true,
      },
    };
  });

  // ── Two-factor authentication ──────────────────────────────────────────
  app.post('/2fa/setup', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { email: true, username: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) throw notFound();
    if (user.twoFactorEnabled) throw conflict('2FA پێشتر چالاک کراوە. سەرەتا ناچالاکی بکە.');

    const secret = authenticator.generateSecret();
    const encrypted = encryptSecret(secret);
    await db.user.update({
      where: { id: req.auth.userId },
      data: { twoFactorSecret: encrypted, twoFactorEnabled: false },
    });
    const label = user.email || `${user.username}@kurdbook.app`;
    const otpauth = authenticator.keyuri(label, 'Kurd Book', secret);
    const qrDataUrl = await qrcode.toDataURL(otpauth, {
      margin: 1,
      width: 280,
      color: { dark: '#0b1020', light: '#ffffff' },
    });
    return { secret, otpauth, qrDataUrl };
  });

  app.post('/2fa/enable', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(z.object({ code: z.string().min(6).max(8) }), req.body);
    const user = await db.user.findUnique({ where: { id: req.auth.userId } });
    if (!user?.twoFactorSecret) throw badRequest('سەرەتا 2FA ڕێکبخە.');
    const valid = authenticator.verify({
      token: body.code.replace(/\s/g, ''),
      secret: decryptSecret(user.twoFactorSecret),
    });
    if (!valid) throw badRequest('کۆدی 2FA هەڵەیە.');
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, totpConfirmedAt: new Date() },
    });
    return { ok: true };
  });

  app.post('/2fa/disable', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({ password: z.string().min(1), code: z.string().min(6).max(8) }),
      req.body,
    );
    const user = await db.user.findUnique({ where: { id: req.auth.userId } });
    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      throw badRequest('2FA چالاک نییە.');
    }
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      throw badRequest('وشەی نهێنی هەڵەیە.');
    }
    const valid = authenticator.verify({
      token: body.code.replace(/\s/g, ''),
      secret: decryptSecret(user.twoFactorSecret),
    });
    if (!valid) throw badRequest('کۆدی 2FA هەڵەیە.');
    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        totpConfirmedAt: null,
      },
    });
    return { ok: true };
  });

  app.get('/otp-channel', async () => ({
    emailEnabled: true,
    smsEnabled: true,
    mode: env.EMAIL_PROVIDER === 'console' ? 'console' : env.EMAIL_PROVIDER,
    smsMode: env.SMS_PROVIDER,
    debug: otpDebugEnabled,
  }));
};

export default authRoutes;
