import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { optionalAuth, requireAuth } from '../utils/auth';
import { badRequest, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { publicUserSelect } from '../utils/serializers';
import { notify } from '../services/notifications';

const mediaItemSchema = z.object({
  url: z.string().min(3).max(800),
  type: z.enum(['image', 'video']),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  name: z.string().max(200).optional(),
  duration: z.number().nonnegative().optional(),
});

const mediaSchema = z.array(mediaItemSchema).max(6, 'زۆرترین ٦ میدیا').default([]);

async function friendIdsFor(userId: string): Promise<string[]> {
  const friendships = await db.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}

function parseCursor(cursor?: string): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const [iso, id] = cursor.split('|');
  if (!iso || !id) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { createdAt: date, id };
}

const postInclude = (viewerId?: string) => ({
  author: { select: publicUserSelect },
  likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
});

function mapPost<T extends { media: string; likes?: unknown[] }>(post: T, viewerId?: string) {
  let media: unknown[] = [];
  try {
    media = JSON.parse(post.media);
  } catch {
    media = [];
  }
  const { likes, ...rest } = post as T & { likes?: Array<{ id: string }> };
  return {
    ...rest,
    media,
    likedByMe: Boolean(viewerId && likes && likes.length > 0),
  };
}

const postsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/feed', { preHandler: optionalAuth }, async (req) => {
    const query = parseWith(
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(30).default(12),
      }),
      req.query,
    );
    const viewerId = req.auth?.userId;
    const friends = viewerId ? await friendIdsFor(viewerId) : [];
    const cursor = parseCursor(query.cursor);

    const posts = await db.post.findMany({
      where: {
        OR: viewerId
          ? [
              { visibility: 'PUBLIC' },
              { authorId: { in: [viewerId, ...friends] } },
            ]
          : [{ visibility: 'PUBLIC' }],
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: postInclude(viewerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = posts.length > query.limit;
    const page = hasMore ? posts.slice(0, query.limit) : posts;
    const last = page[page.length - 1];
    return {
      posts: page.map((post) => mapPost(post, viewerId)),
      nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
    };
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({
        content: z.string().trim().max(5000, 'نووسینەکە زۆر درێژە').default(''),
        media: mediaSchema,
        visibility: z.enum(['PUBLIC', 'FRIENDS']).default('PUBLIC'),
      }),
      req.body,
    );
    if (!body.content && body.media.length === 0) {
      throw badRequest('تێکست یان میدیایەک زیاد بکە.');
    }
    const post = await db.post.create({
      data: {
        authorId: req.auth.userId,
        content: body.content,
        media: JSON.stringify(body.media),
        visibility: body.visibility,
      },
      include: { author: { select: publicUserSelect } },
    });
    return reply.status(201).send({ post: mapPost(post, req.auth.userId) });
  });

  app.get('/user/:username', { preHandler: optionalAuth }, async (req) => {
    const { username } = parseWith(
      z.object({ username: z.string().min(1).max(40) }),
      req.params,
    );
    const query = parseWith(
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(30).default(12),
      }),
      req.query,
    );
    const author = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, disabled: true, username: true },
    });
    if (!author || author.disabled) throw notFound('بەکارهێنەر نەدۆزرایەوە.');

    const viewerId = req.auth?.userId;
    let canSeeFriendsOnly = author.id === viewerId;
    if (!canSeeFriendsOnly && viewerId) {
      const friendship = await db.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: viewerId, addresseeId: author.id },
            { requesterId: author.id, addresseeId: viewerId },
          ],
        },
      });
      canSeeFriendsOnly = Boolean(friendship);
    }

    const cursor = parseCursor(query.cursor);
    const posts = await db.post.findMany({
      where: {
        authorId: author.id,
        ...(canSeeFriendsOnly ? {} : { visibility: 'PUBLIC' }),
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: postInclude(viewerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = posts.length > query.limit;
    const page = hasMore ? posts.slice(0, query.limit) : posts;
    const last = page[page.length - 1];
    return {
      posts: page.map((post) => mapPost(post, viewerId)),
      nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
      canSeeFriendsOnly,
    };
  });

  app.get('/:id', { preHandler: optionalAuth }, async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const viewerId = req.auth?.userId;
    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: { select: publicUserSelect },
        likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
        comments: {
          take: 30,
          orderBy: { createdAt: 'asc' },
          include: { user: { select: publicUserSelect } },
        },
      },
    });
    if (!post) throw notFound('پۆستەکە نەدۆزرایەوە.');
    if (post.visibility === 'FRIENDS' && post.authorId !== viewerId) {
      if (!viewerId) throw forbidden('تەنها هاوڕێیان دەتوانن ئەم پۆستە ببینن.');
      const friendship = await db.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: viewerId, addresseeId: post.authorId },
            { requesterId: post.authorId, addresseeId: viewerId },
          ],
        },
      });
      if (!friendship) throw forbidden('تەنها هاوڕێیان دەتوانن ئەم پۆستە ببینن.');
    }
    return { post: mapPost(post, viewerId) };
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw notFound('پۆستەکە نەدۆزرایەوە.');
    if (post.authorId !== req.auth.userId && req.auth.role !== 'ADMIN') {
      throw forbidden('تەنها خاوەنی پۆست دەتوانێت بیسڕێتەوە.');
    }
    await db.post.delete({ where: { id } });
    return { ok: true };
  });

  app.post('/:id/like', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!post) throw notFound('پۆستەکە نەدۆزرایەوە.');

    const existing = await db.postLike.findUnique({
      where: { postId_userId: { postId: id, userId: req.auth.userId } },
    });

    if (existing) {
      await db.$transaction([
        db.postLike.delete({ where: { id: existing.id } }),
        db.post.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }

    const [, updated] = await db.$transaction([
      db.postLike.create({ data: { postId: id, userId: req.auth.userId } }),
      db.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);

    if (post.authorId !== req.auth.userId) {
      const actor = await db.user.findUnique({
        where: { id: req.auth.userId },
        select: { name: true, username: true },
      });
      await notify({
        userId: post.authorId,
        type: 'LIKE',
        title: 'دڵی نوێ ❤️',
        body: `${actor?.name || 'بەکارهێنەرێک'} دڵی پۆستەکەی دا.`,
        data: { postId: id, username: actor?.username },
      });
    }
    return { liked: true, likeCount: updated.likeCount };
  });

  app.get('/:id/comments', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const query = parseWith(
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(30),
      }),
      req.query,
    );
    const cursor = parseCursor(query.cursor);
    const comments = await db.comment.findMany({
      where: {
        postId: id,
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { createdAt: { gt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { gt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });
    const hasMore = comments.length > query.limit;
    const page = hasMore ? comments.slice(0, query.limit) : comments;
    const last = page[page.length - 1];
    return {
      comments: page,
      nextCursor: hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
    };
  });

  app.post('/:id/comments', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({ content: z.string().trim().min(1, 'کۆمێنت بنووسە').max(1000) }),
      req.body,
    );
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!post) throw notFound('پۆستەکە نەدۆزرایەوە.');
    const comment = await db.comment.create({
      data: { postId: id, userId: req.auth.userId, content: body.content },
      include: { user: { select: publicUserSelect } },
    });
    await db.post.update({ where: { id }, data: { commentCount: { increment: 1 } } });

    if (post.authorId !== req.auth.userId) {
      await notify({
        userId: post.authorId,
        type: 'COMMENT',
        title: 'کۆمێنتی نوێ',
        body: `${comment.user.name}: ${body.content.slice(0, 90)}`,
        data: { postId: id, commentId: comment.id, username: comment.user.username },
      });
    }
    return reply.status(201).send({ comment });
  });

  app.delete('/:postId/comments/:commentId', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { postId, commentId } = parseWith(
      z.object({ postId: z.string().min(1), commentId: z.string().min(1) }),
      req.params,
    );
    const [comment, post] = await Promise.all([
      db.comment.findUnique({ where: { id: commentId }, select: { userId: true, postId: true } }),
      db.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
    ]);
    if (!comment || comment.postId !== postId) throw notFound('کۆمێنتەکە نەدۆزرایەوە.');
    if (comment.userId !== req.auth.userId && post?.authorId !== req.auth.userId) {
      throw forbidden();
    }
    await db.$transaction([
      db.comment.delete({ where: { id: commentId } }),
      db.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } }),
    ]);
    return { ok: true };
  });
};

export default postsRoutes;
