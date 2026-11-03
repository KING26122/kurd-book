import { db } from '../db';
import { env } from '../env';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors';
import { notify, notifyAdmins } from './notifications';

export type PlanId = 'MONTHLY' | 'YEARLY';
export type ProviderId = 'FIB' | 'FASTPAY' | 'QICARD';

export const PRO_PLANS: Record<
  PlanId,
  { id: PlanId; label: string; amount: number; days: number; badge?: string; description: string }
> = {
  MONTHLY: {
    id: 'MONTHLY',
    label: 'پلانی مانگانە',
    amount: 5000,
    days: 30,
    description: 'تاج و ئەڵماس، کوالیتی 1080p، لایڤی بەرزتر و نیشانەی Pro',
  },
  YEARLY: {
    id: 'YEARLY',
    label: 'پلانی ساڵانە',
    amount: 45000,
    days: 365,
    badge: '٢ خولەک بەخۆڕایی',
    description: 'هەموو تایبەتمەندییەکانی Pro بۆ ساڵێکی تەواو — ٢ مانگ بەخۆڕایی',
  },
};

export function planDays(plan: string): number {
  return plan === 'YEARLY' ? 365 : 30;
}

export function providerAvailability() {
  const fibLive = Boolean(env.FIB_CLIENT_ID && env.FIB_CLIENT_SECRET);
  return {
    mode: env.PAYMENTS_MODE,
    providers: {
      FIB: {
        id: 'FIB',
        name: 'FIB',
        subtitle: 'First Iraqi Bank',
        mode: env.PAYMENTS_MODE === 'sandbox' ? 'sandbox' : fibLive ? 'live' : 'unconfigured',
      },
      FASTPAY: {
        id: 'FASTPAY',
        name: 'FastPay',
        subtitle: 'FastPay Iraq',
        mode: env.PAYMENTS_MODE === 'sandbox' ? 'sandbox' : 'manual',
      },
      QICARD: {
        id: 'QICARD',
        name: 'QiCard',
        subtitle: 'Qi Card',
        mode: env.PAYMENTS_MODE === 'sandbox' ? 'sandbox' : 'manual',
      },
    },
  };
}

type FibPayment = {
  paymentId: string;
  readableCode?: string;
  qrCode?: string;
  validUntil?: string;
  personalAppLink?: string;
  businessAppLink?: string;
  corporateAppLink?: string;
};

async function getFibClient() {
  if (!env.FIB_CLIENT_ID || !env.FIB_CLIENT_SECRET) {
    throw new AppError(503, 'FIB ڕێک نەخراوە. تکایە client credentials زیاد بکە.', 'FIB_NOT_CONFIGURED');
  }
  const { PaymentSDK } = await import('@first-iraqi-bank/sdk/payment');
  return PaymentSDK.getClient(env.FIB_CLIENT_ID, env.FIB_CLIENT_SECRET, env.FIB_ENV);
}

async function fibAuthenticate(): Promise<string> {
  const client = await getFibClient();
  const res = await client.authenticate();
  if (!res.ok) {
    throw new AppError(502, 'پەیوەندی بە FIB سەرکەوتوو نەبوو.', 'FIB_AUTH_FAILED');
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new AppError(502, 'FIB token وەرنەگیرا.');
  return data.access_token;
}

export async function createFibPayment(input: {
  amount: number;
  description: string;
  reference: string;
}): Promise<FibPayment> {
  const client = await getFibClient();
  const accessToken = await fibAuthenticate();
  const res = await client.createPayment(
    {
      amount: input.amount,
      description: input.description,
      redirectUri: new URL(`${env.PUBLIC_APP_URL}/pro?paid=1`),
      statusCallbackUrl: new URL(`${env.PUBLIC_API_URL}/api/webhooks/fib`),
      expiresIn: { hours: 1 },
      refundableFor: { days: 1 },
    },
    accessToken,
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `دروستکردنی پارەدانی FIB سەرکەوتوو نەبوو (${res.status}).`, 'FIB_CREATE_FAILED', detail.slice(0, 400));
  }
  return (await res.json()) as FibPayment;
}

