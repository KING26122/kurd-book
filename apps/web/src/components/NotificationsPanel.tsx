import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { CountBadge } from '@/components/ui';
import { NotificationIcon, notificationTarget } from '@/components/notificationMeta';
import { useAuthStore } from '@/stores/auth';
import type { AppNotification } from '@/types';

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(useAuthStore.getState().user?.unreadNotifications || 0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ notifications: AppNotification[]; unreadCount: number }>(
        '/api/notifications?limit=25',
      );
      setItems(data.notifications);
      setUnread(data.unreadCount);
      useAuthStore.getState().patchUser({ unreadNotifications: data.unreadCount });
    } catch {
      // silent; the header still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (notification: AppNotification) => {
      setItems((current) => [notification, ...current.filter((n) => n.id !== notification.id)].slice(0, 25));
      setUnread((value) => {
        const next = value + 1;
        useAuthStore.getState().patchUser({ unreadNotifications: next });
        return next;
      });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, load]);

  const markAll = async () => {
    try {
      await api('/api/notifications/read-all', { method: 'POST' });
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
      useAuthStore.getState().patchUser({ unreadNotifications: 0 });
    } catch {
      // ignore
    }
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      void api(`/api/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => undefined);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnread((value) => {
        const next = Math.max(0, value - 1);
        useAuthStore.getState().patchUser({ unreadNotifications: next });
        return next;
      });
    }
    setOpen(false);
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={cn('icon-btn relative', open && 'bg-[color:var(--surface-2)] text-ink')}
        onClick={() => setOpen((value) => !value)}
        aria-label="ئاگادارکردنەوەکان"
      >
        <Bell size={20} />
        <span className="absolute -right-0.5 -top-0.5">
          <CountBadge count={unread} />
        </span>
      </button>
      {open && (
        <div className="panel fixed left-2 right-2 top-[70px] z-[70] overflow-hidden rounded-3xl sm:absolute sm:left-0 sm:right-auto sm:top-12 sm:w-[390px]">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-sm font-extrabold text-ink">ئاگادارکردنەوەکان</h3>
              <p className="mt-0.5 text-[10px] text-muted">{unread ? `${unread} نوێ` : 'هەموو خوێندراونەتەوە'}</p>
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="btn-ghost !px-2 !py-1 !text-[11px]">
                <CheckCheck size={14} /> هەموو بخوێنەوە
              </button>
            )}
          </header>
          <div className="hide-scrollbar max-h-[65vh] overflow-y-auto p-2">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-xs text-muted">
                <span className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
                بار دەکرێت…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted">
                <BellOff size={30} />
                <p className="text-xs">هێشتا ئاگادارکردنەوەیەک نییە.</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-right transition-colors hover:bg-[color:var(--surface-2)]',
                    !item.readAt && 'bg-[color:var(--primary)]/[0.06]',
                  )}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)]">
                    <NotificationIcon type={item.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-xs font-extrabold text-ink">{item.title}</span>
                      {!item.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" />}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-muted">{item.body}</span>
                    <span className="mt-1 block text-[10px] text-muted-2">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <footer className="border-t border-line p-2">
            <button
              type="button"
              className="btn-ghost w-full !py-2 !text-xs"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              <Inbox size={15} /> هەموو ئاگادارکردنەوەکان
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
