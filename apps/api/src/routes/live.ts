import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { db } from '../db';
import { env, livekitEnabled } from '../env';
import { requireAuth } from '../utils/auth';
import { AppError, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import { publicUserSelect } from '../utils/serializers';

function roomService(): RoomServiceClient {
  if (!livekitEnabled) {
    throw new AppError(
      503,
      'لایڤی ڤیدیۆیی ڕێک نەخراوە. LiveKit URL و API key و secret دابنێ.',
      'LIVEKIT_NOT_CONFIGURED',
    );
  }
  const httpUrl = env.LIVEKIT_URL!.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  return new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!);
}

function requireLivekit() {
  if (!livekitEnabled) {
    throw new AppError(
      503,
      'لایڤی ڤیدیۆیی ڕێک نەخراوە. LiveKit URL و API key و secret دابنێ.',
      'LIVEKIT_NOT_CONFIGURED',
    );
  }
}

const liveRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAuth }, async () => {
    const rooms = await db.liveRoom.findMany({
      where: { isLive: true },
      include: {
        host: { select: publicUserSelect },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return {
      livekitEnabled,
      rooms: rooms.map((room) => ({
        ...room,
        host: {
          ...room.host,
          isPro: Boolean(room.host.isPro && (!room.host.proExpiresAt || room.host.proExpiresAt > new Date())),
          online: true,
        },
      })),
    };
  });

  app.get('/:id', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const room = await db.liveRoom.findUnique({
      where: { id },
      include: { host: { select: publicUserSelect } },
    });
    if (!room) throw notFound('لایڤ نەدۆزرایەوە.');
    let participantCount = 0;
    if (livekitEnabled && room.isLive) {
      try {
        const participants = await roomService().listParticipants(room.roomName);
        participantCount = participants.length;
      } catch {
        participantCount = 0;
      }
    }
    return {
      room: {
        ...room,
        isHost: room.hostId === req.auth.userId,
        participantCount,
      },
      livekitEnabled,
    };
  });

  app.post('/start', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    requireLivekit();
    const body = parseWith(
      z.object({ title: z.string().trim().min(2, 'ناونیشان بنووسە').max(90) }),
      req.body,
    );

    const current = await db.liveRoom.findFirst({
      where: { hostId: req.auth.userId, isLive: true },
      select: { id: true, roomName: true },
    });
    if (current) {
      return reply.send({
        room: { id: current.id, roomName: current.roomName },
        resumed: true,
      });
    }

    const roomName = `kurdbook-${crypto.randomUUID()}`;
    const room = await db.liveRoom.create({
      data: { hostId: req.auth.userId, roomName, title: body.title },
    });

    try {
      await roomService().createRoom({
        name: roomName,
        emptyTimeout: 60 * 10,
        maxParticipants: 100,
        metadata: JSON.stringify({ title: body.title, hostId: req.auth.userId }),
      });
    } catch (error) {
      req.log.warn({ err: error }, 'LiveKit createRoom failed; token join will auto-create');
    }

    return reply.status(201).send({ room, resumed: false });
  });

  app.post('/:id/end', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const room = await db.liveRoom.findUnique({ where: { id } });
    if (!room) throw notFound('لایڤ نەدۆزرایەوە.');
    if (room.hostId !== req.auth.userId && req.auth.role !== 'ADMIN') throw forbidden();
    await db.liveRoom.update({
      where: { id },
      data: { isLive: false, endedAt: new Date() },
    });
    if (livekitEnabled) {
      try {
        await roomService().deleteRoom(room.roomName);
      } catch {
        // room may already be closed
      }
    }
    return { ok: true };
  });

  app.post('/:id/token', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    requireLivekit();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const room = await db.liveRoom.findUnique({
      where: { id },
      include: { host: { select: publicUserSelect } },
    });
    if (!room) throw notFound('لایڤ نەدۆزرایەوە.');
    if (!room.isLive) throw new AppError(410, 'ئەم لایڤە کۆتایی هاتووە.', 'LIVE_ENDED');

    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, name: true, username: true, avatarUrl: true, isPro: true, proExpiresAt: true },
    });
    if (!user) throw notFound();
    const isHost = room.hostId === user.id;
    const hostPro = Boolean(
      room.host.isPro && (!room.host.proExpiresAt || room.host.proExpiresAt > new Date()),
    );
    const maxHeight = hostPro ? 1080 : 720;

    const at = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
      identity: user.id,
      name: user.name,
      ttl: '6h',
      metadata: JSON.stringify({
        username: user.username,
        avatarUrl: user.avatarUrl,
        isHost,
        plan: hostPro ? 'PRO' : 'FREE',
      }),
    });
    at.addGrant({
      roomJoin: true,
      room: room.roomName,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();

    return {
      token,
      serverUrl: env.LIVEKIT_URL,
      roomName: room.roomName,
      identity: user.id,
      isHost,
      isPro: hostPro,
      maxHeight,
      title: room.title,
      host: room.host,
    };
  });
};

export default liveRoutes;