export async function fetchFibPaymentStatus(paymentId: string): Promise<{
  status: string;
  paidAt?: string;
  amount?: number;
  raw: unknown;
}> {
  const client = await getFibClient();
  const accessToken = await fibAuthenticate();
  const res = await client.getPaymentStatus(paymentId, accessToken);
  if (!res.ok) throw new AppError(502, 'پشکنینی دۆخی پارەدان سەرکەوتوو نەبوو.');
  const data = (await res.json()) as {
    status?: string;
    paidAt?: string;
    amount?: { amount?: number } | number;
    [key: string]: unknown;
  };
  return {
    status: data.status || 'UNKNOWN',
    paidAt: data.paidAt,
    amount: typeof data.amount === 'number' ? data.amount : data.amount?.amount,
    raw: data,
  };
}

export async function activateProForRequest(proRequestId: string, paymentId?: string) {
  const request = await db.proRequest.findUnique({
    where: { id: proRequestId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!request) throw notFound('داواکاری Pro نەدۆزرایەوە.');
  if (request.status === 'APPROVED' || request.status === 'PAID') {
    return { alreadyActive: true, user: request.user };
  }

  const now = new Date();
  const user = await db.user.findUnique({
    where: { id: request.userId },
    select: { proExpiresAt: true },
  });
  const base =
    user?.proExpiresAt && user.proExpiresAt > now ? new Date(user.proExpiresAt) : new Date(now);
  base.setDate(base.getDate() + planDays(request.plan));

  await db.$transaction([
    db.user.update({
      where: { id: request.userId },
      data: { isPro: true, proExpiresAt: base },
    }),
    db.proRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED', reviewedAt: now },
    }),
    ...(paymentId
      ? [
          db.payment.update({
            where: { id: paymentId },
            data: { status: 'PAID', paidAt: now },
          }),
        ]
      : []),
  ]);

  await notify({
    userId: request.userId,
    type: 'PRO',
    title: 'تاج و ئەڵماسی Pro چالاک بوو 👑💎',
    body: 'هەژمارەکەت ئێستا Pro ـە. سوپاس بۆ پشتگیریکردنی کورد بووک!',
    data: { plan: request.plan, expiresAt: base.toISOString() },
  });

  return { alreadyActive: false, expiresAt: base };
}

export async function markPaymentStatus(
  paymentId: string,
  status: 'PAID' | 'FAILED',
  raw?: unknown,
) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.status === 'PAID' && status === 'PAID') return { already: true };
  if (payment.status === 'PAID' && status === 'FAILED') return { already: true };
  if (status === 'PAID') {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(raw ? { raw: JSON.stringify(raw).slice(0, 8000) } : {}),
      },
    });
    return activateProForRequest(payment.proRequestId, payment.id);
  }
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      ...(raw ? { raw: JSON.stringify(raw).slice(0, 8000) } : {}),
    },
  });
  await db.proRequest.update({
    where: { id: payment.proRequestId },
    data: { status: 'REJECTED', note: 'پارەدان سەرکەوتوو نەبوو (provider).' },
  });
  return { ok: true };
}

export async function refreshFibPayment(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('پارەدان نەدۆزرایەوە.');
  if (payment.provider !== 'FIB') throw badRequest('ئەم پارەدانە FIB نییە.');
  const status = await fetchFibPaymentStatus(payment.providerRef);
  if (status.status === 'PAID') {
    if (payment.amount && status.amount && status.amount < payment.amount) {
      throw new AppError(400, 'بڕی پارەدان کەمترە لە بڕی پلانەکە.');
    }
    await markPaymentStatus(payment.id, 'PAID', status.raw);
  } else if (['DECLINED', 'REFUNDED'].includes(status.status)) {
    await markPaymentStatus(payment.id, 'FAILED', status.raw);
  } else {
    await db.payment.update({
      where: { id: payment.id },
      data: { raw: JSON.stringify(status.raw).slice(0, 8000) },
    });
  }
  return status.status;
}

