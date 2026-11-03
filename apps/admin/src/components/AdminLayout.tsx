import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  Crown,
  ExternalLink,
  Flag,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { adminApi, adminLogoutRequest } from '@/lib/api';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { Avatar } from '@/components/ui';
import { useAdminAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { AdminNotification, AdminNotificationPayload } from '@/types';

const EMPTY_COUNTS = { verifications: 0, pro: 0, reports: 0, total: 0 };

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'داشبۆرد', subtitle: 'گەشتێکی خێرا بەسەر تەواوی کورد بووک' },
  '/users': { title: 'بەکارهێنەران', subtitle: 'گەڕان، پشکنین و بەڕێوەبردنی هەژمارەکان' },
  '/verifications': { title: 'پشتڕاستکردنەوە', subtitle: 'پشکنینی ناسنامە و سێلفی بۆ تاجی ئاڵتوونی' },
  '/pro': { title: 'داواکارییەکانی Pro', subtitle: 'پەسەندکردن یان ڕەتکردنەوەی پارەدان و ئەندامێتی' },
  '/reports': { title: 'ڕاپۆرتەکان', subtitle: 'پشکنینی ڕاپۆرتەکان و بەڵگەی چات بە ڕەزامەندی' },
};

function notificationDestination(notification: AdminNotification): string {
  switch (notification.type) {
    case 'VERIFICATION':
      return '/verifications';
    case 'PRO':
      return '/pro';
    case 'REPORT':
      return '/reports';
    default:
      return '/';
  }
}

function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminApi<AdminNotificationPayload>('/api/admin/notifications');
      setNotifications(data.notifications);
      setCounts(data.counts);
    } catch {
      // Auth failures are handled by the API client; keep the shell usable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);

    const token = useAdminAuthStore.getState().accessToken;
    if (token) {
      const socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socketRef.current = socket;
      socket.on('notification:new', (notification: AdminNotification) => {
        setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 25));
        void load();
      });
      socket.on('connect_error', () => {
        // Polling above remains as a fallback.
      });
    }

    return () => {
      window.clearInterval(interval);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [load]);

  const markRead = useCallback((id: string) => {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: item.readAt || now } : item)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await adminApi('/api/admin/notifications/read-all', { method: 'POST' });
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
  }, []);

  return { notifications, counts, loading, reload: load, markRead, markAllRead };
}

