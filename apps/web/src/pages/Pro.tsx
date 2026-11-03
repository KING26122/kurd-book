import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Gem,
  ImagePlus,
  Loader2,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatIQD } from '@/lib/format';
import { uploadFile } from '@/lib/upload';
import { errorMessage, toast } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { Alert, Modal, ProgressBar, SectionTitle, Spinner } from '@/components/ui';
import { ProCrownGem } from '@/components/Badges';
import type { CheckoutResult, ProPlan, ProRequest } from '@/types';

type ProviderId = 'FIB' | 'FASTPAY' | 'QICARD';
type ProviderMode = 'sandbox' | 'live' | 'manual' | 'unconfigured';

interface ProviderInfo {
  id: ProviderId;
  name: string;
  subtitle: string;
  mode: ProviderMode;
}

interface PlansPayload {
  plans: ProPlan[];
  mode: 'sandbox' | 'live';
  providers: Record<ProviderId, ProviderInfo>;
  pro: { active: boolean; expiresAt?: string | null };
  benefits: string[];
}

interface ProMePayload {
  pro: { active: boolean; expiresAt?: string | null };
  requests: ProRequest[];
}

const PROVIDER_COPY: Record<ProviderId, { icon: typeof Banknote; note: string }> = {
  FIB: { icon: QrCode, note: 'پارەدان بە کۆدی QR یان ئەپی FIB' },
  FASTPAY: { icon: Zap, note: 'پارەدان بە FastPay و ناردنی وەسڵ' },
  QICARD: { icon: Banknote, note: 'پارەدان بە QiCard و ناردنی وەسڵ' },
};

function planAmount(plan: ProPlan): string {
  return formatIQD(plan.amount);
}

