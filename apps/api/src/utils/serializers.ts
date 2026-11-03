import type { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  coverUrl: true,
  bio: true,
  city: true,
  verificationStatus: true,
  verifiedAt: true,
  isPro: true,
  proExpiresAt: true,
  voiceEffect: true,
  createdAt: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

export const chatUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verificationStatus: true,
  isPro: true,
  publicKey: true,
} satisfies Prisma.UserSelect;

export const selfUserSelect = {
  ...publicUserSelect,
  email: true,
  phone: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  role: true,
  theme: true,
  twoFactorEnabled: true,
  gender: true,
  birthDate: true,
  publicKey: true,
  disabled: true,
} satisfies Prisma.UserSelect;

export function isProActive(user: { isPro: boolean; proExpiresAt: Date | null }): boolean {
  if (!user.isPro) return false;
  return !user.proExpiresAt || user.proExpiresAt > new Date();
}

export function serializeUser<T extends Record<string, unknown>>(user: T) {
  return {
    ...user,
    isPro: isProActive(
      user as unknown as { isPro: boolean; proExpiresAt: Date | null },
    ),
    online: user.lastActiveAt
      ? Date.now() - new Date(user.lastActiveAt as unknown as string).getTime() < 5 * 60 * 1000
      : false,
  };
}

export function parseJsonArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
