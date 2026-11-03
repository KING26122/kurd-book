import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  Inbox,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/cn';
import { formatChatDay, timeAgo } from '@/lib/format';
import { Alert, EmptyState, Skeleton } from '@/components/ui';
import {
  NotificationIcon,
  notificationTarget,
  notificationTone,
} from '@/components/notificationMeta';
import { useAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import type { AppNotification } from '@/types';

type Filter = 'all' | 'unread';

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
}

function groupByDay(items: AppNotification[]): Array<{ label: string; items: AppNotification[] }> {
  const groups: Array<{ label: string; items: AppNotification[] }> = [];
  for (const item of items) {
    const label = formatChatDay(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(useAuthStore.getState().user?.unreadNotifications || 0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const query = reset ? '' : `&cursor=${encodeURIComponent(nextCursor || '')}`;
      const data = await api<NotificationsResponse>(`/api/notifications?limit=30${query}`);
      setItems((current) => {
        if (reset) return data.notifications;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...data.notifications.filter((item) => !seen.has(item.id))];
      });
      setUnread(data.unreadCount);
      setNextCursor(data.nextCursor);
      useAuthStore.getState().patchUser({ unreadNotifications: data.unreadCount });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    void load(true);
    // The first page is loaded once; further pages use the Load more button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (notification: AppNotification) => {
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
      setUnread((current) => {
        const next = current + 1;
        useAuthStore.getState().patchUser({ unreadNotifications: next });
        return next;
      });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'unread' ? items.filter((item) => !item.readAt) : items),
    [items, filter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const markAll = async () => {
    if (!unread) return;
    setMarkingAll(true);
    try {
      await api('/api/notifications/read-all', { method: 'POST' });
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnread(0);
      useAuthStore.getState().patchUser({ unreadNotifications: 0 });
      toast('هەموو ئاگادارکردنەوەکان خوێندرانەوە.', 'success');
    } catch (markError) {
      toast(errorMessage(markError), 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnread((current) => {
        const next = Math.max(0, current - 1);
        useAuthStore.getState().patchUser({ unreadNotifications: next });
        return next;
      });
      void api(`/api/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

  return (
    <div className="page-enter space-y-4 px-3 sm:px-0">
      <section className="panel relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-2xl"
          style={{ backgroundImage: 'var(--gradient)' }}
        />
        <div className="relative flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)] shadow-glow">
            <Bell size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-2">
              <Sparkles size={12} /> چالاکییەکان
            </p>
            <h1 className="mt-1 text-xl font-black text-ink sm:text-2xl">ئاگادارکردنەوەکان</h1>
            <p className="mt-1 text-xs leading-6 text-muted">
              {unread ? `${unread} ئاگادارکردنەوەی نوێ چاوەڕوانی تۆن.` : 'هەموو ئاگادارکردنەوەکانت خوێندراونەتەوە. ئارام بە.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-soft !px-3 !py-2 !text-[11px]"
              onClick={() => void load(true)}
              disabled={loading}
              aria-label="نوێکردنەوە"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              نوێکردنەوە
            </button>
            <button
              type="button"
              className="btn-primary !px-3 !py-2 !text-[11px]"
              onClick={() => void markAll()}
              disabled={!unread || markingAll}
            >
              {markingAll ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCheck size={14} />
              )}
              هەموو بخوێنەوە
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="tab-row w-fit">
          <button
            type="button"
            className={cn('tab', filter === 'all' && 'tab-active')}
            onClick={() => setFilter('all')}
          >
            هەموو ({items.length})
          </button>
          <button
            type="button"
            className={cn('tab', filter === 'unread' && 'tab-active')}
            onClick={() => setFilter('unread')}
          >
            نوێ ({unread})
          </button>
        </div>
        {filter === 'unread' && !items.some((item) => !item.readAt) && (
          <span className="chip chip-active !text-[10px]"><CheckCheck size={12} /> پاکە</span>
        )}
      </div>

      {error && (
        <Alert kind="error">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => void load(true)}>
              هەوڵدانەوە
            </button>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="panel flex items-start gap-3 p-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={filter === 'unread' ? <CheckCheck size={28} /> : <BellOff size={28} />}
            title={filter === 'unread' ? 'هیچ ئاگادارکردنەوەیەکی نوێ نییە' : 'هێشتا ئاگادارکردنەوەیەک نییە'}
            description={
              filter === 'unread'
                ? 'هەموو چالاکییەکانت بینیوە. کاتێک شتێکی نوێ ڕوویدا، لێرە دەردەکەوێت.'
                : 'کاتێک کەسێک لایک، کۆمێنت، داواکاری هاوڕێیەتی یان پەیامی نوێ بکات، ئاگادارت دەکەینەوە.'
            }
            action={
              <button type="button" className="btn-soft !text-xs" onClick={() => navigate('/')}>
                <Inbox size={14} /> گەڕانەوە بۆ ماڵەوە
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <div className="mb-2 flex items-center gap-3 px-2">
                <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-2">{group.label}</h2>
                <span className="h-px flex-1 bg-[color:var(--border)]" />
                <span className="text-[10px] text-muted-2">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const unreadItem = !item.readAt;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openNotification(item)}
                      className={cn(
                        'panel group relative flex w-full items-start gap-3 overflow-hidden p-4 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]',
                        unreadItem && 'border-[color:color-mix(in_srgb,var(--primary)_28%,transparent)]',
                      )}
                    >
                      {unreadItem && (
                        <span className="absolute inset-y-0 right-0 w-1 bg-[image:var(--gradient)]" aria-hidden />
                      )}
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                          notificationTone(item.type),
                        )}
                      >
                        <NotificationIcon type={item.type} size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-extrabold text-ink sm:text-sm">{item.title}</span>
                          {unreadItem && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)] shadow-[0_0_8px_var(--glow)]" />
                          )}
                        </span>
                        <span className="mt-1 block text-[11px] leading-6 text-muted sm:text-xs">{item.body}</span>
                        <span className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-2">
                          <span>{timeAgo(item.createdAt)}</span>
                          {notificationTarget(item) && (
                            <span className="inline-flex items-center gap-0.5 text-[color:var(--primary)] opacity-0 transition-opacity group-hover:opacity-100">
                              بینین <ChevronLeft size={11} />
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {nextCursor && filter === 'all' && (
            <button
              type="button"
              className="btn-soft w-full !py-3 !text-xs"
              onClick={() => void load(false)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <RefreshCw size={14} />
              )}
              ئاگادارکردنەوەی کۆنتر
            </button>
          )}
        </div>
      )}
    </div>
  );
}
