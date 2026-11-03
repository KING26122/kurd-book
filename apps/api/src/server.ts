import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { allowedOrigins, env, livekitEnabled, isProd } from './env';
import { db } from './db';
import { errorHandler } from './utils/errors';
import { initRealtime } from './realtime';
import { ensureUploadDirs, publicUploadDir } from './services/storage';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import postsRoutes from './routes/posts';
import storiesRoutes from './routes/stories';
import friendsRoutes from './routes/friends';
import chatsRoutes from './routes/chats';
import uploadsRoutes from './routes/uploads';
import verificationRoutes from './routes/verification';
import proRoutes from './routes/pro';
import liveRoutes from './routes/live';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import webhooksRoutes from './routes/webhooks';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: isProd ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    trustProxy: true,
    bodyLimit: 3 * 1024 * 1024,
    requestTimeout: 60_000,
  });

  ensureUploadDirs();

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, { secret: env.JWT_REFRESH_SECRET });
  await app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'هەوڵەکان زۆر بوون. تکایە کەمێک چاوەڕوان بە.',
      },
    }),
  });
  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldSize: 1024 * 1024,
    },
  });

  await app.register(fastifyStatic, {
    root: publicUploadDir,
    prefix: '/uploads/',
    cacheControl: true,
    maxAge: '30d',
    immutable: true,
    decorateReply: false,
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'ڕێگەی داواکراو نەدۆزرایەوە.' },
    });
  });

  app.get('/api/health', async () => {
    let dbOk = true;
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    return {
      ok: dbOk,
      service: 'kurd-book-api',
      version: '1.0.0',
      time: new Date().toISOString(),
      features: {
        email: env.EMAIL_PROVIDER,
        sms: env.SMS_PROVIDER,
        payments: env.PAYMENTS_MODE,
        livekit: livekitEnabled,
      },
    };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(postsRoutes, { prefix: '/api/posts' });
  await app.register(storiesRoutes, { prefix: '/api/stories' });
  await app.register(friendsRoutes, { prefix: '/api/friends' });
  await app.register(chatsRoutes, { prefix: '/api/chats' });
  await app.register(uploadsRoutes, { prefix: '/api/uploads' });
  await app.register(verificationRoutes, { prefix: '/api/verification' });
  await app.register(proRoutes, { prefix: '/api/pro' });
  await app.register(liveRoutes, { prefix: '/api/live' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(webhooksRoutes, { prefix: '/api/webhooks' });

  initRealtime(app.server);

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      `Kurd Book API ready → http://localhost:${env.PORT}  (livekit: ${livekitEnabled ? 'on' : 'off'})`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down…`);
    try {
      await app.close();
      await db.$disconnect();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

if (require.main === module) {
  void start();
}
