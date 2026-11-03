import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
} from 'lucide-react';
import { api, ApiError, setSession } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import { Alert, Spinner } from '@/components/ui';
import type { AuthPayload } from '@/types';

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-[color:var(--surface-solid)]/70 shadow-2xl backdrop-blur-2xl lg:grid-cols-[1.05fr_1.2fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-line p-9 lg:flex">
          <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color:var(--primary)]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
          <div>
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-12 w-12 rounded-2xl shadow-glow" />
              <div>
                <p className="font-display text-2xl font-black text-ink">کورد بووک</p>
                <p className="text-[10px] tracking-widest text-muted">KURD BOOK</p>
              </div>
            </Link>
            <h2 className="mt-10 font-display text-3xl font-black leading-[1.5] text-ink">
              کوردستان،
              <br />
              لە یەک تۆڕدا.
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-7 text-muted">
              پۆست، ستۆری، چاتی ئێندۆ-ئێندۆ پارێزراو، لایڤ و شاشە هاوبەشکردن — هەموو بە زمانی کوردی.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Lock, title: 'چاتی پارێزراو', body: 'تەنها تۆ و ئەو کەسە نامەکان دەبینن. سێرڤەر تەنها نوسخەی شێفڕەکراو هەڵدەگرێت.' },
              { icon: Radio, title: 'لایڤ و شاشە', body: 'لایڤی 1080p و شاشە هاوبەشکردن بۆ ئەندامانی Pro.' },
              { icon: Crown, title: 'تاج و ئەڵماس', body: 'پشتڕاستکردنەوە بە ناسنامەی نیشتمانی، نیشانەی تاجی ئاڵتوونی.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-[color:var(--surface-2)] text-[color:var(--primary)]">
                  <item.icon size={16} />
                </span>
                <div>
                  <p className="text-xs font-extrabold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-5 text-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-2">بە خۆشەویستی بۆ کوردستان 🏔️ · کورد بووک © {new Date().getFullYear()}</p>
        </aside>

        <main className="p-6 sm:p-9">
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <img src="/logo.svg" alt="" className="h-10 w-10 rounded-xl" />
            <span className="font-display text-lg font-black text-ink">کورد بووک</span>
          </div>
          <h1 className="font-display text-2xl font-black text-ink">{title}</h1>
          <p className="mt-1.5 text-xs leading-6 text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-line pt-5">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input !pl-11"
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
        aria-label={visible ? 'شاردنەوەی وشەی نهێنی' : 'بینینی وشەی نهێنی'}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

function OtpDebug({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[10px] text-amber-100">
      <span className="flex items-center gap-1.5"><Wand2 size={13} /> کۆدی تاقیکردنەوە (دۆخی گەشەپێدان)</span>
      <button
        type="button"
        onClick={() => { void navigator.clipboard.writeText(code); toast('کۆد کۆپی کرا.', 'success'); }}
        className="rounded-lg bg-amber-400/20 px-2 py-1 font-mono text-xs font-black tracking-[0.25em]"
      >
        {code}
      </button>
    </div>
  );
}

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<{ challenge: string } | null>(null);
  const [code, setCode] = useState('');
  const [needsVerify, setNeedsVerify] = useState<{ channel: 'email' | 'phone'; identifier: string; debugCode?: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const setSessionStore = useAuthStore((state) => state.setSession);

  const from = (location.state as { from?: string } | null)?.from || '/';

  const finish = (payload: AuthPayload) => {
    setSessionStore(payload);
    setSession(payload);
    navigate(from, { replace: true });
    toast(`بەخێربێیتەوە، ${payload.user.name}! 👋`, 'success');
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<AuthPayload | { twoFactorRequired: true; challenge: string }>('/api/auth/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
        noAuth: true,
      });
      if ('twoFactorRequired' in data) {
        setTwoFactor({ challenge: data.challenge });
        toast('کۆدی 2FA لە ئەپی ئەوثەنتیکەیتەر بنووسە.', 'info');
        return;
      }
      finish(data);
    } catch (loginError) {
      if (loginError instanceof ApiError && loginError.code === 'EMAIL_NOT_VERIFIED') {
        const details = loginError.details as { channel?: 'email' | 'phone'; identifier?: string } | undefined;
        if (details?.channel && details.identifier) {
          setNeedsVerify({ channel: details.channel, identifier: details.identifier });
          setError('سەرەتا ئیمەیڵ/مۆبایلەکەت پشتڕاست بکەوە.');
          void resendOtp(details.channel, details.identifier);
          return;
        }
      }
      setError(errorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  const verifyLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFactor) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await api<AuthPayload>('/api/auth/2fa/verify-login', {
        method: 'POST',
        body: { challenge: twoFactor.challenge, code: code.trim() },
        noAuth: true,
      });
      finish(payload);
    } catch (verifyError) {
      setError(errorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async (channel: 'email' | 'phone', target: string) => {
    try {
      const data = await api<{ debugCode?: string }>('/api/auth/resend-otp', {
        method: 'POST',
        body: { channel, identifier: target, purpose: 'REGISTER' },
        noAuth: true,
      });
      setNeedsVerify((current) => (current ? { ...current, debugCode: data.debugCode } : current));
      toast('کۆدی نوێ نێردرا.', 'success');
    } catch (resendError) {
      toast(errorMessage(resendError), 'error');
    }
  };

  const verifyAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!needsVerify) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await api<AuthPayload>('/api/auth/verify-register', {
        method: 'POST',
        body: { channel: needsVerify.channel, identifier: needsVerify.identifier, code: verifyCode.trim() },
        noAuth: true,
      });
      finish(payload);
    } catch (verifyError) {
      setError(errorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  };

  if (twoFactor) {
    return (
      <AuthShell title="پشتڕاستکردنەوەی دوو هەنگاو" subtitle="کۆدی ٦ ژمارەیی لە ئەپی ئەوثەنتیکەیتەر (Google Authenticator / Authy) بنووسە.">
        <form onSubmit={verifyLogin} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex items-center justify-center rounded-3xl border border-line bg-[color:var(--surface-2)] py-7">
            <ShieldCheck size={40} className="text-[color:var(--primary)]" />
          </div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="— — — — — —"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="input text-center font-mono text-2xl tracking-[0.55em]"
            maxLength={6}
          />
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy || code.length < 6}>
            {busy ? <Spinner size={17} /> : <KeyRound size={17} />} پشتڕاستکردنەوە
          </button>
          <button type="button" className="btn-ghost w-full !text-xs" onClick={() => { setTwoFactor(null); setCode(''); setError(null); }}>
            گەڕانەوە بۆ چوونەژوورەوە
          </button>
        </form>
      </AuthShell>
    );
  }

  if (needsVerify) {
    return (
      <AuthShell
        title="پشتڕاستکردنەوەی هەژمار"
        subtitle={`کۆدی ٦ ژمارەیی بۆ ${needsVerify.identifier} نێردرا. کۆدەکە ٥ خولەک کارا دەبێت.`}
      >
        <form onSubmit={verifyAccount} className="space-y-4">
          {error && <Alert kind="warning">{error}</Alert>}
          <OtpDebug code={needsVerify.debugCode} />
          <input
            value={verifyCode}
            onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="— — — — — —"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="input text-center font-mono text-2xl tracking-[0.55em]"
            maxLength={6}
          />
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy || verifyCode.length < 6}>
            {busy ? <Spinner size={17} /> : <CheckCircle2 size={17} />} پشتڕاستکردنەوە و چوونەژوورەوە
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-soft flex-1 !text-xs" onClick={() => void resendOtp(needsVerify.channel, needsVerify.identifier)}>
              دووبارە ناردنەوە
            </button>
            <button type="button" className="btn-ghost flex-1 !text-xs" onClick={() => { setNeedsVerify(null); setVerifyCode(''); setError(null); }}>
              گەڕانەوە
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="بەخێربێیتەوە"
      subtitle="بچۆ ژوورەوە بۆ ئەوەی لەگەڵ هاوڕێکانت بمێنیت."
      footer={
        <p className="text-center text-xs text-muted">
          هەژمارت نییە؟{' '}
          <Link to="/register" className="font-extrabold text-[color:var(--primary)] hover:underline">
            هەژمارێک دروست بکە
          </Link>
        </p>
      }
    >
      <form onSubmit={login} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label" htmlFor="identifier">ئیمەیڵ یان ژمارەی مۆبایل</label>
          <input
            id="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="demo@kurdbook.app یان 0750…"
            className="input"
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">وشەی نهێنی</label>
            <Link to="/forgot-password" className="mb-2 text-[10px] font-bold text-[color:var(--primary)] hover:underline">
              لەبیرت چووە؟
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
          {busy ? <Spinner size={17} /> : <ArrowLeft size={17} />} چوونەژوورەوە
        </button>

        {import.meta.env.DEV && (
          <div className="rounded-2xl border border-dashed border-line bg-[color:var(--surface-2)]/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-muted"><Sparkles size={12} /> هەژماری نموونە بۆ تاقیکردنەوە</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-line bg-[color:var(--surface-solid)] px-3 py-2 text-right text-[10px] hover:border-[color:var(--primary)]/50"
                onClick={() => { setIdentifier('demo@kurdbook.app'); setPassword('Demo1234!'); }}
              >
                <span className="block font-bold text-ink">بەکارهێنەری نموونە</span>
                <span className="text-muted">demo@kurdbook.app</span>
              </button>
              <button
                type="button"
                className="rounded-xl border border-line bg-[color:var(--surface-solid)] px-3 py-2 text-right text-[10px] hover:border-[color:var(--primary)]/50"
                onClick={() => { setIdentifier('admin@kurdbook.app'); setPassword('Admin1234!'); }}
              >
                <span className="block font-bold text-ink">بەڕێوەبەر</span>
                <span className="text-muted">admin@kurdbook.app</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [channel, setChannel] = useState<'email' | 'phone'>(searchParams.get('channel') === 'phone' ? 'phone' : 'email');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [pending, setPending] = useState<{ channel: 'email' | 'phone'; identifier: string; debugCode?: string } | null>(null);
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const setSessionStore = useAuthStore((state) => state.setSession);

  useEffect(() => {
    if (password && confirm && password !== confirm) {
      setError('وشەکانی نهێنی وەک یەک نین.');
    } else if (error === 'وشەکانی نهێنی وەک یەک نین.') {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, confirm]);

  const strength = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(password) ? 1 : 0) +
      (/[0-9]/.test(password) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 1 : 0),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('وشەکانی نهێنی وەک یەک نین.');
      return;
    }
    if (!consent) {
      setError('تکایە مەرجەکانی بەکارهێنان بپەسەندە.');
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ channel: 'email' | 'phone'; identifier: string; debugCode?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: {
            name: name.trim(),
            username: username.trim().toLowerCase(),
            channel,
            identifier: identifier.trim(),
            password,
          },
          noAuth: true,
        },
      );
      setPending({ channel: data.channel, identifier: data.identifier, debugCode: data.debugCode });
      setStep('otp');
      toast('کۆدی پشتڕاستکردنەوە نێردرا.', 'success');
    } catch (registerError) {
      setError(errorMessage(registerError));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await api<AuthPayload>('/api/auth/verify-register', {
        method: 'POST',
        body: { channel: pending.channel, identifier: pending.identifier, code: otp.trim() },
        noAuth: true,
      });
      setSessionStore(payload);
      setSession(payload);
      navigate('/', { replace: true });
      toast('بەخێربێیت بۆ کورد بووک! 🎉', 'success');
    } catch (verifyError) {
      setError(errorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!pending) return;
    try {
      const data = await api<{ debugCode?: string }>('/api/auth/resend-otp', {
        method: 'POST',
        body: { channel: pending.channel, identifier: pending.identifier, purpose: 'REGISTER' },
        noAuth: true,
      });
      setPending({ ...pending, debugCode: data.debugCode });
      toast('کۆدی نوێ نێردرا.', 'success');
    } catch (resendError) {
      toast(errorMessage(resendError), 'error');
    }
  };

  if (step === 'otp' && pending) {
    return (
      <AuthShell
        title="پشتڕاستکردنەوەی هەژمار"
        subtitle={`کۆدی ٦ ژمارەیی بۆ ${pending.identifier} نێردرا. کۆدەکە ٥ خولەک کارا دەبێت.`}
        footer={
          <p className="text-center text-[10px] leading-5 text-muted">
            هیچ کۆدێک نەگەیشت؟ سندوقی سپام بپشکنە یان دووبارە ناردنەوە هەوڵ بدە.
          </p>
        }
      >
        <form onSubmit={verify} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <OtpDebug code={pending.debugCode} />
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="— — — — — —"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="input text-center font-mono text-2xl tracking-[0.55em]"
            maxLength={6}
          />
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy || otp.length < 6}>
            {busy ? <Spinner size={17} /> : <CheckCircle2 size={17} />} دروستکردنی هەژمار
          </button>
          <button type="button" className="btn-soft w-full !text-xs" onClick={() => void resend()}>
            دووبارە ناردنی کۆد
          </button>
          <button type="button" className="btn-ghost w-full !text-xs" onClick={() => { setStep('form'); setOtp(''); setError(null); }}>
            گەڕانەوە و دەستکاری زانیارییەکان
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="هەژمارێکی نوێ دروست بکە"
      subtitle="بە ئیمەیڵ یان ژمارەی مۆبایل — کۆدی پشتڕاستکردنەوە دەنێردرێت."
      footer={
        <p className="text-center text-xs text-muted">
          هەژمارت هەیە؟{' '}
          <Link to="/login" className="font-extrabold text-[color:var(--primary)] hover:underline">
            بچۆ ژوورەوە
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line p-1">
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors ${channel === 'email' ? 'bg-[color:var(--surface-2)] text-ink' : 'text-muted'}`}
          >
            <Mail size={14} /> ئیمەیڵ
          </button>
          <button
            type="button"
            onClick={() => setChannel('phone')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors ${channel === 'phone' ? 'bg-[color:var(--surface-2)] text-ink' : 'text-muted'}`}
          >
            <Phone size={14} /> مۆبایل
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">ناوی تەواو</label>
            <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="ناوی تەواوت" className="input" autoComplete="name" required minLength={2} maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="username">ناوی بەکارهێنەر</label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                placeholder="kurdi_2026"
                className="input !pr-8"
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                dir="ltr"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="identifier">{channel === 'email' ? 'ئیمەیڵ' : 'ژمارەی مۆبایل'}</label>
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              {channel === 'email' ? <Mail size={16} /> : <Phone size={16} />}
            </span>
            {channel === 'phone' && <span className="absolute right-10 top-1/2 -translate-y-1/2 border-e border-line pe-2 text-xs text-muted" dir="ltr">+964</span>}
            <input
              id="identifier"
              type={channel === 'email' ? 'email' : 'tel'}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={channel === 'email' ? 'you@example.com' : '0750 123 4567'}
              className={`input ${channel === 'phone' ? '!pr-[6.5rem]' : '!pr-11'}`}
              autoComplete={channel === 'email' ? 'email' : 'tel'}
              required
              dir="ltr"
            />
          </div>
          {channel === 'phone' && <p className="mt-1.5 text-[10px] text-muted-2">بۆ نموونە ٠٧٥٠١٢٣٤٥٦٧ — سیستەم خۆی +964 زیاد دەکات.</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">وشەی نهێنی</label>
            <PasswordInput id="password" value={password} onChange={setPassword} placeholder="لانیکەم ٨ پیت" autoComplete="new-password" />
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? (strength >= 3 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-[color:var(--surface-3)]'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="confirm">دووپاتکردنەوە</label>
            <PasswordInput id="confirm" value={confirm} onChange={setConfirm} placeholder="دووبارە بنووسە" autoComplete="new-password" />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-5 text-muted">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[color:var(--primary)]" />
          <span>مەرجەکانی بەکارهێنان و پاراستنی زانیاری پەسەند دەکەم. دەزانم کە چاتی ئێندۆ-ئێندۆ بە کلیلەکەم پارێزراوە و لەدەستدانی کلیل واتە لەدەستدانی چاتەکان.</span>
        </label>
        <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
          {busy ? <Spinner size={17} /> : <UserRound size={17} />} هەژمار دروست بکە
        </button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'ask' | 'reset'>('ask');
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'reset') window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ channel?: string; identifier?: string; debugCode?: string; message?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: { identifier: identifier.trim() }, noAuth: true },
      );
      setDebugCode(data.debugCode);
      if (data.channel === 'email' || data.channel === 'phone') {
        setStep('reset');
        toast('کۆدی گۆڕینی وشەی نهێنی نێردرا.', 'success');
      } else {
        toast('ئەگەر هەژمارەکە هەبێت، کۆدەکە نێردرا.', 'info');
        setStep('reset');
      }
    } catch (askError) {
      setError(errorMessage(askError));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { identifier: identifier.trim(), code: code.trim(), password },
        noAuth: true,
      });
      toast('وشەی نهێنی گۆڕدرا. بچۆ ژوورەوە.', 'success');
      navigate('/login', { replace: true });
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={step === 'ask' ? 'وشەی نهێنیت لەبیر چووە؟' : 'وشەی نهێنی نوێ'}
      subtitle={step === 'ask' ? 'ئیمەیڵ یان ژمارەی مۆبایلەکەت بنووسە، کۆدێک دەنێردرێت.' : `کۆدی ٦ ژمارەیی بۆ ${identifier} نێردرا.`}
      footer={
        <p className="text-center text-xs text-muted">
          <Link to="/login" className="font-extrabold text-[color:var(--primary)] hover:underline">
            گەڕانەوە بۆ چوونەژوورەوە
          </Link>
        </p>
      }
    >
      {step === 'ask' ? (
        <form onSubmit={ask} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <label className="label" htmlFor="forgot-identifier">ئیمەیڵ یان مۆبایل</label>
            <input
              id="forgot-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="input"
              placeholder="you@example.com یان 0750…"
              required
              autoFocus
              dir="ltr"
            />
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
            {busy ? <Spinner size={17} /> : <KeyRound size={17} />} ناردنی کۆد
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <OtpDebug code={debugCode} />
          <div>
            <label className="label" htmlFor="reset-code">کۆدی پشتڕاستکردنەوە</label>
            <input
              ref={inputRef}
              id="reset-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center font-mono text-xl tracking-[0.5em]"
              placeholder="— — — — — —"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reset-password">وشەی نهێنی نوێ</label>
            <PasswordInput id="reset-password" value={password} onChange={setPassword} placeholder="لانیکەم ٨ پیت" autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy || code.length < 6 || password.length < 8}>
            {busy ? <Spinner size={17} /> : <CheckCircle2 size={17} />} گۆڕینی وشەی نهێنی
          </button>
          <button type="button" className="btn-ghost w-full !text-xs" onClick={() => setStep('ask')}>
            گۆڕینی ئیمەیڵ/مۆبایل
          </button>
        </form>
      )}
    </AuthShell>
  );
}
