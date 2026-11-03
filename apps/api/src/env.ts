import 'dotenv/config';
import { z } from 'zod';

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())))
  .default(false);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  APP_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  DATABASE_URL: z.string().default('file:./dev.db'),

  JWT_SECRET: z.string().min(16).default('kurdbook-insecure-dev-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(16).default('kurdbook-insecure-dev-refresh-change-me'),
  OTP_SECRET: z.string().min(16).default('kurdbook-insecure-dev-otp-change-me'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(250),
  OTP_DEBUG: boolFromString,

  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: boolFromString,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Kurd Book <no-reply@kurdbook.app>'),

  SMS_PROVIDER: z.enum(['console', 'twilio', 'textbelt', 'webhook']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  TEXTBELT_KEY: z.string().optional(),
  SMS_WEBHOOK_URL: z.string().optional(),
  SMS_WEBHOOK_TOKEN: z.string().optional(),

  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),

  PAYMENTS_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PUBLIC_APP_URL: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  FIB_ENV: z.enum(['dev', 'stage', 'prod']).default('dev'),
  FIB_BASE_URL: z.string().default('https://api.fib.iq'),
  FIB_CLIENT_ID: z.string().optional(),
  FIB_CLIENT_SECRET: z.string().optional(),
  FIB_WEBHOOK_SECRET: z.string().optional(),
  FASTPAY_BASE_URL: z.string().optional(),
  FASTPAY_MERCHANT_ID: z.string().optional(),
  FASTPAY_API_KEY: z.string().optional(),
  FASTPAY_WEBHOOK_SECRET: z.string().optional(),
  QICARD_BASE_URL: z.string().optional(),
  QICARD_TERMINAL_ID: z.string().optional(),
  QICARD_API_KEY: z.string().optional(),
  QICARD_WEBHOOK_SECRET: z.string().optional(),

  ADMIN_EMAIL: z.string().email().default('admin@kurdbook.app'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin1234!'),
  ADMIN_NAME: z.string().default('بەڕێوەبەری کورد بووک'),
  ADMIN_USERNAME: z.string().default('admin'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = !isProd;
export const allowedOrigins = env.APP_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
export const otpDebugEnabled = env.OTP_DEBUG || !isProd;
export const livekitEnabled = Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
export const publicAppUrl = env.PUBLIC_APP_URL.replace(/\/$/, '');
