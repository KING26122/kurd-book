import { Component, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ScreenLoader, Toaster } from '@/components/ui';
import { bootstrapAdminSession } from '@/lib/api';
import { useAdminAuthStore } from '@/stores/auth';
import { AdminLoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { UsersPage } from '@/pages/Users';
import { VerificationsPage } from '@/pages/Verifications';
import { ProRequestsPage } from '@/pages/ProRequests';
import { ReportsPage } from '@/pages/Reports';
import { AdminNotFoundPage } from '@/pages/NotFound';

let bootPromise: Promise<boolean> | null = null;

function useBootstrap() {
  useEffect(() => {
    if (!bootPromise) bootPromise = bootstrapAdminSession();
  }, []);
}

function RequireAdmin() {
  const user = useAdminAuthStore((state) => state.user);
  const ready = useAdminAuthStore((state) => state.ready);

  if (!ready) return <ScreenLoader label="دۆخی چوونەژوورەوە دەپشکنرێت…" />;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const user = useAdminAuthStore((state) => state.user);
  const ready = useAdminAuthStore((state) => state.ready);

  if (!ready) return <ScreenLoader label="دۆخی چوونەژوورەوە دەپشکنرێت…" />;
  if (user?.role === 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[Kurd Book Admin] UI error:', error, info.componentStack);
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--danger-soft)] text-[color:var(--danger)]">
            <ShieldAlert size={26} />
          </div>
          <h1 className="mt-5 text-lg font-black text-ink">هەڵەیەک لە پانێڵەکەدا ڕوویدا</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            شتێکی نەخوازراو ڕوویدا. داتاکان پارێزراون؛ تکایە پەڕەکە نوێ بکەرەوە یان بگەڕێوە بۆ داشبۆرد.
          </p>
          <p
            className="mt-3 max-h-24 overflow-auto rounded-xl bg-[color:var(--surface-2)] p-2 text-left text-[10px] leading-5 text-muted-2"
            dir="ltr"
          >
            {this.state.error.message}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> نوێکردنەوەی پەڕە
            </button>
            <a href="/" className="btn-soft">
              گەڕانەوە بۆ داشبۆرد
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  useBootstrap();

  return (
    <AdminErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<AdminLoginPage />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/verifications" element={<VerificationsPage />} />
              <Route path="/pro" element={<ProRequestsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="*" element={<AdminNotFoundPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AdminErrorBoundary>
  );
}
