import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { badRequest, conflict, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { publicUserSelect } from '../utils/serializers';
import { notify } from '../services/notifications';

const friendsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const friendships = await db.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: req.auth.userId }, { addresseeId: req.auth.userId }],
      },
      include: {
        requester: { select: publicUserSelect },
        addressee: { select: publicUserSelect },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      friends: friendships.map((f) => {
        const friend = f.requesterId === req.auth!.userId ? f.addressee : f.requester;
        return {
          ...friend,
          friendshipId: f.id,
          friendsSince: f.updatedAt,
          online: Date.now() - new Date(friend.lastActiveAt).getTime() < 5 * 60 * 1000,
        };
      }),
    };
  });

  app.get('/requests', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const [incoming, outgoing] = await Promise.all([
      db.friendship.findMany({
        where: { addresseeId: req.auth.userId, status: 'PENDING' },
        include: { requester: { select: publicUserSelect } },
        orderBy: { createdAt: 'desc' },
      }),
      db.friendship.findMany({
        where: { requesterId: req.auth.userId, status: 'PENDING' },
        include: { addressee: { select: publicUserSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      incoming: incoming.map((r) => ({
        id: r.id,
        user: r.requester,
        createdAt: r.createdAt,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        user: r.addressee,
        createdAt: r.createdAt,
      })),
    };
  });

  app.get('/suggestions', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const userId = req.auth.userId;
    const [friendships, blocksMade, blocksReceived] = await Promise.all([
      db.friendship.findMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      }),
      db.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      db.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);
    const excluded = new Set<string>([userId]);
    for (const f of friendships) {
      excluded.add(f.requesterId === userId ? f.addresseeId : f.requesterId);
    }
    for (const b of blocksMade) excluded.add(b.blockedId);
    for (const b of blocksReceived) excluded.add(b.blockerId);

    const users = await db.user.findMany({
      where: {
        id: { notIn: [...excluded] },
        disabled: false,
      },
      select: {
        ...publicUserSelect,
        _count: {
          select: { sentFriendRequests: { where: { status: 'ACCEPTED' } } },
        },
      },
      orderBy: [{ verificationStatus: 'desc' }, { isPro: 'desc' }, { lastActiveAt: 'desc' }],
      take: 12,
    });
    return {
      suggestions: users.map((u) => ({
        ...u,
        mutualFriends: u._count.sentFriendRequests,
        online: Date.now() - new Date(u.lastActiveAt).getTime() < 5 * 60 * 1000,
      })),
    };
  });

  app.post('/request', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({ userId: z.string().min(1).optional(), username: z.string().min(1).max(40).optional() }),
      req.body,
    );
    if (!body.userId && !body.username) throw badRequest('بەکارهێنەر دیاری بکە.');
    if ((body.userId || '').toLowerCase() === req.auth.userId) throw badRequest('ناتوانیت داواکاری بۆ خۆت بنێریت.');

    const target = await db.user.findFirst({
      where: body.userId
        ? { id: body.userId }
        : { username: body.username!.toLowerCase() },
      select: { id: true, name: true, username: true, avatarUrl: true, disabled: true },
    });
    if (!target || target.disabled) throw notFound('بەکارهێنەر نەدۆزرایەوە.');
    if (target.id === req.auth.userId) throw badRequest('ناتوانیت داواکاری بۆ خۆت بنێریت.');

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: req.auth.userId, blockedId: target.id },
          { blockerId: target.id, blockedId: req.auth.userId },
        ],
      },
    });
    if (blocked) throw forbidden('ناتوانرێت داواکاری بنێردرێت.');

    const mine = await db.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: req.auth.userId, addresseeId: target.id },
      },
    });
    const theirs = await db.friendship.findUnique({
      where: {
        requesterId_addresseeId: { requesterId: target.id, addresseeId: req.auth.userId },
      },
    });

    if (mine?.status === 'ACCEPTED' || theirs?.status === 'ACCEPTED') {
      throw conflict('پێشتر هاوڕێن.');
    }
    if (mine?.status === 'PENDING') throw conflict('داواکارییەکە پێشتر نێردراوە.');
    if (theirs?.status === 'PENDING') {
      const updated = await db.friendship.update({
        where: { id: theirs.id },
        data: { status: 'ACCEPTED' },
      });
      await notify({
        userId: target.id,
        type: 'FRIEND_ACCEPTED',
        title: 'هاوڕێی نوێ 🤝',
        body: 'داواکاری هاوڕێیەتیت پەسەند کرد.',
        data: { friendshipId: updated.id, username: (await db.user.findUnique({ where: { id: req.auth.userId }, select: { username: true } }))?.username },
      });
      return { ok: true, accepted: true, friendshipId: updated.id };
    }

    let friendshipId: string;
    if (mine) {
      const updated = await db.friendship.update({
        where: { id: mine.id },
        data: { status: 'PENDING' },
      });
      friendshipId = updated.id;
    } else {
      const created = await db.friendship.create({
        data: { requesterId: req.auth.userId, addresseeId: target.id },
      });
      friendshipId = created.id;
    }

    const me = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { name: true, username: true, avatarUrl: true },
    });
    await notify({
      userId: target.id,
      type: 'FRIEND_REQUEST',
      title: 'داواکاری هاوڕێیەتی',
      body: `${me?.name || 'بەکارهێنەرێک'} داوای هاوڕێیەتی کرد.`,
      data: { friendshipId, username: me?.username },
    });
    return { ok: true, accepted: false, friendshipId, requester: me };
  });

  app.post('/:id/accept', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const friendship = await db.friendship.findUnique({ where: { id } });
    if (!friendship) throw notFound('داواکارییەکە نەدۆزرایەوە.');
    if (friendship.addresseeId !== req.auth.userId) throw forbidden();
    if (friendship.status !== 'PENDING') throw conflict('ئەم داواکارییە چارەسەر کراوە.');
    const updated = await db.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
    const me = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { username: true, name: true },
    });
    await notify({
      userId: friendship.requesterId,
      type: 'FRIEND_ACCEPTED',
      title: 'هاوڕێی نوێ 🤝',
      body: `${me?.name || 'بەکارهێنەرێک'} داواکارییەکەت پەسەند کرد.`,
      data: { friendshipId: updated.id, username: me?.username },
    });
    return { ok: true, friendshipId: updated.id };
  });

  app.post('/:id/reject', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const friendship = await db.friendship.findUnique({ where: { id } });
    if (!friendship) throw notFound('داواکارییەکە نەدۆزرایەوە.');
    if (friendship.addresseeId !== req.auth.userId) throw forbidden();
    if (friendship.status !== 'PENDING') throw conflict('ئەم داواکارییە چارەسەر کراوە.');
    await db.friendship.update({ where: { id }, data: { status: 'REJECTED' } });
    return { ok: true };
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const friendship = await db.friendship.findUnique({ where: { id } });
    if (!friendship) throw notFound('هاوڕێیەتی نەدۆزرایەوە.');
    if (friendship.requesterId !== req.auth.userId && friendship.addresseeId !== req.auth.userId) {
      throw forbidden();
    }
    await db.friendship.delete({ where: { id } });
    return { ok: true };
  });
};

export default friendsRoutes;
