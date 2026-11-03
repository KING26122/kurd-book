import crypto from 'node:crypto';
import { db } from '../db';
import { env, otpDebugEnabled } from '../env';
import { AppError, badRequest } from '../utils/errors';
import { sendOtpEmail } from '../services/mailer';
import { sendOtpSms } from '../services/sms';

export type OtpPurpose = 'REGISTER' | 'RESET' | 'LOGIN';
export type OtpChannel = 'email' | 'phone';

export function normalizeIdentifier(channel: OtpChannel, raw: string): string {
  const value = raw.trim();
  if (channel === 'email') {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw badRequest('ئیمەیڵەکە دروست نییە');
    return email;
  }

  let phone = value.replace(/[\s\-().]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (/^07\d{9}$/.test(phone)) phone = `+964${phone.slice(1)}`;
  if (!/^\+?\d{7,15}$/.test(phone)) throw badRequest('ژمارەی مۆبایلەکە دروست نییە');
  return phone;
}

function hashCode(identifier: string, purpose: string, code: string): string {
  return crypto
    .createHmac('sha256', env.OTP_SECRET)
    .update(`${purpose}:${identifier}:${code}`)
    .digest('hex');
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function issueOtp(params: {
  identifier: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  userId?: string;
}): Promise<{ debugCode?: string; expiresAt: Date }> {
  const { identifier, channel, purpose, userId } = params;
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // A fresh code invalidates all previous unused codes for this flow.
  await db.otpCode.deleteMany({
    where: { identifier, purpose, consumedAt: null },
  });

  await db.otpCode.create({
    data: {
      identifier,
      channel,
      purpose,
      codeHash: hashCode(identifier, purpose, code),
      expiresAt,
      userId: userId || null,
    },
  });

  try {
    if (channel === 'email') {
      await sendOtpEmail(identifier, code, purpose);
    } else {
      await sendOtpSms(identifier, code);
    }
  } catch (error) {
    console.error('Failed to deliver OTP:', error);
    if (env.NODE_ENV === 'production') {
      throw new AppError(502, 'ناردنی کۆد سەرکەوتوو نەبوو. تکایە دواتر هەوڵ بدەوە.');
    }
  }

  return {
    expiresAt,
    debugCode: otpDebugEnabled ? code : undefined,
  };
}

export async function verifyOtp(params: {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<void> {
  const { identifier, purpose, code } = params;
  const otp = await db.otpCode.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw badRequest('کۆدەکە بەسەرچووە. تکایە کۆدی نوێ داوا بکە.');
  if (otp.expiresAt < new Date()) throw badRequest('کۆدەکە بەسەرچووە. تکایە کۆدی نوێ داوا بکە.');
  if (otp.attempts >= 6) throw new AppError(429, 'ژیمارەی هەوڵەکان زۆر بووە. کۆدی نوێ داوا بکە.');

  const expected = hashCode(identifier, purpose, code);
  const provided = Buffer.from(otp.codeHash, 'hex');
  const wanted = Buffer.from(expected, 'hex');
  const valid = provided.length === wanted.length && crypto.timingSafeEqual(provided, wanted);

  if (!valid) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw badRequest('کۆدەکە هەڵەیە');
  }

  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}
