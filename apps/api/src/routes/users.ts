import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { optionalAuth, requireAuth } from '../utils/auth';
import { badRequest, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { publicUserSelect } from '../utils/serializers';

const themes = ['dark', 'moredark', 'rush', 'gold'] as const;
const voiceEffects = ['natural', 'warm', 'radio', 'echo', 'deep', 'bright'] as const;

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({
        name: z.string().trim().min(2).max(60).optional(),
        bio: z.string().trim().max(280).optional().nullable(),
        city: z.string().trim().max(80).optional().nullable(),
        gender: z.enum(['male', 'female', 'other']).optional().nullable(),
        birthDate: z.string().datetime().optional().nullable(),
        avatarUrl: z.string().max(600).optional().nullable(),
        coverUrl: z.string().max(600).optional().nullable(),
        theme: z.enum(themes).optional(),
        voiceEffect: z.enum(voiceEffects).optional(),
        publicKey: z
          .string()
          .regex(/^[A-Za-z0-9+/=]{40,60}$/, 'کلیلی گشتی دروست نییە')
          .optional()
          .nullable(),
      }),
      req.body,
    );

    if (body.publicKey) {
      const existing = await db.user.findUnique({
        where: { id: req.auth.userId },
        select: { publicKey: true },
      });
      if (existing?.publicKey && existing.publicKey !== body.publicKey) {
        // Allowed, but old encrypted messages cannot be recovered. The client warns explicitly.
      }
    }

    const user = await db.user.update({
      where: { id: req.auth.userId },
      data: {
        ...body,
        birthDate: body.birthDate === null ? null : body.birthDate ? new Date(body.birthDate) : undefined,
      },
      select: {
        ...publicUserSelect,
        email: true,
        phone: true,
        role: true,
        theme: true,
        twoFactorEnabled: true,
        gender: true,
        birthDate: true,
        publicKey: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
    return { user };
  });

  app.get('/search', { preHandler: optionalAuth }, async (req) => {
    const { q } = parseWith(
      z.object({ q: z.string().trim().min(1).max(80), limit: z.coerce.number().min(1).max(30).default(20) }),
      req.query,
    );
    const me = req.auth?.userId;
    const blockedByMe = me
      ? await db.block.findMany({ where: { blockerId: me }, select: { blockedId: true } })
      : [];
    const blockedMe = me
      ? await db.block.findMany({ where: { blockedId: me }, select: { blockerId: true } })
      : [];
    const excluded = [...blockedByMe.map((b) => b.blockedId), ...blockedMe.map((b) => b.blockerId)];

    const users = await db.user.findMany({
      where: {
        disabled: false,
        ...(me ? { id: { notIn: [me, ...excluded] } } : {}),
        OR: [
          { name: { contains: q } },
          { username: { contains: q.toLowerCase() } },
          { bio: { contains: q } },
        ],
      },
      select: publicUserSelect,
      take: 20,
      orderBy: [{ verificationStatus: 'desc' }, { isPro: 'desc' }, { name: 'asc' }],
    });
    return { users };
  });

  app.get('/:username', { preHandler: optionalAuth }, async (req) => {
    const { username } = parseWith(
      z.object({ username: z.string().trim().toLowerCase().min(1).max(40) }),
      req.params,
    );
    const user = await db.user.findUnique({
      where: { username },
      select: {
        ...publicUserSelect,
        _count: {
          select: {
            posts: true,
            sentFriendRequests: { where: { status: 'ACCEPTED' } },
            receivedFriendRequests: { where: { status: 'ACCEPTED' } },
            stories: true,
          },
        },
      },
    });
    if (!user || user.id === '__never__') throw notFound('بەکارهێنەر نەدۆزرایەوە.');
    const target = await db.user.findUnique({ where: { username }, select: { disabled: true } });
    if (target?.disabled) throw notFound('بەکارهێنەر نەدۆزرایەوە.');

    let relationship = {
      isMe: false,
      isFriend: false,
      incomingRequest: false,
      outgoingRequest: false,
      blocked: false,
      friendshipId: null as string | null,
    };
    if (req.auth?.userId) {
      const me = req.auth.userId;
      if (me === user.id) relationship.isMe = true;
      const [friendship, reverse, block] = await Promise.all([
        db.friendship.findFirst({ where: { requesterId: me, addresseeId: user.id } }),
        db.friendship.findFirst({ where: { requesterId: user.id, addresseeId: me } }),
        db.block.findFirst({
          where: {
            OR: [
              { blockerId: me, blockedId: user.id },
              { blockerId: user.id, blockedId: me },
            ],
          },
        }),
      ]);
      if (friendship?.status === 'ACCEPTED' || reverse?.status === 'ACCEPTED') {
        relationship.isFriend = true;
        relationship.friendshipId = friendship?.id || reverse?.id || null;
      } else if (reverse?.status === 'PENDING' && !reverse.requesterId.includes('none')) {
        relationship.incomingRequest = true;
        relationship.friendshipId = reverse.id;
      } else if (friendship?.status === 'PENDING') {
        relationship.outgoingRequest = true;
        relationship.friendshipId = friendship.id;
      }
      relationship.blocked = Boolean(block);
    }

    const effectivePro = Boolean(user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date()));
    return {
      user: {
        ...user,
        isPro: effectivePro,
        friendCount:
          user._count.sentFriendRequests + user._count.receivedFriendRequests,
        online: Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000,
      },
      relationship,
    };
  });

  app.get('/me/export-key-context', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, username: true, publicKey: true },
    });
    if (!user) throw notFound();
    return { user };
  });

  app.post('/me/deactivate', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    await db.user.update({ where: { id: req.auth.userId }, data: { disabled: true } });
    await db.session.updateMany({
      where: { userId: req.auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  });

  app.post('/:id/block', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    if (id === req.auth.userId) throw badRequest('ناتوانیت خۆت بلۆک بکەیت.');
    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw notFound('بەکارهێنەر نەدۆزرایەوە.');
    await db.$transaction([
      db.block.upsert({
        where: { blockerId_blockedId: { blockerId: req.auth.userId, blockedId: id } },
        create: { blockerId: req.auth.userId, blockedId: id },
        update: {},
      }),
      db.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: req.auth.userId, addresseeId: id },
            { requesterId: id, addresseeId: req.auth.userId },
          ],
        },
      }),
    ]);
    return { ok: true };
  });

  app.delete('/:id/block', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    await db.block.deleteMany({
      where: { blockerId: req.auth.userId, blockedId: id },
    });
    return { ok: true };
  });

  app.get('/me/blocks', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const blocks = await db.block.findMany({
      where: { blockerId: req.auth.userId },
      include: { blocked: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return { users: blocks.map((b) => b.blocked) };
  });

  app.post('/me/identity-key', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({ publicKey: z.string().regex(/^[A-Za-z0-9+/=]{40,60}$/) }),
      req.body,
    );
    await db.user.update({
      where: { id: req.auth.userId },
      data: { publicKey: body.publicKey },
    });
    return { ok: true, publicKey: body.publicKey };
  });

  app.post('/me/verification-note', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    throw forbidden('ئەم ڕێگەیە بەکار نەهێنراوە.');
  });
};

export default usersRoutes;
