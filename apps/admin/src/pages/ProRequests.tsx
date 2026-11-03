import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  CreditCard,
  Crown,
  ReceiptText,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatIQD, timeAgo } from '@/lib/format';
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  Modal,
  Pagination,
  SkeletonLine,
  Spinner,
  reviewBadge,
} from '@/components/ui';
import { PrivateFile } from '@/components/PrivateFile';
import { errorMessage, toast } from '@/stores/toast';
import type { AdminQueuePro, ProRequestsResponse } from '@/types';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'PENDING', label: 'چاوەڕوان' },
  { id: 'APPROVED', label: 'پەسەندکراوە' },
  { id: 'REJECTED', label: 'ڕەتکراوە' },
  { id: 'ALL', label: 'هەموو' },
];

const PROVIDER_LABELS: Record<string, string> = {
  FIB: 'FIB — First Iraqi Bank',
  FASTPAY: 'FastPay',
  QICARD: 'QiCard',
  MANUAL: 'دەستی',
};

function planLabel(plan: string): string {
  return plan === 'YEARLY' ? 'ساڵانە' : 'مانگانە';
}

function paymentTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}

function paymentLabel(status?: string): string {
  if (status === 'PAID') return 'دراوە';
  if (status === 'PENDING') return 'چاوەڕوان';
  if (status === 'FAILED') return 'شکستخواردوو';
  if (status === 'REFUNDED') return 'گەڕێنراوە';
  return 'نەزانراو';
}

