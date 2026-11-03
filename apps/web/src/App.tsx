import { Component, useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Toaster, ScreenLoader } from '@/components/ui';
import { bootstrapSession } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { applyTheme, useThemeStore } from '@/stores/theme';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/pages/Auth';
import { FeedPage } from '@/pages/Feed';
import { ExplorePage } from '@/pages/Explore';
import { FriendsPage } from '@/pages/Friends';
import { MessagesPage } from '@/pages/Messages';
import { LivePage, LiveRoomPage } from '@/pages/Live';
import { StoriesPage } from '@/pages/Stories';
import { ProfilePage } from '@/pages/Profile';
import { SettingsPage } from '@/pages/Settings';
import { VerificationPage } from '@/pages/Verification';
import { ProPage } from '@/pages/Pro';
import { NotificationsPage } from '@/pages/Notifications';
import { NotFoundPage } from '@/pages/NotFound';

let bootPromise: Promise<boolean> | null = null;

function useBootstrap() {
  useEffect(() => {
    if (!bootPromise) bootPromise = bootstrapSession();
  }, []);
}

function RequireAuth() {
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);
  const location = useLocation();

  if (!ready) return <ScreenLoader />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: from === '/login' ? '/' : from }} />;
  }
  return <Outlet />;
}

function PublicOnly() {
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);

  if (!ready) return <ScreenLoader label="دۆخی چوونەژوورەوە دەپشکنرێت…" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function MyProfileRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={user ? `/u/${encodeURIComponent(user.username)}` : '/'} replace />;
}

function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[Kurd Book] UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-3xl"
          style={{ backgroundImage: 'var(--gradient)' }}
        />
        <div className="panel relative w-full max-w-lg rounded-[2rem] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
            <Home size={26} />
          </div>
          <h1 className="mt-5 text-lg font-black text-ink">بەداخەوە هەڵەیەک ڕوویدا</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            شتێکی نەخوازراو لە ڕووکارەکەدا ڕوویدا. داتاکانت پارێزراون؛ تکایە پەڕەکە نوێ بکەرەوە.
          </p>
          <p className="mt-3 max-h-24 overflow-auto rounded-xl bg-[color:var(--surface-2)] p-2 text-left text-[10px] leading-5 text-muted-2" dir="ltr">
            {this.state.error.message}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> نوێکردنەوەی پەڕە
            </button>
            <a href="/" className="btn-soft">گەڕانەوە بۆ ماڵەوە</a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  useBootstrap();

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeSync />
        <ScrollToTop />
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<FeedPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:id" element={<MessagesPage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/live/:id" element={<LiveRoomPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/u/:username" element={<ProfilePage />} />
              <Route path="/profile" element={<MyProfileRedirect />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/pro" element={<ProPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
