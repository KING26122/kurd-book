import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db';
import { env } from '../env';
import { markPaymentStatus, refreshFibPayment } from '../services/payments';

function secureEq(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyHmac(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return secureEq(expected, signature.replace(/^sha256=/, ''));
}

const webhooksRoutes: FastifyPluginAsync = async (app) => {
  app.post('/fib', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (req) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const paymentId =
      (body.paymentId as string) ||
      ((body.payment as Record<string, unknown> | undefined)?.paymentId as string) ||
      ((body.data as Record<string, unknown> | undefined)?.paymentId as string);
    if (!paymentId) {
      req.log.warn({ body }, 'FIB webhook without paymentId');
      return { ok: true };
    }
    const payment = await db.payment.findFirst({
      where: { provider: 'FIB', providerRef: paymentId },
    });
    if (!payment) {
      req.log.warn({ paymentId }, 'FIB webhook for unknown payment');
      return { ok: true };
    }
    try {
      await refreshFibPayment(payment.id);
    } catch (error) {
      req.log.error({ err: error, paymentId }, 'FIB webhook status refresh failed');
    }
    return { ok: true };
  });

  app.post('/fastpay', async (req, reply) => {
    if (!env.FASTPAY_WEBHOOK_SECRET) return reply.status(503).send({ error: 'webhook disabled' });
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = String(req.headers['x-fastpay-signature'] || '');
    if (!verifyHmac(raw, signature, env.FASTPAY_WEBHOOK_SECRET)) {
      return reply.status(401).send({ error: 'invalid signature' });
    }
    const parsed = z
      .object({
        providerRef: z.string().min(1),
        status: z.string().min(1),
        amount: z.number().optional(),
      })
      .safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid payload' });
    const payment = await db.payment.findFirst({
      where: { provider: 'FASTPAY', providerRef: parsed.data.providerRef },
    });
    if (!payment) return reply.status(404).send({ error: 'not found' });
    if (['PAID', 'SUCCESS', 'COMPLETED'].includes(parsed.data.status.toUpperCase())) {
      await markPaymentStatus(payment.id, 'PAID', parsed.data);
    } else if (['FAILED', 'DECLINED', 'CANCELLED'].includes(parsed.data.status.toUpperCase())) {
      await markPaymentStatus(payment.id, 'FAILED', parsed.data);
    }
    return { ok: true };
  });

  app.post('/qicard', async (req, reply) => {
    if (!env.QICARD_WEBHOOK_SECRET) return reply.status(503).send({ error: 'webhook disabled' });
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = String(req.headers['x-qicard-signature'] || '');
    if (!verifyHmac(raw, signature, env.QICARD_WEBHOOK_SECRET)) {
      return reply.status(401).send({ error: 'invalid signature' });
    }
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      providerRef?: string;
      status?: string;
    };
    if (!body.providerRef || !body.status) return reply.status(400).send({ error: 'invalid payload' });
    const payment = await db.payment.findFirst({
      where: { provider: 'QICARD', providerRef: body.providerRef },
    });
    if (!payment) return reply.status(404).send({ error: 'not found' });
    if (['PAID', 'SUCCESS', 'COMPLETED'].includes(body.status.toUpperCase())) {
      await markPaymentStatus(payment.id, 'PAID', body);
    } else if (['FAILED', 'DECLINED', 'CANCELLED'].includes(body.status.toUpperCase())) {
      await markPaymentStatus(payment.id, 'FAILED', body);
    }
    return { ok: true };
  });
};

export default webhooksRoutes;
