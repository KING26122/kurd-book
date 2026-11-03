import { db } from '../db';
import { emitToUser } from '../realtime';

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function notify(input: NotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: JSON.stringify(input.data || {}),
    },
  });
  emitToUser(input.userId, 'notification:new', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: input.data || {},
    readAt: null,
    createdAt: notification.createdAt,
  });
  return notification;
}

export async function notifyAdmins(
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const admins = await db.user.findMany({
    where: { role: 'ADMIN', disabled: false },
    select: { id: true },
  });
  await Promise.all(admins.map((admin) => notify({ userId: admin.id, type, title, body, data })));
}
