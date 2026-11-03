import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Crown,
  FileCheck2,
  IdCard,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { uploadFile } from '@/lib/upload';
import { errorMessage, toast } from '@/stores/toast';
import { Alert, EmptyState, ProgressBar, SectionTitle, Spinner } from '@/components/ui';
import { PrivateImage } from '@/components/PrivateImage';
import type { VerificationRequest, VerificationState } from '@/types';

type UploadKind = 'front' | 'back' | 'selfie';

interface SlotState {
  file: File | null;
  preview: string | null;
  url: string | null;
  progress: number | null;
}

const SLOTS: Array<{
  kind: UploadKind;
  label: string;
  hint: string;
  icon: typeof IdCard;
  capture?: 'user' | 'environment';
}> = [
  {
    kind: 'front',
    label: 'ڕووی پێشەوەی ناسنامە',
    hint: 'وێنەیەکی ڕوون کە هەموو زانیارییەکان بخوێنرێنەوە.',
    icon: IdCard,
  },
  {
    kind: 'back',
    label: 'ڕووی دواوەی ناسنامە',
    hint: 'دڵنیابە لەوەی هیچ شتێک داپۆشراو نییە.',
    icon: FileCheck2,
  },
  {
    kind: 'selfie',
    label: 'سێڵفی بە ناسنامە',
    hint: 'سێڵفییەک لەگەڵ ناسنامەکەت لە دەستت.',
    icon: Camera,
    capture: 'user',
  },
];

const EMPTY_SLOTS: Record<UploadKind, SlotState> = {
  front: { file: null, preview: null, url: null, progress: null },
  back: { file: null, preview: null, url: null, progress: null },
  selfie: { file: null, preview: null, url: null, progress: null },
};

function statusLabel(status: VerificationState['status']): string {
  switch (status) {
    case 'VERIFIED':
      return 'پشتڕاستکراوە';
    case 'PENDING':
      return 'لە چاوەڕوانیدا';
    case 'REJECTED':
      return 'ڕەتکراوەتەوە';
    default:
      return 'هێشتا پشتڕاست نەکراوە';
  }
}

