import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  Clapperboard,
  Compass,
  Crown,
  Home,
  LogOut,
  MessageCircle,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { logoutRequest, api } from '@/lib/api';
import { disconnectSocket, connectSocket, syncSocketToken, getSocket } from '@/lib/socket';
import { applyTheme } from '@/stores/theme';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/cn';
import { Avatar, CountBadge } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { ThemeMenu } from '@/components/ThemeMenu';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { SearchButton, SearchDialog } from '@/components/SearchDialog';
import { RightRail } from '@/components/RightRail';
import { errorMessage, toast } from '@/stores/toast';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
  end?: boolean;
}

export function Layout() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const theme = useThemeStore((state) => state.theme);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimer = useRef<number | null>(null);

  const showRail = location.pathname === '/' || location.pathname === '/explore';

  const refreshMe = useCallback(async () => {
    try {
      const data = await api<{ user: typeof user }>('/api/auth/me');
      if (data.user) useAuthStore.getState().setUser(data.user);
    } catch {
      // Session expiry is handled globally by the API client.
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket();
    syncSocketToken();

    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void refreshMe(), 700);
    };
    const onNotification = () => {
      const current = useAuthStore.getState().user;
      useAuthStore.getState().patchUser({
        unreadNotifications: (current?.unreadNotifications || 0) + 1,
      });
    };

    socket.on('conversation:update', scheduleRefresh);
    socket.on('message:new', scheduleRefresh);
    socket.on('notification:new', onNotification);
    // Fetch once per session so counts are accurate after reconnects.
    void refreshMe();
    const interval = window.setInterval(() => void refreshMe(), 90_000);

    return () => {
      socket.off('conversation:update', scheduleRefresh);
      socket.off('message:new', scheduleRefresh);
      socket.off('notification:new', onNotification);
      window.clearInterval(interval);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [accessToken, refreshMe]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    await logoutRequest();
    disconnectSocket();
    clear();
    navigate('/login', { replace: true });
    toast('بە سەرکەوتوویی دەرچوویت. بەخێربێیتەوە!', 'success');
  };

  if (!user) return null;

  const nav: NavItem[] = [
    { to: '/', label: 'ماڵەوە', icon: Home, end: true },
    { to: '/friends', label: 'هاوڕێیان', icon: Users, badge: user.pendingFriendRequests },
    { to: '/messages', label: 'چاتەکان', icon: MessageCircle, badge: user.unreadConversations },
    { to: '/live', label: 'لایڤ', icon: Radio },
    { to: '/stories', label: 'ستۆری', icon: Clapperboard },
    { to: '/explore', label: 'دۆزینەوە', icon: Compass },
    { to: '/notifications', label: 'ئاگادارکردنەوەکان', icon: Bell, badge: user.unreadNotifications },
  ];

  const bottomNav: NavItem[] = [
    { to: '/', label: 'ماڵەوە', icon: Home, end: true },
    { to: '/friends', label: 'هاوڕێیان', icon: Users, badge: user.pendingFriendRequests },
    { to: '/messages', label: 'چات', icon: MessageCircle, badge: user.unreadConversations },
    { to: '/live', label: 'لایڤ', icon: Radio },
    { to: '/stories', label: 'ستۆری', icon: Clapperboard },
    { to: `/u/${user.username}`, label: 'پرۆفایل', icon: UserIcon },
  ];

  return (
    <div className="relative z-10 min-h-dvh">
      <div className="app-frame min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col border-l border-line/60 bg-[color:var(--bg)]/35 p-4 backdrop-blur-sm lg:flex">
          <Link to="/" className="mb-5 flex items-center gap-3 px-2 py-2">
            <img src="/logo.svg" alt="Kurd Book" className="h-11 w-11 rounded-2xl shadow-glow" />
            <span>
              <span className="block font-display text-xl font-black leading-none text-ink">کورد بووک</span>
              <span className="mt-1 block text-[10px] font-medium tracking-wide text-muted">KURD BOOK · کوردستان</span>
            </span>
          </Link>

          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn('nav-link relative', isActive && 'nav-link-active')}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                <CountBadge count={item.badge || 0} />
              </NavLink>
            ))}
          </nav>

          <div className="my-3 divider" />

          <nav className="space-y-1">
            <NavLink
              to="/verification"
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
            >
              <ShieldCheck size={20} />
              <span className="flex-1">پشتڕاستکردنەوە</span>
              {user.verificationStatus === 'VERIFIED' && <span className="verified-crown"><Crown size={16} /></span>}
            </NavLink>
            <NavLink to="/pro" className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
              <Crown size={20} />
              <span className="flex-1">Pro</span>
              {user.isPro && <span className="chip pro-pill !px-2 !py-0.5 !text-[9px]">PRO</span>}
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}>
              <Settings size={20} />
              <span className="flex-1">ڕێکخستن</span>
            </NavLink>
          </nav>

          <div className="mt-auto space-y-3">
            <div className="panel-flat p-3">
              <Link to={`/u/${user.username}`} className="flex items-center gap-3">
                <Avatar user={user} size={42} showOnline />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-xs font-extrabold text-ink">{user.name}</span>
                    <UserBadges user={user} size={13} />
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">@{user.username}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="btn-ghost mt-2 w-full !justify-start !rounded-xl !px-2 !py-1.5 !text-[11px]"
              >
                <LogOut size={14} /> دەرچوون
              </button>
            </div>
            <p className="px-2 text-center text-[9px] leading-4 text-muted-2">
              بە خۆشەویستی بۆ کوردستان 🏔️
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-line/60 bg-[color:var(--bg)]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-2 px-3 sm:px-5">
              <Link to="/" className="flex items-center gap-2 lg:hidden">
                <img src="/logo.svg" alt="Kurd Book" className="h-9 w-9 rounded-xl" />
                <span className="font-display text-base font-black text-ink">کورد بووک</span>
              </Link>
              <div className="hidden flex-1 md:flex">
                <SearchButton onClick={() => setSearchOpen(true)} />
              </div>
              <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
                <button
                  type="button"
                  className="icon-btn md:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="گەڕان"
                >
                  <Search size={20} />
                </button>
                <ThemeMenu />
                <NotificationsPanel />
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((value) => !value)}
                    className="ms-1 rounded-full ring-2 ring-transparent transition-all hover:ring-[color:var(--border-strong)]"
                    aria-label="لیستی بەکارهێنەر"
                  >
                    <Avatar user={user} size={36} showOnline />
                  </button>
                  {menuOpen && (
                    <div className="panel absolute left-0 top-11 z-[70] w-[260px] overflow-hidden rounded-3xl p-2">
                      <Link to={`/u/${user.username}`} className="mb-1 flex items-center gap-3 rounded-2xl p-3 hover:bg-[color:var(--surface-2)]">
                        <Avatar user={user} size={42} showOnline />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="truncate text-xs font-extrabold text-ink">{user.name}</span>
                            <UserBadges user={user} size={12} />
                          </span>
                          <span className="block truncate text-[10px] text-muted">{user.email || user.phone || `@${user.username}`}</span>
                        </span>
                        <ChevronLeft size={15} className="text-muted" />
                      </Link>
                      <div className="divider my-1" />
                      <Link to={`/u/${user.username}`} className="menu-item"><UserIcon size={16} /> پرۆفایلی من</Link>
                      <Link to="/settings" className="menu-item"><Settings size={16} /> ڕێکخستن</Link>
                      <Link to="/verification" className="menu-item"><ShieldCheck size={16} /> پشتڕاستکردنەوە</Link>
                      <Link to="/pro" className="menu-item"><Crown size={16} /> Pro</Link>
                      {user.role === 'ADMIN' && (
                        <a href="http://localhost:5174" target="_blank" rel="noreferrer" className="menu-item">
                          <ShieldCheck size={16} /> پانێلی بەڕێوەبەر
                        </a>
                      )}
                      <div className="divider my-1" />
                      <button type="button" onClick={() => void logout()} className="menu-item menu-item-danger">
                        <LogOut size={16} /> دەرچوون
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div
            className={cn(
              'mx-auto flex w-full gap-5 px-0 sm:px-4',
              showRail ? 'max-w-[1160px]' : 'max-w-[820px]',
            )}
          >
            <main
              className={cn(
                'min-w-0 flex-1 pb-24 lg:pb-10',
                location.pathname.startsWith('/messages/')
                  ? 'pt-0 sm:pt-3'
                  : 'pt-3 sm:pt-5',
              )}
            >
              <Outlet />
            </main>
            {showRail && (
              <aside className="hidden w-[330px] shrink-0 pt-5 xl:block">
                <RightRail />
              </aside>
            )}
          </div>
        </div>
      </div>

      <nav className="mobile-safe-nav fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[color:var(--bg-elev)]/95 px-1 pt-1.5 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5 text-[9px] font-bold transition-colors',
                  isActive ? 'text-[color:var(--primary)]' : 'text-muted',
                )
              }
            >
              <span className="relative">
                <item.icon size={21} />
                <span className="absolute -right-2.5 -top-2">
                  <CountBadge count={item.badge || 0} />
                </span>
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
