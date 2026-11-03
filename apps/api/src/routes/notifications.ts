import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { parseWith, unauthorized } from '../utils/errors';
import { parseJsonObject } from '../utils/serializers';

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const query = parseWith(
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(30),
      }),
      req.query,
    );
    const notifications = await db.notification.findMany({
      where: { userId: req.auth.userId },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = notifications.length > query.limit;
    const page = hasMore ? notifications.slice(0, query.limit) : notifications;
    const unreadCount = await db.notification.count({
      where: { userId: req.auth.userId, readAt: null },
    });
    return {
      notifications: page.map((n) => ({ ...n, data: parseJsonObject(n.data) })),
      unreadCount,
      nextCursor: hasMore && page.length ? page[page.length - 1]!.id : null,
    };
  });

  app.post('/read-all', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    await db.notification.updateMany({
      where: { userId: req.auth.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });

  app.post('/:id/read', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    await db.notification.updateMany({
      where: { id, userId: req.auth.userId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });
};

export default notificationsRoutes;