export async function startProCheckout(input: {
  userId: string;
  plan: PlanId;
  provider: ProviderId;
  receiptUrl?: string;
}) {
  const plan = PRO_PLANS[input.plan];
  if (!plan) throw badRequest('پلانی پارەدان دروست نییە.');

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, isPro: true, proExpiresAt: true, name: true },
  });
  if (!user) throw notFound('بەکارهێنەر نەدۆزرایەوە.');

  if (env.PAYMENTS_MODE === 'live' && input.provider === 'FIB' && (!env.FIB_CLIENT_ID || !env.FIB_CLIENT_SECRET)) {
    throw new AppError(503, 'FIB لەم کاتەدا بەردەست نییە. تکایە FastPay یان QiCard هەڵبژێرە.', 'FIB_NOT_CONFIGURED');
  }

  const request = await db.proRequest.create({
    data: {
      userId: input.userId,
      plan: input.plan,
      provider: input.provider,
      amount: plan.amount,
      receiptUrl: input.receiptUrl || null,
      status: 'PENDING',
    },
  });

  if (env.PAYMENTS_MODE === 'sandbox') {
    const payment = await db.payment.create({
      data: {
        userId: input.userId,
        proRequestId: request.id,
        provider: `${input.provider}_SANDBOX`,
        providerRef: `sb_${request.id}`,
        plan: input.plan,
        amount: plan.amount,
        status: 'PENDING',
      },
    });
    return {
      mode: 'sandbox' as const,
      proRequest: request,
      payment: {
        id: payment.id,
        provider: payment.provider,
        amount: payment.amount,
        status: payment.status,
      },
      message: 'دۆخی تاقیکردنەوە: دەتوانیت پارەدان بە شێوەی نموونەیی تەواو بکەیت.',
    };
  }

  if (input.provider === 'FIB') {
    try {
      const fib = await createFibPayment({
        amount: plan.amount,
        description: `Kurd Book Pro — ${plan.label}`,
        reference: request.id,
      });
      const payment = await db.payment.create({
        data: {
          userId: input.userId,
          proRequestId: request.id,
          provider: 'FIB',
          providerRef: fib.paymentId,
          plan: input.plan,
          amount: plan.amount,
          status: 'PENDING',
          raw: JSON.stringify(fib).slice(0, 8000),
        },
      });
      return {
        mode: 'live' as const,
        proRequest: request,
        payment: { id: payment.id, status: payment.status },
        fib,
        message: 'لە ئەپی FIB پارەدانەکە تەواو بکە. دواتر دۆخەکە خۆکارانە نوێ دەبێتەوە.',
      };
    } catch (error) {
      await db.proRequest.update({
        where: { id: request.id },
        data: { status: 'REJECTED', note: 'دروستکردنی پارەدانی FIB شکستی هێنا.' },
      });
      throw error;
    }
  }

  // FastPay / QiCard live: admin-reviewed transfer / receipt flow.
  if (!input.receiptUrl) {
    throw badRequest('بۆ FastPay یان QiCard، وێنەی وەسڵی پارەدان باربکە.');
  }
  await notifyAdmins(
    'PRO',
    'داواکاری Pro — پێداچوونەوە پێویستە',
    `${user.name} داواکاری Pro بە ${input.provider} کرد.`,
    { proRequestId: request.id, plan: input.plan, provider: input.provider },
  );
  return {
    mode: 'manual' as const,
    proRequest: request,
    message: 'وەسڵەکەت نێردرا. دوای پشکنینی بەڕێوەبەر، Pro چالاک دەبێت.',
  };
}

export async function findPaymentForUser(paymentId: string, userId: string, role: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('پارەدان نەدۆزرایەوە.');
  if (payment.userId !== userId && role !== 'ADMIN') throw forbidden();
  return payment;
}
