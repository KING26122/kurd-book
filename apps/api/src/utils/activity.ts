import { db } from '../db';

const touched = new Map<string, number>();
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Records a daily-active user and refreshes lastActiveAt at most every 5 min.
 * Fire-and-forget: activity tracking must never break a request.
 */
export function touchActivity(userId: string): void {
  const now = Date.now();
  const previous = touched.get(userId) || 0;
  if (now - previous < TOUCH_INTERVAL_MS) return;
  touched.set(userId, now);

  void (async () => {
    try {
      await db.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
      await db.activityDay.upsert({
        where: { userId_day: { userId, day: utcDay() } },
        create: { userId, day: utcDay() },
        update: {},
      });
    } catch {
      // user may have been deleted; ignore
    }
  })();
}

export function recordActiveDay(userId: string): Promise<unknown> {
  return db.activityDay.upsert({
    where: { userId_day: { userId, day: utcDay() } },
    create: { userId, day: utcDay() },
    update: {},
  });
}
