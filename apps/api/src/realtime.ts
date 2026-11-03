import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { db } from './db';
import { verifyAccessToken } from './utils/auth';

let io: Server | null = null;
const ALLOWED_ORIGINS = (process.env.APP_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

interface SocketData {
  userId: string;
  role: string;
}

export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
    maxHttpBufferSize: 1e6,
  });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string) || '';
      const data = verifyAccessToken(token);
      const session = await db.session.findUnique({
        where: { id: data.sessionId },
        select: { userId: true, revokedAt: true, expiresAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return next(new Error('unauthorized'));
      }
      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: { disabled: true, role: true },
      });
      if (!user || user.disabled) return next(new Error('unauthorized'));
      (socket.data as SocketData).userId = data.userId;
      (socket.data as SocketData).role = user.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as SocketData).userId;
    void socket.join(`user:${userId}`);
    socket.emit('ready', { userId });

    socket.on('chat:join', async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;
      const member = await db.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { id: true },
      });
      if (member) void socket.join(`conv:${conversationId}`);
    });

    socket.on('chat:leave', (payload: { conversationId?: string }) => {
      if (payload?.conversationId) void socket.leave(`conv:${payload.conversationId}`);
    });

    socket.on(
      'chat:typing',
      async (payload: { conversationId?: string; isTyping?: boolean }) => {
        const conversationId = payload?.conversationId;
        if (!conversationId) return;
        const member = await db.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
          select: { id: true },
        });
        if (!member) return;
        socket.to(`conv:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId,
          isTyping: Boolean(payload.isTyping),
        });
      },
    );

    socket.on('chat:read', async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;
      const result = await db.conversationMember.updateMany({
        where: { conversationId, userId },
        data: { lastReadAt: new Date() },
      });
      if (result.count > 0) {
        socket.to(`conv:${conversationId}`).emit('chat:read', {
          conversationId,
          userId,
          at: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}

export function getIo(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToUsers(userIds: string[], event: string, data: unknown): void {
  for (const userId of userIds) emitToUser(userId, event, data);
}

export function emitToConversation(conversationId: string, event: string, data: unknown): void {
  io?.to(`conv:${conversationId}`).emit(event, data);
}
