import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth } from '../utils/auth';
import { badRequest, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { chatUserSelect, parseJsonArray } from '../utils/serializers';
import { emitToConversation, emitToUsers } from '../realtime';
import { notifyAdmins } from '../services/notifications';

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  type: true,
  ciphertext: true,
  nonce: true,
  salt: true,
  protocol: true,
  clientId: true,
  createdAt: true,
  deletedAt: true,
} as const;

async function requireMembership(conversationId: string, userId: string) {
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: chatUserSelect } } },
        },
      },
    },
  });
  if (!membership) throw notFound('گفتوگۆ نەدۆزرایەوە.');
  return membership;
}

function summarizeConversation(
  conversation: {
    id: string;
    isGroup: boolean;
    title: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    lastMessageAt: Date;
    members: Array<{
      userId: string;
      lastReadAt: Date;
      muted: boolean;
      user: {
        id: string;
        username: string;
        name: string;
        avatarUrl: string | null;
        verificationStatus: string;
        isPro: boolean;
        publicKey: string | null;
      };
    }>;
  },
  viewerId: string,
  lastMessage: unknown,
  unreadCount: number,
) {
  const me = conversation.members.find((m) => m.userId === viewerId);
  const peers = conversation.members.filter((m) => m.userId !== viewerId);
  const peer = peers[0]?.user || null;
  const title = conversation.isGroup
    ? conversation.title || 'گرووپ'
    : peer?.name || 'گفتوگۆی تایبەت';
  const peerLastReadAt = peers[0]?.lastReadAt || null;

  return {
    id: conversation.id,
    isGroup: conversation.isGroup,
    title,
    avatarUrl: conversation.avatarUrl || peer?.avatarUrl || null,
    peer,
    members: conversation.members.map((m) => ({
      ...m.user,
      lastReadAt: m.lastReadAt,
      muted: m.muted,
    })),
    lastMessage,
    unreadCount,
    lastReadAt: me?.lastReadAt || null,
    peerLastReadAt,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
}

const chatsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/conversations', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const memberships = await db.conversationMember.findMany({
      where: { userId: req.auth.userId },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: chatUserSelect } } },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      take: 100,
    });

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const [lastMessage, unreadCount] = await Promise.all([
          db.message.findFirst({
            where: { conversationId: membership.conversationId },
            select: messageSelect,
            orderBy: { createdAt: 'desc' },
          }),
          db.message.count({
            where: {
              conversationId: membership.conversationId,
              senderId: { not: req.auth!.userId },
              createdAt: { gt: membership.lastReadAt },
            },
          }),
        ]);
        return summarizeConversation(
          membership.conversation,
          req.auth!.userId,
          lastMessage,
          unreadCount,
        );
      }),
    );

    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    return { conversations, totalUnread };
  });

  app.post('/with/:userId', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const { userId } = parseWith(z.object({ userId: z.string().min(1) }), req.params);
    if (userId === req.auth.userId) throw badRequest('ناتوانیت لەگەڵ خۆت گفتوگۆ بکەیت.');
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, disabled: true },
    });
    if (!target || target.disabled) throw notFound('بەکارهێنەر نەدۆزرایەوە.');

    const friendship = await db.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: req.auth.userId, addresseeId: userId },
          { requesterId: userId, addresseeId: req.auth.userId },
        ],
      },
    });
    if (!friendship) throw forbidden('بۆ چاتکردن دەبێت سەرەتا هاوڕێ بن.');

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: req.auth.userId, blockedId: userId },
          { blockerId: userId, blockedId: req.auth.userId },
        ],
      },
    });
    if (blocked) throw forbidden('چاتکردن بەردەست نییە.');

    let conversation = await db.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: req.auth.userId } } },
          { members: { some: { userId } } },
        ],
      },
      include: { members: { include: { user: { select: chatUserSelect } } } },
    });

    let statusCode = 200;
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          isGroup: false,
          lastMessageAt: new Date(),
          members: {
            create: [{ userId: req.auth.userId }, { userId }],
          },
        },
        include: { members: { include: { user: { select: chatUserSelect } } } },
      });
      statusCode = 201;
    }

    const lastMessage = await db.message.findFirst({
      where: { conversationId: conversation.id },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
    });
    const summary = summarizeConversation(conversation, req.auth.userId, lastMessage, 0);
    return reply.status(statusCode).send({ conversation: summary });
  });

  app.get('/conversations/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const membership = await requireMembership(id, req.auth.userId);
    const lastMessage = await db.message.findFirst({
      where: { conversationId: id },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = await db.message.count({
      where: {
        conversationId: id,
        senderId: { not: req.auth.userId },
        createdAt: { gt: membership.lastReadAt },
      },
    });
    return {
      conversation: summarizeConversation(
        membership.conversation,
        req.auth.userId,
        lastMessage,
        unreadCount,
      ),
    };
  });

  app.get('/conversations/:id/messages', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const query = parseWith(
      z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(60).default(40),
      }),
      req.query,
    );
    await requireMembership(id, req.auth.userId);

    const messages = await db.message.findMany({
      where: { conversationId: id },
      select: { ...messageSelect, sender: { select: chatUserSelect } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > query.limit;
    const page = hasMore ? messages.slice(0, query.limit) : messages;
    const ascending = page.reverse();
    return {
      messages: ascending,
      hasMore,
      nextCursor: hasMore && ascending.length > 0 ? ascending[0]!.id : null,
    };
  });

  app.post('/conversations/:id/messages', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        type: z.enum(['TEXT', 'MEDIA', 'VOICE', 'STICKER', 'EMOJI']).default('TEXT'),
        ciphertext: z.string().min(1).max(150_000),
        nonce: z.string().min(1).max(100),
        salt: z.string().min(1).max(100),
        clientId: z.string().min(8).max(80),
      }),
      req.body,
    );
    const membership = await requireMembership(id, req.auth.userId);

    const existing = await db.message.findUnique({
      where: { conversationId_clientId: { conversationId: id, clientId: body.clientId } },
      select: { ...messageSelect, sender: { select: chatUserSelect } },
    });
    if (existing) return reply.send({ message: existing, duplicate: true });

    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: id,
          senderId: req.auth!.userId,
          type: body.type,
          ciphertext: body.ciphertext,
          nonce: body.nonce,
          salt: body.salt,
          clientId: body.clientId,
        },
        select: { ...messageSelect, sender: { select: chatUserSelect } },
      });
      await tx.conversation.update({
        where: { id },
        data: { lastMessageAt: created.createdAt },
      });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: req.auth!.userId } },
        data: { lastReadAt: created.createdAt },
      });
      return created;
    });

    const memberIds = membership.conversation.members.map((m) => m.userId);
    emitToConversation(id, 'message:new', message);
    emitToUsers(memberIds, 'conversation:update', {
      conversationId: id,
      lastMessageAt: message.createdAt,
    });
    return reply.status(201).send({ message });
  });

  app.delete('/messages/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const message = await db.message.findUnique({
      where: { id },
      select: { senderId: true, conversationId: true, deletedAt: true },
    });
    if (!message) throw notFound('نامە نەدۆزرایەوە.');
    if (message.senderId !== req.auth.userId) throw forbidden('تەنها نێرەری نامە دەتوانێت بیسڕێتەوە.');
    if (!message.deletedAt) {
      await db.message.update({
        where: { id },
        data: { deletedAt: new Date(), ciphertext: '', nonce: '', salt: '' },
      });
    }
    emitToConversation(message.conversationId, 'message:deleted', {
      id,
      conversationId: message.conversationId,
    });
    return { ok: true };
  });

  app.post('/conversations/:id/read', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    await requireMembership(id, req.auth.userId);
    const now = new Date();
    await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: req.auth.userId } },
      data: { lastReadAt: now },
    });
    emitToConversation(id, 'chat:read', {
      conversationId: id,
      userId: req.auth.userId,
      at: now.toISOString(),
    });
    return { ok: true };
  });

  app.post('/conversations/:id/typing', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(z.object({ isTyping: z.boolean() }), req.body);
    await requireMembership(id, req.auth.userId);
    emitToConversation(id, 'chat:typing', {
      conversationId: id,
      userId: req.auth.userId,
      isTyping: body.isTyping,
    });
    return { ok: true };
  });

  app.post('/conversations/:id/mute', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(z.object({ muted: z.boolean() }), req.body);
    await requireMembership(id, req.auth.userId);
    await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: req.auth.userId } },
      data: { muted: body.muted },
    });
    return { ok: true };
  });

  app.post('/conversations/:id/report', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const body = parseWith(
      z.object({
        reason: z.string().trim().min(3).max(120),
        details: z.string().trim().max(2000).optional(),
        evidence: z
          .array(
            z.object({
              sender: z.string().max(120),
              sentAt: z.string().max(40),
              text: z.string().max(3000),
            }),
          )
          .max(40, 'زۆرترین ٤٠ نامە')
          .default([]),
        consent: z.literal(true),
      }),
      req.body,
    );
    const membership = await requireMembership(id, req.auth.userId);
    const peer = membership.conversation.members.find((m) => m.userId !== req.auth!.userId);
    if (!peer) throw badRequest('گفتوگۆی تایبەت دیاری بکە.');

    const report = await db.report.create({
      data: {
        reporterId: req.auth.userId,
        targetType: 'CONVERSATION',
        targetId: id,
        reason: body.reason,
        details: body.details || null,
        evidence: JSON.stringify(body.evidence),
      },
      include: {
        reporter: { select: { name: true, username: true } },
      },
    });
    await notifyAdmins(
      'REPORT',
      'ڕاپۆرتی گفتوگۆی نوێ',
      `${report.reporter.name} گفتوگۆیەکی ڕاپۆرت کرد: ${body.reason}`,
      { reportId: report.id, conversationId: id, targetUserId: peer.userId },
    );
    return reply.status(201).send({ ok: true, reportId: report.id });
  });
};

export default chatsRoutes;