export function ProRequestsPage() {
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<AdminQueuePro | null>(null);
  const [note, setNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(
          await adminApi<ProRequestsResponse>(
            `/api/admin/pro-requests?status=${status}&page=${page}&pageSize=12`,
          ),
        );
      } catch (loadError) {
        setError(errorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, page],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openReview = (request: AdminQueuePro) => {
    setSelected(request);
    setNote(request.note || '');
    setReviewError(null);
  };

  const review = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setReviewing(action);
    setReviewError(null);
    try {
      await adminApi(`/api/admin/pro-requests/${selected.id}/review`, {
        method: 'POST',
        body: { action, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      toast(
        action === 'approve'
          ? `Pro بۆ «${selected.user.name}» چالاک کرا. 👑💎`
          : 'داواکاری Pro ڕەتکرایەوە و بەکارهێنەر ئاگادار کرا.',
        action === 'approve' ? 'success' : 'info',
      );
      setSelected(null);
      setRefreshKey((value) => value + 1);
    } catch (reviewFailure) {
      const message = errorMessage(reviewFailure);
      setReviewError(message);
      toast(message, 'error');
    } finally {
      setReviewing(null);
    }
  };

  const pendingValue =
    data?.requests.filter((request) => request.status === 'PENDING').reduce((sum, request) => sum + request.amount, 0) || 0;

  return (
    <div className="page-enter space-y-4">
      <div className="panel rounded-2xl p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
              <Crown size={20} />
            </span>
            <div>
              <h2 className="text-xs font-extrabold text-ink">ڕیزی داواکارییەکانی Pro</h2>
              <p className="mt-0.5 text-[9px] text-muted">پسووڵە یان پارەدانی ئۆنلاین بپشکنە و ئەندامێتی چالاک بکە</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingValue > 0 && (
              <span className="chip !border-[color:var(--accent)]/25 !text-[color:var(--accent)]">
                <Sparkles size={12} /> {formatIQD(pendingValue)} چاوەڕوان
              </span>
            )}
            <span className="chip"><ReceiptText size={12} /> {data?.total || 0} تۆمار</span>
            <button type="button" className="btn-soft" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} /> نوێکردنەوە
            </button>
          </div>
        </div>
        <div className="tab-row mt-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn('tab', status === tab.id && 'tab-active')}
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert kind="error">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" className="btn-ghost !px-2 !py-1 !text-[9px]" onClick={() => setRefreshKey((value) => value + 1)}>
              هەوڵدانەوە
            </button>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="panel rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <span className="skeleton h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="w-24" />
                  <SkeletonLine className="w-16 !h-2" />
                </div>
              </div>
              <SkeletonLine className="mt-4 h-12 w-full" />
            </div>
          ))}
        </div>
      ) : !data || data.requests.length === 0 ? (
        <div className="panel rounded-2xl">
          <EmptyState
            icon={<Crown size={26} />}
            title={status === 'PENDING' ? 'هیچ داواکارییەکی Pro چاوەڕوان نییە' : 'هیچ تۆمارێک نەدۆزرایەوە'}
            description={
              status === 'PENDING'
                ? 'کاتێک بەکارهێنەرێک بە FastPay یان QiCard پسووڵەیەک بنێرێت، لێرە دەردەکەوێت.'
                : 'لەم دۆخەدا هیچ داواکارییەکی Pro نییە.'
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.requests.map((request) => (
              <article
                key={request.id}
                className={cn(
                  'panel relative overflow-hidden rounded-2xl p-4 transition-colors',
                  request.status === 'PENDING' && 'border-[color:var(--accent)]/20',
                )}
              >
                {request.status === 'PENDING' && (
                  <span className="absolute inset-y-0 right-0 w-[3px] bg-[color:var(--accent)]/70" />
                )}
                <div className="flex items-start gap-2.5">
                  <Avatar user={request.user} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[11px] font-extrabold text-ink">{request.user.name}</p>
                      {reviewBadge(request.status)}
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-muted">@{request.user.username}</p>
                    <p className="mt-0.5 truncate text-[8px] text-muted-2" dir="ltr">{request.user.email || request.user.phone || request.user.id}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line bg-[color:var(--bg)]/35 p-2.5">
                    <p className="text-[8px] text-muted-2">پلان</p>
                    <p className="mt-0.5 text-[10px] font-extrabold text-ink">{planLabel(request.plan)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-[color:var(--bg)]/35 p-2.5">
                    <p className="text-[8px] text-muted-2">بڕ</p>
                    <p className="mt-0.5 text-[10px] font-extrabold text-[color:var(--accent)]">{formatIQD(request.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-[color:var(--bg)]/35 p-2.5">
                    <p className="text-[8px] text-muted-2">سەرچاوە</p>
                    <p className="mt-0.5 text-[10px] font-bold text-ink">{PROVIDER_LABELS[request.provider] || request.provider}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-[color:var(--bg)]/35 p-2.5">
                    <p className="text-[8px] text-muted-2">پارەدان</p>
                    <div className="mt-0.5">
                      <Badge tone={paymentTone(request.payment?.status)}> {paymentLabel(request.payment?.status)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                  <div className="flex items-center gap-1 text-[8px] text-muted-2">
                    <Clock size={11} /> {timeAgo(request.createdAt)}
                    {request.receiptUrl && <><ReceiptText size={11} className="ms-1" /> پسووڵە</>}
                  </div>
                  <button
                    type="button"
                    className={request.status === 'PENDING' ? 'btn-primary !px-3 !py-1.5 !text-[9px]' : 'btn-soft !px-3 !py-1.5 !text-[9px]'}
                    onClick={() => openReview(request)}
                  >
                    <CreditCard size={12} /> {request.status === 'PENDING' ? 'پشکنین' : 'بینین'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="panel rounded-2xl">
            {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
          </div>
        </>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          if (reviewing) return;
          setSelected(null);
        }}
        title={selected ? `داواکاری Pro — ${selected.user.name}` : 'داواکاری Pro'}
        subtitle={selected ? `${selected.provider} · ${formatDateTime(selected.createdAt)}` : undefined}
        size="lg"
        footer={
          selected?.status === 'PENDING' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] leading-5 text-muted">پەسەندکردن ئەندامێتی Pro دەستبەجێ چالاک دەکات.</p>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-danger !text-[10px]" onClick={() => void review('reject')} disabled={Boolean(reviewing)}>
                  {reviewing === 'reject' ? <Spinner size={13} /> : <X size={13} />} ڕەتکردنەوە
                </button>
                <button type="button" className="btn-primary !text-[10px]" onClick={() => void review('approve')} disabled={Boolean(reviewing)}>
                  {reviewing === 'approve' ? <Spinner size={13} /> : <Check size={13} />} پەسەندکردن و چالاککردن
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" className="btn-soft !text-[10px]" onClick={() => setSelected(null)}>داخستن</button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-[color:var(--bg)]/35 p-3.5">
              <Avatar user={selected.user} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-black text-ink">{selected.user.name}</p>
                  {reviewBadge(selected.status)}
                  {selected.user.isPro && <Badge tone="info"><Crown size={10} /> PRO</Badge>}
                </div>
                <p className="mt-1 text-[9px] text-muted">@{selected.user.username}</p>
                <p className="mt-1 text-[9px] text-muted" dir="ltr">{selected.user.email || selected.user.phone || '—'}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/[0.07] px-3 py-2 text-center">
                <p className="text-[8px] text-muted">بڕی داواکاری</p>
                <p className="mt-0.5 text-sm font-black text-[color:var(--accent)]">{formatIQD(selected.amount)}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'پلان', value: planLabel(selected.plan) },
                { label: 'سەرچاوەی پارەدان', value: PROVIDER_LABELS[selected.provider] || selected.provider },
                { label: 'دۆخی داواکاری', value: reviewBadge(selected.status) },
                { label: 'دۆخی پارەدان', value: <Badge tone={paymentTone(selected.payment?.status)}>{paymentLabel(selected.payment?.status)}</Badge> },
                { label: 'ژمارەی پارەدان', value: selected.payment?.id || '—', dir: 'ltr' as const },
                { label: 'کۆدی سەرچاوە', value: selected.payment?.providerRef || selected.reference || '—', dir: 'ltr' as const },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line p-3">
                  <p className="text-[8px] text-muted-2">{item.label}</p>
                  <div className="mt-1 text-[10px] font-bold text-ink" dir={item.dir}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {selected.note && (
              <div className="rounded-xl border border-line bg-[color:var(--surface-2)]/40 p-3">
                <p className="text-[8px] text-muted-2">تێبینی بەکارهێنەر</p>
                <p className="mt-1 whitespace-pre-wrap text-[10px] leading-6 text-muted">{selected.note}</p>
              </div>
            )}

            <div>
              <p className="label !mb-2">پسووڵەی پارەدان</p>
              {selected.receiptUrl ? (
                <PrivateFile
                  path={`/api/admin/pro-requests/${selected.id}/receipt`}
                  alt="پسووڵەی پارەدان"
                  label="پسووڵە"
                  className="!aspect-[3/2]"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-[color:var(--bg)]/35 px-3 py-4 text-[9px] leading-5 text-muted">
                  <ReceiptText size={16} className="shrink-0 text-muted-2" />
                  {selected.payment
                    ? 'ئەم داواکارییە بە پارەدانی ئۆنلاین دروستکراوە؛ پسووڵەی دەستی پێویست نییە.'
                    : 'بەکارهێنەر هیچ پسووڵەیەکی بارنەکردووە. پێش پەسەندکردن دڵنیابە پارەدانەکەت وەرگرتووە.'}
                </div>
              )}
            </div>

            {reviewError && <Alert kind="error">{reviewError}</Alert>}

            {selected.status === 'PENDING' ? (
              <label className="block">
                <span className="label">تێبینی بەڕێوەبەر (ئارەزوومەندانە)</span>
                <textarea
                  className="admin-textarea !text-[11px]"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="بۆ ڕەتکردنەوە هۆکارەکە ڕوون بکەرەوە؛ بۆ پەسەندکردن دەتوانیت سوپاس بنووسیت…"
                />
                <span className="mt-1 block text-left text-[8px] text-muted-2">{note.length}/500</span>
              </label>
            ) : (
              <div className="rounded-xl border border-line bg-[color:var(--surface-2)]/40 p-3 text-[10px] leading-6 text-muted">
                <p className="font-bold text-ink">ئەنجامی پشکنین</p>
                <p className="mt-1">
                  {selected.status === 'APPROVED' ? 'پەسەندکراوە' : 'ڕەتکراوە'}
                  {selected.reviewedAt ? ` · ${formatDateTime(selected.reviewedAt)}` : ''}
                  {selected.reviewedBy ? ` · ${selected.reviewedBy.name}` : ''}
                </p>
                {selected.note && <p className="mt-1">تێبینی: {selected.note}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