export function AdminLayout() {
  const user = useAdminAuthStore((state) => state.user);
  const clear = useAdminAuthStore((state) => state.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, counts, loading, reload, markRead, markAllRead } = useAdminNotifications();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onClick = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const unread = notifications.filter((item) => !item.readAt).length;
  const meta = PAGE_META[location.pathname] || PAGE_META['/'];

  const nav = [
    { to: '/', label: 'داشبۆرد', icon: LayoutDashboard, end: true, badge: 0 },
    { to: '/users', label: 'بەکارهێنەران', icon: Users, badge: 0 },
    { to: '/verifications', label: 'پشتڕاستکردنەوە', icon: ShieldCheck, badge: counts.verifications },
    { to: '/pro', label: 'داواکاری Pro', icon: Crown, badge: counts.pro },
    { to: '/reports', label: 'ڕاپۆرتەکان', icon: Flag, badge: counts.reports },
  ];

  const logout = async () => {
    await adminLogoutRequest();
    clear();
    navigate('/login', { replace: true });
    toast('بە سەرکەوتوویی دەرچوویت.', 'success');
  };

  if (!user) return null;

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.readAt) {
      markRead(notification.id);
      void adminApi(`/api/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    setNotificationsOpen(false);
    navigate(notificationDestination(notification));
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      toast('هەموو ئاگادارکردنەوەکان خوێندرانەوە.', 'success');
    } catch {
      toast('نەتوانرا ئاگادارکردنەوەکان بخوێندرێنەوە.', 'error');
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 px-2 py-2">
        <span className="relative">
          <img src="/logo.svg" alt="Kurd Book" className="h-11 w-11 rounded-2xl shadow-glow" />
          <span className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent)] text-[8px] font-black text-black">
            A
          </span>
        </span>
        <span>
          <span className="block font-display text-lg font-black leading-none text-ink">کورد بووک</span>
          <span className="mt-1 block text-[9px] font-bold tracking-[0.18em] text-muted-2">ADMIN CONTROL</span>
        </span>
      </Link>

      <div className="mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-2">سەرەکی</div>
      <nav className="mt-2 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('side-link', isActive && 'side-link-active')}
          >
            <item.icon size={17} className="side-icon" />
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 && (
              <span className="flex min-w-[19px] items-center justify-center rounded-full bg-[color:var(--danger)] px-1.5 text-[9px] font-black leading-[19px] text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="divider my-4" />

      <div className="rounded-2xl border border-line bg-[color:var(--bg)]/40 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[color:var(--accent)]">
          <Sparkles size={13} /> دۆخی سیستەم
        </div>
        <p className="mt-1.5 text-[10px] leading-5 text-muted">
          سێرڤەر و بنکەدراوە لەسەر هەمان ئامێر کار دەکەن. بۆ بەرهەمهێنان PostgreSQL و هۆستینگی پارێزراو بەکاربهێنە.
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[color:var(--success)]">
          <span className="status-dot bg-current" /> API · SQLite · Socket.IO
        </div>
      </div>

      <div className="mt-auto pt-4">
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="side-link !py-2"
        >
          <ExternalLink size={16} className="side-icon" />
          <span className="flex-1">کردنەوەی ئەپی کۆمەڵایەتی</span>
        </a>
        <div className="mt-2 rounded-2xl border border-line bg-[color:var(--panel)] p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar user={user} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-extrabold text-ink">{user.name}</p>
              <p className="mt-0.5 truncate text-[9px] text-muted">{user.email || `@${user.username}`}</p>
            </div>
            <span className="chip !border-[color:var(--accent)]/20 !bg-[color:var(--accent)]/10 !text-[8px] !text-[color:var(--accent)]">
              ADMIN
            </span>
          </div>
          <button type="button" onClick={() => void logout()} className="menu-item mt-1.5 !text-[10px] !text-[color:var(--danger)]">
            <LogOut size={13} /> دەرچوون لە پانێڵ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[268px] shrink-0 border-l border-line/70 bg-[color:var(--bg)]/55 p-4 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[286px] border-l border-line bg-[color:var(--bg-elev)] p-4 shadow-2xl">
            <button
              type="button"
              className="icon-btn absolute left-3 top-3"
              onClick={() => setMobileOpen(false)}
              aria-label="داخستن"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 border-b border-line/70 bg-[color:var(--bg)]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="icon-btn lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="مێنیو"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            </Link>
            <div className="hidden min-w-0 flex-1 sm:block">
              <h1 className="truncate text-sm font-black text-ink">{meta.title}</h1>
              <p className="mt-0.5 truncate text-[10px] text-muted">{meta.subtitle}</p>
            </div>
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-bold text-emerald-300 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-emerald-400" />
                سێرڤەر چالاکە
              </span>

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  className={cn('icon-btn relative', notificationsOpen && 'bg-[color:var(--surface-2)] text-ink')}
                  onClick={() => setNotificationsOpen((value) => !value)}
                  aria-label="ئاگادارکردنەوەکان"
                >
                  <Bell size={19} />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-[color:var(--danger)] px-1 text-[9px] font-black leading-[17px] text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="panel absolute left-0 top-11 z-[70] w-[min(92vw,380px)] overflow-hidden rounded-2xl">
                    <header className="flex items-center justify-between border-b border-line px-4 py-3">
                      <div>
                        <h3 className="text-xs font-extrabold text-ink">ئاگادارکردنەوەکان</h3>
                        <p className="mt-0.5 text-[9px] text-muted">
                          {counts.total ? `${counts.total} کارێک چاوەڕوانی پشکنینە` : 'هەموو شتێک چارەسەر کراوە'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {unread > 0 && (
                          <button type="button" onClick={() => void handleMarkAll()} className="btn-ghost !px-2 !py-1 !text-[9px]">
                            <CheckCheck size={12} /> خوێندنەوە
                          </button>
                        )}
                        <button type="button" onClick={() => void reload()} className="btn-ghost !px-2 !py-1 !text-[9px]">
                          نوێکردنەوە
                        </button>
                      </div>
                    </header>
                    <div className="admin-scroll max-h-[60vh] overflow-y-auto p-2">
                      {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-[10px] text-muted">
                          <span className="me-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
                          بار دەکرێت…
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted">
                          <BellOff size={24} />
                          <p className="text-[10px]">هێشتا ئاگادارکردنەوەیەک نییە.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void openNotification(item)}
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-right transition-colors hover:bg-[color:var(--surface-2)]',
                              !item.readAt && 'bg-[color:var(--primary)]/[0.05]',
                            )}
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--primary)]">
                              {item.type === 'PRO' ? (
                                <Crown size={14} className="text-[color:var(--accent)]" />
                              ) : item.type === 'REPORT' ? (
                                <Flag size={14} className="text-orange-300" />
                              ) : (
                                <ShieldCheck size={14} className="text-amber-300" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[11px] font-extrabold text-ink">{item.title}</span>
                                {!item.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" />}
                              </span>
                              <span className="mt-0.5 block line-clamp-2 text-[9px] leading-4 text-muted">{item.body}</span>
                              <span className="mt-1 block text-[8px] text-muted-2">{timeAgo(item.createdAt)}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <footer className="border-t border-line p-2">
                      <Link to="/" className="menu-item !justify-center !py-1.5 !text-[10px]">
                        <Inbox size={13} /> سەرجەم کارەکان
                      </Link>
                    </footer>
                  </div>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="rounded-full ring-2 ring-transparent transition-all hover:ring-[color:var(--border-strong)]"
                  aria-label="لیستی بەڕێوەبەر"
                >
                  <Avatar user={user} size={34} />
                </button>
                {menuOpen && (
                  <div className="panel absolute left-0 top-11 z-[70] w-[250px] rounded-2xl p-2">
                    <div className="flex items-center gap-2.5 rounded-xl p-2.5">
                      <Avatar user={user} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-extrabold text-ink">{user.name}</p>
                        <p className="mt-0.5 truncate text-[9px] text-muted">{user.email || user.phone || `@${user.username}`}</p>
                      </div>
                      <ChevronLeft size={14} className="ms-auto text-muted" />
                    </div>
                    <div className="divider my-1" />
                    <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="menu-item">
                      <ExternalLink size={14} /> ئەپی کۆمەڵایەتی
                    </a>
                    <button type="button" onClick={() => void logout()} className="menu-item !text-[color:var(--danger)]">
                      <LogOut size={14} /> دەرچوون
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-3 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
