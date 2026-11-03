import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db } from '../db';
import { requireAdmin } from '../utils/auth';
import { badRequest, conflict, notFound, parseWith } from '../utils/errors';
import { privateFilePath, privateUploadDir, mimeForPrivateFile } from '../services/storage';
import { publicUserSelect, parseJsonArray, parseJsonObject } from '../utils/serializers';
import { activateProForRequest } from '../services/payments';
import { notify } from '../services/notifications';
import { utcDay } from '../utils/activity';

async function sendPrivate(reply: import('fastify').FastifyReply, url: string | null) {
  if (!url) throw notFound('فایلەکە نییە.');
  const filename = path.basename(url);
  const filePath = privateFilePath(filename);
  if (!filePath || !fs.existsSync(filePath)) throw notFound('فایلەکە نەدۆزرایەوە.');
  reply.header('Cache-Control', 'private, no-store');
  reply.type(mimeForPrivateFile(filename));
  return reply.send(fs.createReadStream(filePath));
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAdmin);

  app.get('/stats', async () => {
    const now = new Date();
    const today = utcDay(now);
    const startOfToday = new Date(`${today}T00:00:00.000Z`);
    const since = new Date(startOfToday);
    since.setUTCDate(since.getUTCDate() - 13);

    const [
      totalUsers,
      activeToday,
      newToday,
      verifiedUsers,
      proUsers,
      disabledUsers,
      totalPosts,
      totalMessages,
      activeStories,
      pendingVerifications,
      pendingPro,
      openReports,
      recentUsers,
    ] = await Promise.all([
      db.user.count(),
      db.activityDay.count({ where: { day: today } }),
      db.user.count({ where: { createdAt: { gte: startOfToday } } }),
      db.user.count({ where: { verificationStatus: 'VERIFIED' } }),
      db.user.count({
        where: { isPro: true, OR: [{ proExpiresAt: null }, { proExpiresAt: { gt: now } }] },
      }),
      db.user.count({ where: { disabled: true } }),
      db.post.count(),
      db.message.count(),
      db.story.count({ where: { expiresAt: { gt: now } } }),
      db.verificationRequest.count({ where: { status: 'PENDING' } }),
      db.proRequest.count({ where: { status: 'PENDING' } }),
      db.report.count({ where: { status: 'OPEN' } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { ...publicUserSelect, email: true, phone: true, role: true, disabled: true },
      }),
    ]);

    const [activeRows, newUserRows, messageRows, pendingVerificationRows, pendingProRows, reportRows] =
      await Promise.all([
        db.activityDay.groupBy({
          by: ['day'],
          where: { day: { gte: utcDay(since) } },
          _count: { _all: true },
        }),
        db.user.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        }),
        db.message.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        }),
        db.verificationRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          take: 5,
          include: { user: { select: publicUserSelect } },
        }),
        db.proRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          take: 5,
          include: { user: { select: publicUserSelect } },
        }),
        db.report.findMany({
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { reporter: { select: publicUserSelect } },
        }),
      ]);

    const activeMap = new Map(activeRows.map((r) => [r.day, r._count._all]));
    const daily = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(since);
      day.setUTCDate(since.getUTCDate() + index);
      const key = utcDay(day);
      return {
        day: key,
        active: activeMap.get(key) || 0,
        newUsers: newUserRows.filter((u) => utcDay(u.createdAt) === key).length,
        messages: messageRows.filter((m) => utcDay(m.createdAt) === key).length,
      };
    });

    return {
      totals: {
        totalUsers,
        activeToday,
        newToday,
        verifiedUsers,
        proUsers,
        disabledUsers,
        totalPosts,
        totalMessages,
        activeStories,
        pendingVerifications,
        pendingPro,
        openReports,
      },
      daily,
      recentUsers,
      queues: {
        verifications: pendingVerificationRows,
        proRequests: pendingProRows,
        reports: reportRows.map((r) => ({ ...r, evidence: parseJsonArray(r.evidence) })),
      },
    };
  });

  app.get('/users', async (req) => {
    const query = parseWith(
      z.object({
        q: z.string().trim().max(120).optional(),
        filter: z.enum(['all', 'verified', 'pro', 'pending', 'disabled']).default('all'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(5).max(100).default(20),
      }),
      req.query,
    );
    const where: Record<string, unknown> = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q } },
        { username: { contains: query.q.toLowerCase() } },
        { email: { contains: query.q.toLowerCase() } },
        { phone: { contains: query.q } },
      ];
    }
    if (query.filter === 'verified') where.verificationStatus = 'VERIFIED';
    if (query.filter === 'pending') where.verificationStatus = 'PENDING';
    if (query.filter === 'pro') where.isPro = true;
    if (query.filter === 'disabled') where.disabled = true;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          ...publicUserSelect,
          email: true,
          phone: true,
          role: true,
          disabled: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          _count: {
            select: {
              posts: true,
              sentFriendRequests: { where: { status: 'ACCEPTED' } },
              receivedFriendRequests: { where: { status: 'ACCEPTED' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      db.user.count({ where }),
    ]);
    return {
      users: users.map((u) => ({
        ...u,
        friendCount: u._count.sentFriendRequests + u._count.receivedFriendRequests,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pages: Math.ceil(total / query.pageSize),
    };
  });

  app.get('/users/:id', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const user = await db.user.findUnique({
      where: { id },
      select: {
        ...publicUserSelect,
        email: true,
        phone: true,
        role: true,
        disabled: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
    if (!user) throw notFound('بەکارهێنەر نەدۆزرایەوە.');

    const today = utcDay(new Date());
    const start = new Date(`${today}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 13);
    const [postCount, commentCount, likesReceived, storyCount, messageCount, sentFriends, receivedFriends, reportsMade, memberships] =
      await Promise.all([
        db.post.count({ where: { authorId: id } }),
        db.comment.count({ where: { userId: id } }),
        db.postLike.count({ where: { post: { authorId: id } } }),
        db.story.count({ where: { authorId: id } }),
        db.message.count({ where: { senderId: id } }),
        db.friendship.count({ where: { requesterId: id, status: 'ACCEPTED' } }),
        db.friendship.count({ where: { addresseeId: id, status: 'ACCEPTED' } }),
        db.report.count({ where: { reporterId: id } }),
        db.conversationMember.findMany({ where: { userId: id }, select: { conversationId: true } }),
      ]);

    const conversationIds = memberships.map((member) => member.conversationId);
    const [activityRows, reportsReceived] = await Promise.all([
      db.activityDay.findMany({
        where: { userId: id, day: { gte: utcDay(start) } },
        select: { day: true },
      }),
      db.report.count({
        where: {
          OR: [
            { targetType: 'USER', targetId: id },
            ...(conversationIds.length
              ? [{ targetType: 'CONVERSATION', targetId: { in: conversationIds } }]
              : []),
          ],
        },
      }),
    ]);

    const activityMap = new Map<string, number>();
    for (const row of activityRows) {
      activityMap.set(row.day, (activityMap.get(row.day) || 0) + 1);
    }
    const activity = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const day = utcDay(date);
      return { day, count: activityMap.get(day) || 0 };
    });

    return {
      user: {
        ...user,
        friendCount: sentFriends + receivedFriends,
        activity,
        stats: {
          posts: postCount,
          comments: commentCount,
          likesReceived,
          stories: storyCount,
          messages: messageCount,
          friends: sentFriends + receivedFriends,
          reportsMade,
          reportsReceived,
        },
      },
    };
  });

  app.patch('/users/:id', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        disabled: z.boolean().optional(),
        role: z.enum(['USER', 'ADMIN']).optional(),
      }),
      req.body,
    );
    if (req.auth?.userId === id && (body.disabled === true || body.role === 'USER')) {
      throw badRequest('ناتوانیت هەژماری خۆت ناچالاک یان لە ئەدمین دەرکەیت.');
    }
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw notFound('بەکارهێنەر نەدۆزرایەوە.');
    const updated = await db.user.update({
      where: { id },
      data: body,
      select: { ...publicUserSelect, email: true, phone: true, role: true, disabled: true },
    });
    if (body.disabled) {
      await db.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { user: updated };
  });

  app.get('/verifications', async (req) => {
    const query = parseWith(
      z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(5).max(50).default(20),
      }),
      req.query,
    );
    const where = query.status === 'ALL' ? {} : { status: query.status };
    const [requests, total] = await Promise.all([
      db.verificationRequest.findMany({
        where,
        include: {
          user: {
            select: {
              ...publicUserSelect,
              email: true,
              phone: true,
              emailVerifiedAt: true,
              phoneVerifiedAt: true,
            },
          },
          reviewedBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      db.verificationRequest.count({ where }),
    ]);
    return { requests, total, page: query.page, pages: Math.ceil(total / query.pageSize) };
  });

  app.post('/verifications/:id/review', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        action: z.enum(['approve', 'reject']),
        note: z.string().trim().max(500).optional(),
      }),
      req.body,
    );
    const request = await db.verificationRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!request) throw notFound('داواکاری نەدۆزرایەوە.');
    if (request.status !== 'PENDING') throw conflict('ئەم داواکارییە پێشتر چارەسەر کراوە.');

    const approved = body.action === 'approve';
    await db.$transaction([
      db.verificationRequest.update({
        where: { id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          note: body.note || null,
          reviewedById: req.auth!.userId,
          reviewedAt: new Date(),
        },
      }),
      db.user.update({
        where: { id: request.userId },
        data: {
          verificationStatus: approved ? 'VERIFIED' : 'REJECTED',
          verifiedAt: approved ? new Date() : null,
        },
      }),
    ]);

    await notify({
      userId: request.userId,
      type: 'VERIFICATION',
      title: approved ? 'تاجی ئاڵتوونی چالاک بوو 👑' : 'داواکاری پشتڕاستکردنەوە ڕەتکرایەوە',
      body: approved
        ? 'هەژمارەکەت پشتڕاستکرایەوە. تاجی ئاڵتوونی لە تەنیشت ناوەکەت دەردەکەوێت.'
        : `داواکارییەکەت ڕەتکرایەوە.${body.note ? ` هۆکار: ${body.note}` : ''}`,
      data: { verificationRequestId: id },
    });
    return { ok: true };
  });

  app.get('/verifications/:id/files/:kind', async (req, reply) => {
    const { id, kind } = parseWith(
      z.object({ id: z.string().min(1), kind: z.enum(['front', 'back', 'selfie']) }),
      req.params,
    );
    const request = await db.verificationRequest.findUnique({ where: { id } });
    if (!request) throw notFound('داواکاری نەدۆزرایەوە.');
    const url =
      kind === 'front' ? request.frontUrl : kind === 'back' ? request.backUrl : request.selfieUrl;
    return sendPrivate(reply, url);
  });

  app.get('/pro-requests', async (req) => {
    const query = parseWith(
      z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(5).max(50).default(20),
      }),
      req.query,
    );
    const where = query.status === 'ALL' ? {} : { status: query.status };
    const [requests, total] = await Promise.all([
      db.proRequest.findMany({
        where,
        include: {
          user: { select: { ...publicUserSelect, email: true, phone: true } },
          payment: true,
          reviewedBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      db.proRequest.count({ where }),
    ]);
    return { requests, total, page: query.page, pages: Math.ceil(total / query.pageSize) };
  });

  app.post('/pro-requests/:id/review', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        action: z.enum(['approve', 'reject']),
        note: z.string().trim().max(500).optional(),
      }),
      req.body,
    );
    const request = await db.proRequest.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!request) throw notFound('داواکاری نەدۆزرایەوە.');
    if (request.status !== 'PENDING') throw conflict('ئەم داواکارییە پێشتر چارەسەر کراوە.');

    if (body.action === 'approve') {
      await activateProForRequest(id, request.payment?.id);
      if (request.payment?.status !== 'PAID') {
        await db.payment.updateMany({
          where: { proRequestId: id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
      await db.proRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: req.auth!.userId,
          reviewedAt: new Date(),
          note: body.note || request.note,
        },
      });
    } else {
      await db.$transaction([
        db.proRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            note: body.note || 'لەلایەن بەڕێوەبەر ڕەتکرایەوە.',
            reviewedById: req.auth!.userId,
            reviewedAt: new Date(),
          },
        }),
        db.payment.updateMany({
          where: { proRequestId: id, status: 'PENDING' },
          data: { status: 'FAILED' },
        }),
      ]);
      await notify({
        userId: request.userId,
        type: 'PRO',
        title: 'داواکاری Pro ڕەتکرایەوە',
        body: body.note ? `هۆکار: ${body.note}` : 'داواکارییەکەت ڕەتکرایەوە. تکایە پەیوەندی بکە.',
        data: { proRequestId: id },
      });
    }
    return { ok: true };
  });

  app.get('/pro-requests/:id/receipt', async (req, reply) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const request = await db.proRequest.findUnique({ where: { id } });
    if (!request) throw notFound('داواکاری نەدۆزرایەوە.');
    return sendPrivate(reply, request.receiptUrl);
  });

  app.get('/reports', async (req) => {
    const query = parseWith(
      z.object({
        status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL']).default('OPEN'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(5).max(50).default(20),
      }),
      req.query,
    );
    const where = query.status === 'ALL' ? {} : { status: query.status };
    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        include: {
          reporter: { select: { ...publicUserSelect, email: true, phone: true } },
          reviewedBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      db.report.count({ where }),
    ]);

    const enriched = await Promise.all(
      reports.map(async (report) => {
        let targetUser: unknown = null;
        if (report.targetType === 'CONVERSATION') {
          const conversation = await db.conversation.findUnique({
            where: { id: report.targetId },
            include: {
              members: {
                where: { userId: { not: report.reporterId } },
                include: { user: { select: publicUserSelect } },
                take: 1,
              },
            },
          });
          targetUser = conversation?.members[0]?.user || null;
        }
        return {
          ...report,
          evidence: parseJsonArray(report.evidence),
          targetUser,
        };
      }),
    );

    return { reports: enriched, total, page: query.page, pages: Math.ceil(total / query.pageSize) };
  });

  app.post('/reports/:id/review', async (req) => {
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        status: z.enum(['RESOLVED', 'DISMISSED']),
        note: z.string().trim().max(1000).optional(),
        disableUserId: z.string().min(1).optional(),
      }),
      req.body,
    );
    const report = await db.report.findUnique({ where: { id } });
    if (!report) throw notFound('ڕاپۆرت نەدۆزرایەوە.');
    if (report.status !== 'OPEN') throw conflict('ئەم ڕاپۆرتە پێشتر چارەسەر کراوە.');

    await db.report.update({
      where: { id },
      data: {
        status: body.status,
        note: body.note || null,
        reviewedById: req.auth!.userId,
        reviewedAt: new Date(),
      },
    });

    if (body.disableUserId) {
      if (body.disableUserId === req.auth?.userId) throw badRequest('ناتوانیت خۆت ناچالاک بکەیت.');
      await db.$transaction([
        db.user.update({ where: { id: body.disableUserId }, data: { disabled: true } }),
        db.session.updateMany({
          where: { userId: body.disableUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
    }

    await notify({
      userId: report.reporterId,
      type: 'REPORT',
      title: 'ڕاپۆرتەکەت پشکنین کرا',
      body:
        body.status === 'RESOLVED'
          ? 'سوپاس. ڕاپۆرتەکەت لەلایەن بەڕێوەبەر چارەسەر کرا.'
          : 'سوپاس. دوای پشکنین، پێویستی بە ئیجراو نەبینرا.',
      data: { reportId: id },
    });
    return { ok: true };
  });

  app.get('/notifications', async (req) => {
    const [notifications, pendingVerifications, pendingPro, openReports] = await Promise.all([
      db.notification.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.verificationRequest.count({ where: { status: 'PENDING' } }),
      db.proRequest.count({ where: { status: 'PENDING' } }),
      db.report.count({ where: { status: 'OPEN' } }),
    ]);
    return {
      notifications: notifications.map((n) => ({
        ...n,
        data: parseJsonObject(n.data),
      })),
      counts: {
        verifications: pendingVerifications,
        pro: pendingPro,
        reports: openReports,
        total: pendingVerifications + pendingPro + openReports,
      },
    };
  });

  app.post('/notifications/read-all', async (req) => {
    await db.notification.updateMany({
      where: { userId: req.auth!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });};

void privateUploadDir;

export default adminRoutes;
