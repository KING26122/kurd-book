import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { publicUserSelect } from '../utils/serializers';

const storiesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const friendships = await db.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: req.auth.userId }, { addresseeId: req.auth.userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) =>
      f.requesterId === req.auth!.userId ? f.addresseeId : f.requesterId,
    );

    const stories = await db.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        authorId: { in: [req.auth.userId, ...friendIds] },
      },
      include: {
        author: { select: publicUserSelect },
        views: { where: { viewerId: req.auth.userId }, select: { id: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const groupsMap = new Map<
      string,
      {
        user: (typeof stories)[number]['author'];
        stories: Array<{
          id: string;
          mediaUrl: string;
          mediaType: string;
          caption: string | null;
          createdAt: Date;
          expiresAt: Date;
          viewed: boolean;
          viewCount: number;
          isMine: boolean;
        }>;
        allViewed: boolean;
      }
    >();

    for (const story of stories) {
      if (!groupsMap.has(story.authorId)) {
        groupsMap.set(story.authorId, {
          user: story.author,
          stories: [],
          allViewed: true,
        });
      }
      const group = groupsMap.get(story.authorId)!;
      const viewed = story.views.length > 0;
      group.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewed: story.authorId === req.auth!.userId ? true : viewed,
        viewCount: story._count.views,
        isMine: story.authorId === req.auth!.userId,
      });
      if (story.authorId !== req.auth!.userId && !viewed) group.allViewed = false;
    }

    const groups = [...groupsMap.values()].sort((a, b) => {
      if (a.user.id === req.auth!.userId) return -1;
      if (b.user.id === req.auth!.userId) return 1;
      return (
        new Date(b.stories[b.stories.length - 1]!.createdAt).getTime() -
        new Date(a.stories[a.stories.length - 1]!.createdAt).getTime()
      );
    });
    return { groups };
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({
        mediaUrl: z.string().min(3).max(800),
        mediaType: z.enum(['image', 'video']),
        caption: z.string().trim().max(300).optional().nullable(),
      }),
      req.body,
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await db.story.count({
      where: { authorId: req.auth.userId, createdAt: { gt: since } },
    });
    if (count >= 20) {
      throw forbidden('لانیکەم ٢٠ ستۆری لە ٢٤ کاتژمێردا بەسە. هی کۆن بسڕەوە.');
    }

    const story = await db.story.create({
      data: {
        authorId: req.auth.userId,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        caption: body.caption || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      include: { author: { select: publicUserSelect } },
    });
    return reply.status(201).send({ story });
  });

  app.post('/:id/view', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const story = await db.story.findUnique({ where: { id }, select: { authorId: true } });
    if (!story) throw notFound('ستۆریەکە نەدۆزرایەوە.');
    if (story.authorId === req.auth.userId) return { ok: true };
    await db.storyView.upsert({
      where: { storyId_viewerId: { storyId: id, viewerId: req.auth.userId } },
      create: { storyId: id, viewerId: req.auth.userId },
      update: {},
    });
    return { ok: true };
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const story = await db.story.findUnique({ where: { id }, select: { authorId: true } });
    if (!story) throw notFound('ستۆریەکە نەدۆزرایەوە.');
    if (story.authorId !== req.auth.userId && req.auth.role !== 'ADMIN') throw forbidden();
    await db.story.delete({ where: { id } });
    return { ok: true };
  });

  app.get('/:id/viewers', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const story = await db.story.findUnique({ where: { id }, select: { authorId: true } });
    if (!story) throw notFound('ستۆریەکە نەدۆزرایەوە.');
    if (story.authorId !== req.auth.userId) throw forbidden();
    const views = await db.storyView.findMany({
      where: { storyId: id },
      include: { viewer: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { viewers: views.map((v) => ({ ...v.viewer, viewedAt: v.createdAt })) };
  });
};

export default storiesRoutes;