export function VerificationPage() {
  const [state, setState] = useState<VerificationState | null>(null);
  const [slots, setSlots] = useState<Record<UploadKind, SlotState>>(EMPTY_SLOTS);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<UploadKind, HTMLInputElement | null>>({
    front: null,
    back: null,
    selfie: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<VerificationState>('/api/verification');
      setState(data);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      Object.values(slots).forEach((slot) => {
        if (slot.preview) URL.revokeObjectURL(slot.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlot = (kind: UploadKind, patch: Partial<SlotState>) => {
    setSlots((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));
  };

  const chooseFile = async (kind: UploadKind, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('تکایە وێنەیەک هەڵبژێرە (JPG، PNG یان WebP).', 'error');
      return;
    }
    const previous = slots[kind].preview;
    if (previous) URL.revokeObjectURL(previous);
    const preview = URL.createObjectURL(file);
    setSlot(kind, { file, preview, progress: 0, url: null });
    try {
      const result = await uploadFile(file, 'verification', (percent) =>
        setSlot(kind, { progress: percent }),
      );
      setSlot(kind, { url: result.url, progress: 100 });
    } catch (uploadError) {
      setSlot(kind, { file: null, preview: null, url: null, progress: null });
      toast(errorMessage(uploadError), 'error');
    }
  };

  const removeFile = (kind: UploadKind) => {
    const slot = slots[kind];
    if (slot.preview) URL.revokeObjectURL(slot.preview);
    setSlots((current) => ({ ...current, [kind]: { ...EMPTY_SLOTS[kind] } }));
    const input = inputRefs.current[kind];
    if (input) input.value = '';
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) {
      toast('تکایە ڕەزامەندی بپەسەندە.', 'error');
      return;
    }
    const front = slots.front.url;
    const back = slots.back.url;
    const selfie = slots.selfie.url;
    if (!front || !back || !selfie) {
      toast('هەر سێ وێنەکە باربکە.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/verification', {
        method: 'POST',
        body: { frontUrl: front, backUrl: back, selfieUrl: selfie, consent: true },
      });
      toast('داواکارییەکەت نێردرا. بەم زووانە پشکنین دەکرێت. 👑', 'success');
      setSlots(EMPTY_SLOTS);
      setConsent(false);
      await load();
    } catch (submitError) {
      toast(errorMessage(submitError), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPending = async () => {
    if (!window.confirm('دڵنیایت داواکارییەکی چاوەڕوان هەڵدەوەشێنیتەوە؟')) return;
    setCancelling(true);
    try {
      await api('/api/verification/pending', { method: 'DELETE' });
      toast('داواکارییەکە هەڵوەشێنرایەوە.', 'success');
      await load();
    } catch (cancelError) {
      toast(errorMessage(cancelError), 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="panel flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Spinner size={24} className="text-[color:var(--primary)]" />
        <p className="text-xs text-muted">دۆخی پشتڕاستکردنەوە دەپشکنرێت…</p>
      </div>
    );
  }

  const status = state?.status || 'NONE';
  const pending = state?.requests.find((request) => request.status === 'PENDING');
  const history = state?.requests.filter((request) => request.status !== 'PENDING') || [];

  return (
    <div className="page-enter space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-line p-5 sm:p-7">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-400/10 text-amber-300">
              <Crown size={32} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[color:var(--accent)]">تاجی ئاڵتوونی</p>
              <h1 className="mt-1 font-display text-2xl font-black text-ink">پشتڕاستکردنەوەی ناسنامە</h1>
              <p className="mt-1.5 max-w-lg text-[11px] leading-6 text-muted">
                ناسنامەی نیشتمانی و سێڵفییەکەت بنێرە. دوای پشکنینی بەڕێوەبەر، تاجی ئاڵتوونی لە تەنیشت ناوەکەت دەردەکەوێت.
              </p>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold',
              status === 'VERIFIED' && 'border-amber-300/40 bg-amber-400/10 text-amber-200',
              status === 'PENDING' && 'border-sky-300/30 bg-sky-400/10 text-sky-200',
              status === 'REJECTED' && 'border-red-300/30 bg-red-400/10 text-red-200',
              status === 'NONE' && 'border-line bg-[color:var(--surface-2)] text-muted',
            )}
          >
            {status === 'VERIFIED' ? <BadgeCheck size={14} /> : status === 'PENDING' ? <Clock3 size={14} /> : status === 'REJECTED' ? <XCircle size={14} /> : <ShieldCheck size={14} />}
            {statusLabel(status)}
          </span>
        </div>
      </section>

      {error && <Alert kind="error">{error} <button type="button" className="ms-2 font-bold underline" onClick={() => void load()}>هەوڵدانەوە</button></Alert>}

      {status === 'VERIFIED' && (
        <section className="panel p-6 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-300">
            <Crown size={40} />
          </span>
          <h2 className="mt-4 font-display text-xl font-black text-ink">تاجی ئاڵتوونی چالاکە!</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-7 text-muted">
            هەژمارەکەت پشتڕاست کراوەتەوە{state?.verifiedAt ? ` لە ${formatDateTime(state.verifiedAt)}` : ''}. ئێستا تاجی ئاڵتوونی لە تەنیشت ناوەکەت دەردەکەوێت و متمانەی زیاترت دەبێت.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/pro" className="btn-primary !text-xs"><Crown size={15} /> بەدەستهێنانی Pro</Link>
            <Link to="/settings" className="btn-soft !text-xs">ڕێکخستنی پرۆفایل</Link>
          </div>
        </section>
      )}

      {status === 'PENDING' && pending && (
        <section className="panel p-5">
          <SectionTitle title="داواکارییەکەت لە چاوەڕوانیدایە" subtitle={`نێردراوە لە ${formatDateTime(pending.createdAt)}`} />
          <Alert kind="info">
            بەڕێوەبەر بەم زووانە داواکارییەکەت پشکنین دەکات. زانیارییەکان بە تەواوی پارێزراون و تەنها بۆ پشتڕاستکردنەوە بەکاردێن.
          </Alert>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'پێشەوە', src: pending.frontUrl },
              { label: 'دواوە', src: pending.backUrl },
              { label: 'سێڵفی', src: pending.selfieUrl },
            ].map((item) => (
              <div key={item.label}>
                <p className="mb-1.5 text-[10px] font-bold text-muted">{item.label}</p>
                <PrivateImage src={item.src} alt={item.label} className="h-44 w-full rounded-2xl border border-line" />
              </div>
            ))}
          </div>
          <button type="button" className="btn-danger mt-4 !text-xs" onClick={() => void cancelPending()} disabled={cancelling}>
            {cancelling ? <Spinner size={14} /> : <Trash2 size={14} />} هەڵوەشاندنەوەی داواکاری
          </button>
        </section>
      )}

      {(status === 'NONE' || status === 'REJECTED') && (
        <>
          {status === 'REJECTED' && history[0]?.note && (
            <Alert kind="error">
              <span className="font-extrabold">داواکاری پێشوو ڕەتکرایەوە.</span> هۆکار: {history[0].note}
            </Alert>
          )}
          <form onSubmit={submit} className="panel p-4 sm:p-6">
            <SectionTitle
              title="ناردنی بەڵگەنامەکان"
              subtitle="هەر سێ وێنەکە ڕوون و بێ نیشانە بێت. فایلی JPG/PNG/WebP تا ٢٥٠MB."
              action={<span className="chip !text-[10px]"><ShieldCheck size={11} /> پارێزراو</span>}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {SLOTS.map((slot) => {
                const current = slots[slot.kind];
                const uploading = current.progress !== null && current.progress < 100;
                return (
                  <div key={slot.kind} className="rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--primary)]"><slot.icon size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-extrabold text-ink">{slot.label}</p>
                        <p className="truncate text-[9px] text-muted">{slot.hint}</p>
                      </div>
                    </div>
                    <input
                      ref={(element) => { inputRefs.current[slot.kind] = element; }}
                      type="file"
                      accept="image/*"
                      capture={slot.capture}
                      className="hidden"
                      onChange={(event) => void chooseFile(slot.kind, event.target.files?.[0] || null)}
                    />
                    {current.preview ? (
                      <div className="relative overflow-hidden rounded-2xl border border-line">
                        <img src={current.preview} alt={slot.label} className="h-44 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(slot.kind)}
                          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                          aria-label="سڕینەوە"
                        >
                          <Trash2 size={13} />
                        </button>
                        {uploading && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur">
                            <ProgressBar value={current.progress || 0} />
                            <p className="mt-1 text-center text-[9px] text-white">{current.progress}% — بار دەکرێت…</p>
                          </div>
                        )}
                        {current.url && (
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white">
                            <CheckCircle2 size={10} /> ئامادەیە
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRefs.current[slot.kind]?.click()}
                        className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border-strong)] text-muted transition-colors hover:border-[color:var(--primary)]/60 hover:text-ink"
                      >
                        <Upload size={22} />
                        <span className="text-[10px] font-bold">هەڵبژاردنی وێنە</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-[color:var(--surface-2)]/35 p-3.5 text-[10px] leading-6 text-muted">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 accent-[color:var(--primary)]"
              />
              <span>
                ڕەزامەندم کە وێنەکانی ناسنامە و سێڵفییەکەم بۆ پشتڕاستکردنەوەی هەژمار بەکاربهێنرێن. دەزانم کە تەنها بەڕێوەبەران
                دەتوانن بیانبینن و زانیارییەکان بە نهێنی دەپارێزرێن.
              </span>
            </label>

            <button type="submit" className="btn-primary mt-4 w-full !py-3" disabled={submitting || !consent || !slots.front.url || !slots.back.url || !slots.selfie.url}>
              {submitting ? <Spinner size={16} /> : <ShieldCheck size={16} />} ناردنی داواکاری
            </button>
          </form>
        </>
      )}

      <section className="panel p-4 sm:p-5">
        <SectionTitle title="مێژووی داواکارییەکان" subtitle="دۆخ و تێبینی بەڕێوەبەر" />
        {history.length === 0 ? (
          <EmptyState icon={<FileCheck2 size={24} />} title="هێشتا مێژوو نییە" description="دوای ناردنی داواکاری، دۆخەکە لێرە دەردەکەوێت." className="!py-8" />
        ) : (
          <div className="space-y-2">
            {history.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <div className="panel p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink"><ShieldCheck size={15} className="text-[color:var(--primary)]" /> ئاسایشی زانیارییەکان</p>
        <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-muted">
          <li>• وێنەکان تەنها بۆ پشکنینی ناسنامە بەکاردێن و بە نهێنی دەپارێزرێن.</li>
          <li>• دەستڕاگەیشتنی وێنەکان تەنها بۆ بەڕێوەبەرانی پشتڕاستکراوە.</li>
          <li>• دەتوانیت داواکارییەکی چاوەڕوان هەڵبوەشێنیتەوە بەبێ ئەوەی هیچ شتێک لەدەست بدەیت.</li>
        </ul>
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: VerificationRequest }) {
  const approved = request.status === 'APPROVED';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', approved ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300')}>
        {approved ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold text-ink">{approved ? 'پەسەندکرا' : 'ڕەتکرایەوە'}</p>
        <p className="mt-0.5 text-[10px] text-muted">
          {formatDateTime(request.reviewedAt || request.createdAt)}
          {request.note ? ` — ${request.note}` : ''}
        </p>
      </div>
      <div className="flex gap-1.5">
        {(['front', 'back', 'selfie'] as const).map((kind) => (
          <PrivateImage
            key={kind}
            src={request[`${kind}Url`]}
            alt={kind}
            className="h-10 w-10 rounded-lg border border-line"
          />
        ))}
      </div>
    </div>
  );
}