export function ProPage() {
  const user = useAuthStore((state) => state.user);
  const patchUser = useAuthStore((state) => state.patchUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PlansPayload | null>(null);
  const [mine, setMine] = useState<ProMePayload | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [provider, setProvider] = useState<ProviderId>('FIB');
  const [receipt, setReceipt] = useState<{ file: File; preview: string | null; url: string | null; progress: number | null } | null>(null);
  const [receiptInputKey, setReceiptInputKey] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plans, mineData] = await Promise.all([
        api<PlansPayload>('/api/pro/plans'),
        api<ProMePayload>('/api/pro/me'),
      ]);
      setData(plans);
      setMine(mineData);
      setSelectedPlan(plans.pro.active ? 'YEARLY' : 'MONTHLY');
      if (plans.pro.active) patchUser({ isPro: true, proExpiresAt: plans.pro.expiresAt || undefined });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [patchUser]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('paid') !== '1') return;
    toast('دۆخی پارەدان نوێ کرایەوە. سوپاس!', 'info');
    const timer = window.setTimeout(() => void load(), 1500);
    searchParams.delete('paid');
    setSearchParams(searchParams, { replace: true });
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (receipt?.preview) URL.revokeObjectURL(receipt.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const checkPayment = async (paymentId: string, silent = false) => {
    try {
      const status = await api<{
        payment: { id: string; status: string } | null;
        requestStatus?: string;
        pro: { active: boolean; expiresAt?: string | null };
      }>(`/api/pro/payments/${paymentId}/status`);
      if (status.payment?.status === 'PAID' || status.pro.active) {
        stopPolling();
        patchUser({ isPro: true, proExpiresAt: status.pro.expiresAt || undefined });
        toast('تاج و ئەڵماسی Pro چالاک بوو! 👑💎', 'success');
        setCheckout(null);
        await load();
        return true;
      }
      if (status.payment?.status === 'FAILED') {
        stopPolling();
        toast('پارەدان سەرکەوتوو نەبوو.', 'error');
        await load();
        return true;
      }
      if (!silent) toast('هێشتا پارەدان نەگەیشتووە. کەمێک چاوەڕوان بە.', 'info');
    } catch (statusError) {
      if (!silent) toast(errorMessage(statusError), 'error');
    }
    return false;
  };

  const startPolling = (paymentId: string) => {
    stopPolling();
    setPolling(true);
    pollRef.current = window.setInterval(() => void checkPayment(paymentId, true), 4000);
  };

  const chooseReceipt = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast('وەسڵ دەبێت وێنە یان PDF بێت.', 'error');
      return;
    }
    if (receipt?.preview) URL.revokeObjectURL(receipt.preview);
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setReceipt({ file, preview, url: null, progress: 0 });
    try {
      const result = await uploadFile(file, 'receipt', (progress) =>
        setReceipt((current) => (current ? { ...current, progress } : current)),
      );
      setReceipt((current) => (current ? { ...current, url: result.url, progress: 100 } : current));
    } catch (uploadError) {
      setReceipt(null);
      toast(errorMessage(uploadError), 'error');
    }
  };

  const needsReceipt = data?.mode === 'live' && provider !== 'FIB';

  const checkoutNow = async () => {
    if (!data) return;
    if (needsReceipt && !receipt?.url) {
      toast('تکایە وەسڵی پارەدان باربکە.', 'error');
      return;
    }
    setCheckingOut(true);
    try {
      const result = await api<CheckoutResult>('/api/pro/checkout', {
        method: 'POST',
        body: {
          plan: selectedPlan,
          provider,
          ...(receipt?.url && provider !== 'FIB' ? { receiptUrl: receipt.url } : {}),
        },
      });
      setCheckout(result);
      if (result.mode === 'sandbox' && result.payment?.id) {
        toast('دۆخی تاقیکردنەوە: پارەدانەکە بە شێوەی نمونه تەواو بکە.', 'info');
      } else if (result.mode === 'live' && result.payment?.id) {
        startPolling(result.payment.id);
      } else {
        toast(result.message, 'success');
      }
      await load();
    } catch (checkoutError) {
      toast(errorMessage(checkoutError), 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const simulatePayment = async () => {
    if (!checkout?.payment?.id) return;
    setSimulating(true);
    try {
      await api(`/api/pro/payments/${checkout.payment.id}/simulate-paid`, { method: 'POST' });
      await checkPayment(checkout.payment.id, true);
    } catch (simulateError) {
      toast(errorMessage(simulateError), 'error');
    } finally {
      setSimulating(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('کۆپی کرا.', 'success');
    } catch {
      // clipboard not available
    }
  };

  const cancelRequest = async (request: ProRequest) => {
    if (!window.confirm('دڵنیایت داواکارییەکە هەڵدەوەشێنیتەوە؟')) return;
    try {
      await api(`/api/pro/requests/${request.id}/cancel`, { method: 'POST' });
      toast('داواکارییەکە هەڵوەشێنرایەوە.', 'success');
      await load();
    } catch (cancelError) {
      toast(errorMessage(cancelError), 'error');
    }
  };

  const active = data?.pro.active ?? false;
  const currentPlan = data?.plans.find((plan) => plan.id === selectedPlan);

  if (loading && !data) {
    return (
      <div className="panel flex min-h-[45vh] flex-col items-center justify-center gap-3">
        <Spinner size={25} className="text-[color:var(--accent)]" />
        <p className="text-xs text-muted">پلانەکانی Pro دەهێنرێن…</p>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-amber-300/25 p-5 sm:p-8">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="pro-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold">
              <ProCrownGem size={13} /> KURD BOOK PRO
            </span>
            <h1 className="mt-3 font-display text-2xl font-black text-ink sm:text-4xl">
              تاج و ئەڵماس، <span className="aurora-text">بۆ تۆ</span>
            </h1>
            <p className="mt-2 max-w-lg text-xs leading-7 text-muted">
              نیشانەی تاج و ئەڵماس، لایڤی 1080p، شاشە هاوبەشکردنی کوالیتی بەرز، دەنگی تایبەت و پشتگیری خێراتر.
            </p>
            {active && (
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 text-[11px] text-amber-100">
                <BadgeCheck size={15} /> Pro چالاکە
                {data?.pro.expiresAt && <span>— بەسەرچوون: {formatDate(data.pro.expiresAt)}</span>}
              </div>
            )}
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-[2rem] border border-amber-300/25 bg-[color:var(--surface-solid)]/60">
            <Crown size={48} className="verified-crown" />
          </div>
        </div>
      </section>

      {error && <Alert kind="error">{error} <button type="button" className="ms-2 font-bold underline" onClick={() => void load()}>هەوڵدانەوە</button></Alert>}

      <section className="panel p-4 sm:p-5">
        <SectionTitle title="پلان هەڵبژێرە" subtitle="هەر پلانێک تاج و ئەڵماس و هەموو تایبەتمەندییەکان دەگرێتەوە." />
        <div className="grid gap-3 sm:grid-cols-2">
          {data?.plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const saving = plan.id === 'YEARLY';
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative overflow-hidden rounded-3xl border p-4 text-right transition-all',
                  selected
                    ? 'border-[color:var(--accent)]/55 bg-[color:var(--accent)]/[0.07] shadow-glow'
                    : 'border-line bg-[color:var(--surface-2)]/30 hover:border-[color:var(--border-strong)]',
                )}
              >
                {saving && (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-extrabold text-emerald-300">
                    باشترین بژاردە
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', selected ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]' : 'bg-[color:var(--surface-2)] text-muted')}>
                    {plan.id === 'YEARLY' ? <Gem size={17} /> : <Crown size={17} />}
                  </span>
                  <span className="text-sm font-extrabold text-ink">{plan.label}</span>
                  {selected && <CheckCircle2 size={16} className="ms-auto text-[color:var(--accent)]" />}
                </div>
                <p className="mt-3 font-display text-2xl font-black text-ink">{planAmount(plan)}</p>
                <p className="mt-0.5 text-[10px] text-muted">بۆ {plan.days} ڕۆژ{plan.badge ? ` — ${plan.badge}` : ''}</p>
                <p className="mt-2 text-[10px] leading-5 text-muted">{plan.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel p-4 sm:p-5">
          <SectionTitle title="شێوازی پارەدان" subtitle={data?.mode === 'sandbox' ? 'ئێستا لە دۆخی تاقیکردنەوەدایت — هیچ پارەی ڕاستەقینە ناگیرێت.' : 'پارەدانەکەت بە سەلامەتی پشتڕاست دەکرێتەوە.'} />
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PROVIDER_COPY) as ProviderId[]).map((id) => {
              const providerInfo = data?.providers[id];
              const selected = provider === id;
              const info = PROVIDER_COPY[id];
              const disabled = providerInfo?.mode === 'unconfigured';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProvider(id)}
                  disabled={disabled}
                  className={cn(
                    'rounded-2xl border p-3 text-right transition-all disabled:opacity-50',
                    selected ? 'border-[color:var(--primary)]/45 bg-[color:var(--primary)]/[0.07]' : 'border-line bg-[color:var(--surface-2)]/30 hover:border-[color:var(--border-strong)]',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', selected ? 'bg-[color:var(--primary)]/15 text-[color:var(--primary)]' : 'bg-[color:var(--surface-2)] text-muted')}>
                      <info.icon size={17} />
                    </span>
                    {providerInfo?.mode === 'sandbox' && <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-200">TEST</span>}
                    {providerInfo?.mode === 'manual' && <span className="rounded-full bg-sky-400/10 px-1.5 py-0.5 text-[8px] font-bold text-sky-200">MANUAL</span>}
                  </span>
                  <span className="mt-2 block text-xs font-extrabold text-ink">{providerInfo?.name || id}</span>
                  <span className="mt-0.5 block text-[9px] leading-4 text-muted">{info.note}</span>
                </button>
              );
            })}
          </div>

          {needsReceipt && (
            <div className="mt-4 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-ink"><ReceiptText size={14} className="text-[color:var(--primary)]" /> بارکردنی وەسڵی پارەدان</p>
              <p className="mt-1 text-[10px] leading-5 text-muted">
                بڕی {currentPlan ? planAmount(currentPlan) : ''} بگوازەوە بۆ هەژماری {provider === 'FASTPAY' ? 'FastPay' : 'QiCard'}، پاشان وێنەی وەسڵەکە باربکە. بەڕێوەبەر دوای پشکنین Pro چالاک دەکات.
              </p>
              <input
                key={receiptInputKey}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                id="pro-receipt"
                onChange={(event) => void chooseReceipt(event.target.files?.[0] || null)}
              />
              <label htmlFor="pro-receipt" className="btn-soft mt-3 cursor-pointer !rounded-xl !px-3 !py-2 !text-[11px]">
                <ImagePlus size={14} /> {receipt?.url ? 'گۆڕینی وەسڵ' : 'هەڵبژاردنی وەسڵ'}
              </label>
              {receipt && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-2">
                  {receipt.preview ? (
                    <img src={receipt.preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-muted"><ReceiptText size={18} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-ink">{receipt.file.name}</p>
                    {receipt.progress !== null && receipt.progress < 100 ? (
                      <div className="mt-1"><ProgressBar value={receipt.progress} /><p className="mt-1 text-[9px] text-muted">{receipt.progress}%</p></div>
                    ) : (
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] text-[color:var(--success)]"><CheckCircle2 size={10} /> بارکرا</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (receipt.preview) URL.revokeObjectURL(receipt.preview);
                      setReceipt(null);
                      setReceiptInputKey((value) => value + 1);
                    }}
                    className="text-muted hover:text-danger"
                    aria-label="سڕینەوە"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn-primary mt-4 w-full !py-3" onClick={() => void checkoutNow()} disabled={checkingOut || (needsReceipt && !receipt?.url)}>
            {checkingOut ? <Spinner size={16} /> : <Crown size={16} />} تەواوکردنی کڕین — {currentPlan ? planAmount(currentPlan) : ''}
          </button>
          <p className="mt-2 text-center text-[9px] leading-5 text-muted-2">
            بە کلیککردن ڕەزامەندیت بۆ مەرجەکانی Pro دەردەبڕیت. پارەدان بە سەلامەتی لەلایەن FIB / FastPay / QiCard پشتڕاست دەکرێتەوە.
          </p>
        </section>

        <section className="space-y-3">
          <div className="panel p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink"><Sparkles size={14} className="text-[color:var(--accent)]" /> تایبەتمەندییەکان</p>
            <ul className="mt-3 space-y-2">
              {(data?.benefits || []).map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-[10px] leading-5 text-muted">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[color:var(--success)]" /> {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink"><ShieldCheck size={14} className="text-[color:var(--primary)]" /> پارەدانی سەلامەت</p>
            <p className="mt-2 text-[10px] leading-5 text-muted">
              زانیارییەکانی پارەدان لەلایەن کۆمپانیاکانی پارەدان پشتڕاست دەکرێنەوە. کورد بووک هیچ زانیارییەکی کارتی تۆ هەڵنەدەگرێت.
            </p>
          </div>
        </section>
      </div>

      <section className="panel p-4 sm:p-5">
        <SectionTitle
          title="داواکارییەکانی من"
          subtitle="دۆخی کڕین و وەسڵەکان"
          action={<button type="button" className="btn-ghost !rounded-xl !px-2 !py-1 !text-[11px]" onClick={() => void load()}><RefreshCw size={13} /> نوێکردنەوە</button>}
        />
        {!mine || mine.requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-[11px] text-muted">
            هێشتا داواکارییەکی Pro نییە. یەکەم پلانت هەڵبژێرە و دەست پێبکە.
          </div>
        ) : (
          <div className="space-y-2">
            {mine.requests.map((request) => (
              <ProRequestRow key={request.id} request={request} onCancel={request.status === 'PENDING' ? () => void cancelRequest(request) : undefined} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(checkout)}
        onClose={() => {
          stopPolling();
          setCheckout(null);
        }}
        title="تەواوکردنی پارەدان"
        subtitle={checkout?.message}
        size="sm"
      >
        {checkout && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/35 p-4">
              <p className="text-[10px] text-muted">پلان</p>
              <p className="mt-0.5 text-sm font-extrabold text-ink">{checkout.proRequest.plan === 'YEARLY' ? 'ساڵانە' : 'مانگانە'} — {formatIQD(checkout.proRequest.amount)}</p>
              <p className="mt-1 text-[10px] text-muted">شێواز: {checkout.proRequest.provider}</p>
            </div>

            {checkout.mode === 'sandbox' && checkout.payment?.id && (
              <>
                <Alert kind="warning">
                  ئەمە پارەدانێکی تاقیکردنەوەیە. هیچ پارەی ڕاستەقینە ناگیرێت. کلیک لە خوارەوە بکە بۆ چالاککردنی Pro.
                </Alert>
                <button type="button" className="btn-primary w-full !py-3" onClick={() => void simulatePayment()} disabled={simulating}>
                  {simulating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} پارەدانی نمونه و چالاککردن
                </button>
                <button type="button" className="btn-soft w-full !text-[11px]" onClick={() => void checkPayment(checkout.payment!.id)}>
                  پشکنینی دۆخ
                </button>
              </>
            )}

            {checkout.mode === 'live' && checkout.fib && (
              <>
                <div className="flex flex-col items-center rounded-2xl border border-line p-4">
                  {checkout.fib.qrCode ? (
                    <img src={checkout.fib.qrCode} alt="FIB QR" className="h-48 w-48 rounded-xl bg-white p-2" />
                  ) : (
                    <QrCode size={80} className="text-muted" />
                  )}
                  {checkout.fib.readableCode && (
                    <button type="button" onClick={() => void copy(checkout.fib!.readableCode!)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-[color:var(--surface-2)] px-3 py-2 font-mono text-sm font-black tracking-wider text-ink">
                      {checkout.fib.readableCode} <Copy size={13} />
                    </button>
                  )}
                  {checkout.fib.validUntil && <p className="mt-2 text-[10px] text-muted">کارا تا {formatDateTime(checkout.fib.validUntil)}</p>}
                </div>
                <Alert kind="info">
                  بە ئەپی FIB کۆدەکە سکان بکە یان کۆپی بکە. دوای پارەدان، دۆخەکە خۆکارانە دەپشکنرێت.
                </Alert>
                <button type="button" className="btn-soft w-full !text-[11px]" onClick={() => checkout.payment?.id && void checkPayment(checkout.payment.id)} disabled={polling && false}>
                  {polling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} پشکنینی ئێستا
                </button>
              </>
            )}

            {checkout.mode === 'manual' && (
              <>
                <Alert kind="success">
                  وەسڵەکەت بە سەرکەوتوویی نێردرا. بەڕێوەبەر بەم زووانە پشکنین دەکات و Pro چالاک دەکات.
                </Alert>
                <button type="button" className="btn-soft w-full !text-[11px]" onClick={() => { setCheckout(null); void load(); }}>
                  بینینی داواکارییەکان
                </button>
              </>
            )}

            <button type="button" className="btn-ghost w-full !text-[11px]" onClick={() => { stopPolling(); setCheckout(null); }}>
              داخستن
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProRequestRow({ request, onCancel }: { request: ProRequest; onCancel?: () => void }) {
  const statusMap: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
    PENDING: { label: 'لە چاوەڕوانیدا', className: 'text-amber-200 bg-amber-400/10 border-amber-300/25', icon: Clock3 },
    APPROVED: { label: 'چالاککرا', className: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/25', icon: BadgeCheck },
    REJECTED: { label: 'ڕەتکرایەوە', className: 'text-red-200 bg-red-400/10 border-red-300/25', icon: XCircle },
    PAID: { label: 'دراوە', className: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/25', icon: CheckCircle2 },
  };
  const info = statusMap[request.status] || statusMap.PENDING!;
  const Icon = info.icon;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', info.className)}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold text-ink">
          Pro {request.plan === 'YEARLY' ? 'ساڵانە' : 'مانگانە'} — {formatIQD(request.amount)}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">{request.provider} · {formatDateTime(request.createdAt)}</p>
        {request.note && <p className="mt-0.5 text-[10px] text-muted-2">{request.note}</p>}
      </div>
      <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-extrabold', info.className)}>{info.label}</span>
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-[10px] font-bold text-muted hover:text-danger">هەڵوەشاندنەوە</button>
      )}
    </div>
  );
}
