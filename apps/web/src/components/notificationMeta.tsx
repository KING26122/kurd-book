import { Bell, Crown, Flag, Heart, MessageCircle, ShieldCheck, UserPlus } from 'lucide-react';
import type { AppNotification } from '@/types';

/** Shared icon + navigation mapping for the notification popover and page. */
export function NotificationIcon({ type, size = 16 }: { type: string; size?: number }) {
  switch (type) {
    case 'LIKE':
      return <Heart size={size} className="text-rose-400" />;
    case 'COMMENT':
      return <MessageCircle size={size} className="text-sky-400" />;
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return <UserPlus size={size} className="text-emerald-400" />;
    case 'VERIFICATION':
      return <ShieldCheck size={size} className="text-amber-300" />;
    case 'PRO':
      return <Crown size={size} className="text-amber-300" />;
    case 'REPORT':
      return <Flag size={size} className="text-orange-400" />;
    default:
      return <Bell size={size} className="text-[color:var(--primary)]" />;
  }
}

export function notificationTarget(notification: AppNotification): string | null {
  const data = notification.data || {};
  if (typeof data.conversationId === 'string') return `/messages/${data.conversationId}`;
  switch (notification.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return '/friends';
    case 'VERIFICATION':
      return '/verification';
    case 'PRO':
      return '/pro';
    case 'REPORT':
      return '/settings';
    case 'LIKE':
    case 'COMMENT':
      if (typeof data.username === 'string') return `/u/${data.username}`;
      return '/';
    default:
      return null;
  }
}

export function notificationTone(type: string): string {
  switch (type) {
    case 'LIKE':
      return 'bg-rose-400/10 text-rose-300';
    case 'COMMENT':
      return 'bg-sky-400/10 text-sky-300';
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return 'bg-emerald-400/10 text-emerald-300';
    case 'VERIFICATION':
    case 'PRO':
      return 'bg-amber-400/10 text-amber-200';
    case 'REPORT':
      return 'bg-orange-400/10 text-orange-300';
    default:
      return 'bg-[color:var(--surface-2)] text-[color:var(--primary)]';
  }
}
