import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { env } from '../env';
import { requireAuth } from '../utils/auth';
import { badRequest, forbidden, notFound, parseWith, unauthorized } from '../utils/errors';
import {
  activateProForRequest,
  markPaymentStatus,
  planDays,
  PRO_PLANS,
  providerAvailability,
  refreshFibPayment,
  startProCheckout,
} from '../services/payments';

const proRoutes: FastifyPluginAsync = async (app) => {
  app.get('/plans', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { isPro: true, proExpiresAt: true },
    });
    return {
      plans: Object.values(PRO_PLANS),
      ...providerAvailability(),
      pro: {
        active: Boolean(user?.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
        expiresAt: user?.proExpiresAt,
      },
      benefits: [
        'نیشانەی تاج و ئەڵماس لە تەنیشت ناوەکەت',
        'لایڤ بە کوالیتی 1080p و bitrate بەرزتر',
        'شاشە هاوبەشکردن بە کوالیتی بەرز',
        'پشتگیری خێراتر و تایبەت',
        'شێوازی دەنگی تایبەت بۆ نامەی دەنگی',
      ],
    };
  });

  app.get('/me', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { isPro: true, proExpiresAt: true },
    });
    const requests = await db.proRequest.findMany({
      where: { userId: req.auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        payment: { select: { id: true, status: true, provider: true, paidAt: true } },
      },
    });
    return {
      pro: {
        active: Boolean(user?.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
        expiresAt: user?.proExpiresAt,
      },
      requests,
    };
  });

  app.post('/checkout', { preHandler: requireAuth }, async (req, reply) => {
    if (!req.auth) throw unauthorized();
    const body = parseWith(
      z.object({
        plan: z.enum(['MONTHLY', 'YEARLY']),
        provider: z.enum(['FIB', 'FASTPAY', 'QICARD']),
        receiptUrl: z.string().max(500).optional(),
      }),
      req.body,
    );
    const result = await startProCheckout({
      userId: req.auth.userId,
      plan: body.plan,
      provider: body.provider,
      receiptUrl: body.receiptUrl,
    });
    return reply.status(201).send(result);
  });

  app.post('/payments/:id/simulate-paid', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    if (env.PAYMENTS_MODE !== 'sandbox') {
      throw forbidden('ئەم ڕێگەیە تەنها لە دۆخی تاقیکردنەوەدا کارا دەبێت.');
    }
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) throw notFound('پارەدان نەدۆزرایەوە.');
    if (payment.userId !== req.auth.userId) throw forbidden();
    if (!payment.provider.endsWith('_SANDBOX')) throw badRequest('ئەم پارەدانە تاقیکردنەوەیی نییە.');
    await markPaymentStatus(payment.id, 'PAID', { simulated: true });
    const result = await activateProForRequest(payment.proRequestId, payment.id);
    return { ok: true, pro: result };
  });

  app.get('/payments/:id/status', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const payment = await db.payment.findUnique({
      where: { id },
      include: { proRequest: true },
    });
    if (!payment) throw notFound('پارەدان نەدۆزرایەوە.');
    if (payment.userId !== req.auth.userId && req.auth.role !== 'ADMIN') throw forbidden();

    let providerStatus: string | null = null;
    if (payment.provider === 'FIB' && payment.status === 'PENDING') {
      try {
        providerStatus = await refreshFibPayment(payment.id);
      } catch (error) {
        req.log.warn({ err: error, paymentId: id }, 'FIB status refresh failed');
      }
    }
    const fresh = await db.payment.findUnique({
      where: { id },
      include: { proRequest: true },
    });
    const user = await db.user.findUnique({
      where: { id: payment.userId },
      select: { isPro: true, proExpiresAt: true },
    });
    return {
      payment: fresh
        ? {
            id: fresh.id,
            provider: fresh.provider,
            status: fresh.status,
            amount: fresh.amount,
            paidAt: fresh.paidAt,
          }
        : null,
      requestStatus: fresh?.proRequest.status,
      providerStatus,
      pro: {
        active: Boolean(user?.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
        expiresAt: user?.proExpiresAt,
      },
    };
  });

  app.post('/requests/:id/cancel', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const { id } = parseWith(z.object({ id: z.string().min(1) }), req.params);
    const request = await db.proRequest.findUnique({ where: { id } });
    if (!request) throw notFound('داواکاری نەدۆزرایەوە.');
    if (request.userId !== req.auth.userId) throw forbidden();
    if (request.status !== 'PENDING') throw badRequest('تەنها داواکاری چاوەڕوان دەتوانرێت هەڵبوەشێنرێتەوە.');
    await db.$transaction([
      db.proRequest.update({
        where: { id },
        data: { status: 'REJECTED', note: 'لەلایەن بەکارهێنەر هەڵوەشێنرایەوە.' },
      }),
      db.payment.updateMany({
        where: { proRequestId: id, status: 'PENDING' },
        data: { status: 'FAILED' },
      }),
    ]);
    return { ok: true };
  });

  app.get('/expiry', { preHandler: requireAuth }, async (req) => {
    if (!req.auth) throw unauthorized();
    const user = await db.user.findUnique({
      where: { id: req.auth.userId },
      select: { isPro: true, proExpiresAt: true },
    });
    if (!user) throw notFound();
    const daysLeft =
      user.proExpiresAt && user.isPro
        ? Math.max(0, Math.ceil((user.proExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
    return {
      active: Boolean(user.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date())),
      expiresAt: user.proExpiresAt,
      daysLeft,
      planDaysHint: planDays('MONTHLY'),
    };
  });
};

export default proRoutes;
