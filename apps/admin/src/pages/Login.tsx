import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Eye,
  EyeOff,
  Flag,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { adminLogin, adminVerify2FA } from '@/lib/api';
import { errorMessage, toast } from '@/stores/toast';
import { useAdminAuthStore } from '@/stores/auth';
import { Spinner } from '@/components/ui';
import type { AuthPayload } from '@/types';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const ready = useAdminAuthStore((state) => state.ready);
  const setSession = useAdminAuthStore((state) => state.setSession);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<{ challenge: string } | null>(null);
  const [code, setCode] = useState('');

  if (ready && user) return <Navigate to="/" replace />;

  const finish = (payload: AuthPayload) => {
    if (payload.user.role !== 'ADMIN') {
      setError('ئەم هەژمارە دەستگەیشتنی بەڕێوەبەر نییە.');
      return;
    }
    setSession(payload);
    toast(`بەخێربێیت، ${payload.user.name}.`, 'success');
    navigate('/', { replace: true });
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await adminLogin(identifier.trim(), password);
      if ('twoFactorRequired' in data) {
        setTwoFactor({ challenge: data.challenge });
        setCode('');
        toast('کۆدی 2FA لە ئەپی ئەوثەنتیکەیتەر بنووسە.', 'info');
        return;
      }
      finish(data);
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFactor) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await adminVerify2FA(twoFactor.challenge, code.trim());
      finish(payload);
    } catch (verifyError) {
      setError(errorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4 sm:p-8">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: 'var(--gradient)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-52 -left-40 h-[480px] w-[480px] rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: 'var(--accent)' }}
      />

      <div className="panel relative grid w-full max-w-[1020px] overflow-hidden rounded-[2rem] lg:grid-cols-[1.05fr_1fr]">
        {/* Brand side */}
        <aside className="relative hidden overflow-hidden border-l border-line bg-[color:var(--bg)]/60 p-8 lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
          <div className="relative flex items-center gap-3">
            <img src="/logo.svg" alt="Kurd Book" className="h-12 w-12 rounded-2xl shadow-glow" />
            <div>
              <p className="font-display text-xl font-black leading-none text-ink">کورد بووک</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-2">Admin Control Center</p>
            </div>
          </div>

          <div className="relative mt-12">
            <span className="chip !border-[color:var(--primary)]/25 !bg-[color:var(--primary)]/10 !text-[color:var(--primary)]">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-current" />
              تەنها بەڕێوەبەران
            </span>
            <h1 className="mt-4 text-3xl font-black leading-[1.5] text-ink">
              هەموو کورد بووک
              <br />
              <span className="aurora-text">لە یەک شوێن.</span>
            </h1>
            <p className="mt-3 max-w-sm text-[11px] leading-7 text-muted">
              بەکارهێنەران، پشتڕاستکردنەوەی ناسنامە، داواکارییەکانی Pro و ڕاپۆرتەکانی
              چات — بە شێوەیەکی پارێزراو و خێرا لێرە بەڕێوە ببە.
            </p>
          </div>

          <div className="relative mt-auto grid grid-cols-2 gap-2.5 pt-10">
            {[
              { icon: Users, title: 'بەکارهێنەران', text: 'گەڕان، ناچالاککردن و دەستگەیشتن' },
              { icon: ShieldCheck, title: 'پشتڕاستکردنەوە', text: 'ناسنامە، سێلفی و تاج' },
              { icon: Crown, title: 'Pro', text: 'پارەدان، پسووڵە و ئەندامێتی' },
              { icon: Flag, title: 'ڕاپۆرتەکان', text: 'بەڵگەی چات بە ڕەزامەندی' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-[color:var(--panel)]/70 p-3">
                <item.icon size={16} className="text-[color:var(--primary)]" />
                <p className="mt-2 text-[11px] font-extrabold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[9px] leading-4 text-muted">{item.text}</p>
              </div>
            ))}
          </div>

          <p className="relative mt-6 text-[9px] tracking-wide text-muted-2">
            بە خۆشەویستی بۆ کوردستان 🏔️ · KURD BOOK
          </p>
        </aside>

        {/* Form side */}
        <section className="relative p-6 sm:p-9">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <img src="/logo.svg" alt="" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-display text-base font-black text-ink">کورد بووک</p>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-2">Admin Control</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/[0.08] text-[color:var(--primary)]">
              {twoFactor ? <KeyRound size={22} /> : <LockKeyhole size={22} />}
            </span>
            <h2 className="mt-4 text-xl font-black text-ink">
              {twoFactor ? 'پشتڕاستکردنەوەی دوو هەنگاوی' : 'چوونەژوورەوەی بەڕێوەبەر'}
            </h2>
            <p className="mt-1.5 text-[11px] leading-6 text-muted">
              {twoFactor
                ? 'کۆدی ٦ ژمارەیی لە ئەپی ئەوثەنتیکەیتەر بنووسە بۆ تەواوکردنی چوونەژوورەوە.'
                : 'بە ئیمەیڵ یان ژمارەی مۆبایل و وشەی نهێنییەکەت بچۆ ژوورەوە.'}
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.08] px-3 py-2.5 text-[10px] leading-5 text-red-200">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {!twoFactor ? (
              <form onSubmit={(event) => void login(event)} className="mt-6 space-y-4">
                <label className="block">
                  <span className="label">ئیمەیڵ یان ژمارەی مۆبایل</span>
                  <span className="relative block">
                    <Mail size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" />
                    <input
                      className="admin-input !py-3 !pr-9 !text-sm"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="admin@kurdbook.app"
                      autoComplete="username"
                      dir="ltr"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="label">وشەی نهێنی</span>
                  <span className="relative block">
                    <LockKeyhole size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" />
                    <input
                      className="admin-input !py-3 !pl-10 !pr-9 !text-sm"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      dir="ltr"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-2 hover:text-ink"
                      aria-label={showPassword ? 'شاردنەوەی وشەی نهێنی' : 'پیشاندانی وشەی نهێنی'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn-primary w-full !rounded-xl !py-3 !text-sm"
                  disabled={busy || identifier.trim().length < 3 || !password}
                >
                  {busy ? <Spinner size={16} /> : <ShieldCheck size={16} />}
                  چوونەژوورەوە
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-line bg-[color:var(--bg)]/35 px-3 py-2.5 text-[9px] leading-5 text-muted">
                  <LockKeyhole size={13} className="shrink-0 text-[color:var(--primary)]" />
                  <span>دەستگەیشتنی بەڕێوەبەر تۆمار دەکرێت. تکایە وشەی نهێنی بە کەس مەدە.</span>
                </div>
              </form>
            ) : (
              <form onSubmit={(event) => void verify(event)} className="mt-6 space-y-4">
                <label className="block">
                  <span className="label">کۆدی 2FA</span>
                  <input
                    className="admin-input !py-3 text-center !text-lg !font-black tracking-[0.45em]"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    dir="ltr"
                    required
                  />
                </label>
                <button type="submit" className="btn-primary w-full !rounded-xl !py-3 !text-sm" disabled={busy || code.length < 6}>
                  {busy ? <Spinner size={16} /> : <KeyRound size={16} />}
                  پشتڕاستکردنەوە و چوونەژوورەوە
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full !text-[10px]"
                  onClick={() => {
                    setTwoFactor(null);
                    setCode('');
                    setError(null);
                  }}
                >
                  <ArrowLeft size={13} className="rotate-180" /> گەڕانەوە بۆ وشەی نهێنی
                </button>
              </form>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-[9px] text-muted-2">
              <span>© {new Date().getFullYear()} کورد بووک</span>
              <span className="flex items-center gap-1">
                <LockKeyhole size={10} /> TLS · HttpOnly · RBAC
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
