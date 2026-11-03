import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Clock,
  FileImage,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo } from '@/lib/format';
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
  verificationBadge,
} from '@/components/ui';
import { PrivateFile } from '@/components/PrivateFile';
import { errorMessage, toast } from '@/stores/toast';
import type { AdminQueueVerification, VerificationsResponse } from '@/types';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'PENDING', label: 'چاوەڕوان' },
  { id: 'APPROVED', label: 'پەسەندکراوە' },
  { id: 'REJECTED', label: 'ڕەتکراوە' },
  { id: 'ALL', label: 'هەموو' },
];

export function VerificationsPage() {
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<VerificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<AdminQueueVerification | null>(null);
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
          await adminApi<VerificationsResponse>(
            `/api/admin/verifications?status=${status}&page=${page}&pageSize=12`,
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

  const openReview = (request: AdminQueueVerification) => {
    setSelected(request);
    setNote(request.note || '');
    setReviewError(null);
  };

  const review = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setReviewing(action);
    setReviewError(null);
    try {
      await adminApi(`/api/admin/verifications/${selected.id}/review`, {
        method: 'POST',
        body: { action, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      toast(
        action === 'approve'
          ? `«${selected.user.name}» پشتڕاستکرایەوە و تاجی ئاڵتوونی درا. 👑`
          : 'داواکارییەکە ڕەتکرایەوە و بەکارهێنەر ئاگادار کرا.',
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

  return (
    <div className="page-enter space-y-4">
      <div className="panel rounded-2xl p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-xs font-extrabold text-ink">ڕیزی پشتڕاستکردنەوە</h2>
              <p className="mt-0.5 text-[9px] text-muted">
                ناسنامەی نیشتمانی پێشەوە/دواوە + سێلفی بەراورد بکە
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">
              <FileImage size={12} /> {data?.total || 0} تۆمار
            </span>
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
            icon={status === 'PENDING' ? <Check size={26} /> : <ShieldCheck size={26} />}
            title={status === 'PENDING' ? 'هیچ داواکارییەکی چاوەڕوان نییە' : 'هیچ تۆمارێک نەدۆزرایەوە'}
            description={
              status === 'PENDING'
                ? 'کاتێک بەکارهێنەرێک ناسنامە و سێلفی بنێرێت، لێرە دەردەکەوێت بۆ پشکنین.'
                : 'لەم دۆخەدا هیچ داواکارییەکی پشتڕاستکردنەوە نییە.'
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
                  request.status === 'PENDING' && 'border-amber-400/20',
                )}
              >
                {request.status === 'PENDING' && (
                  <span className="absolute inset-y-0 right-0 w-[3px] bg-amber-400/70" />
                )}
                <div className="flex items-start gap-2.5">
                  <Avatar user={request.user} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[11px] font-extrabold text-ink">{request.user.name}</p>
                      {verificationBadge(request.status)}
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-muted">@{request.user.username}</p>
                    <p className="mt-0.5 truncate text-[8px] text-muted-2" dir="ltr">{request.user.email || request.user.phone || request.user.id}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-[color:var(--bg)]/35 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[9px] text-muted">
                    <Clock size={12} /> {timeAgo(request.createdAt)}
                  </div>
                  <div className="text-[8px] text-muted-2">{formatDateTime(request.createdAt)}</div>
                </div>

                {request.note && (
                  <p className="mt-2 line-clamp-2 rounded-lg bg-[color:var(--surface-2)]/60 px-2.5 py-2 text-[9px] leading-5 text-muted">
                    {request.note}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[8px] text-muted-2">
                    <FileImage size={11} /> ٣ فایل
                    {request.reviewedBy && <span>· {request.reviewedBy.name}</span>}
                  </div>
                  <button
                    type="button"
                    className={request.status === 'PENDING' ? 'btn-primary !px-3 !py-1.5 !text-[9px]' : 'btn-soft !px-3 !py-1.5 !text-[9px]'}
                    onClick={() => openReview(request)}
                  >
                    <UserCheck size={12} /> {request.status === 'PENDING' ? 'پشکنین' : 'بینین'}
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
        title={selected ? `پشکنینی «${selected.user.name}»` : 'پشکنین'}
        subtitle={selected ? `داواکاری لە ${formatDateTime(selected.createdAt)} · @${selected.user.username}` : undefined}
        size="lg"
        footer={
          selected?.status === 'PENDING' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] leading-5 text-muted">
                دوای پەسەندکردن، تاجی ئاڵتوونی دەستبەجێ لەسەر هەژمارەکە چالاک دەبێت.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-danger !text-[10px]"
                  onClick={() => void review('reject')}
                  disabled={Boolean(reviewing)}
                >
                  {reviewing === 'reject' ? <Spinner size={13} /> : <X size={13} />} ڕەتکردنەوە
                </button>
                <button
                  type="button"
                  className="btn-primary !text-[10px]"
                  onClick={() => void review('approve')}
                  disabled={Boolean(reviewing)}
                >
                  {reviewing === 'approve' ? <Spinner size={13} /> : <Check size={13} />} پەسەندکردن
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" className="btn-soft !text-[10px]" onClick={() => setSelected(null)}>
                داخستن
              </button>
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
                  {verificationBadge(selected.user.verificationStatus)}
                  {reviewBadge(selected.status)}
                </div>
                <p className="mt-1 text-[9px] text-muted">@{selected.user.username}</p>
                <p className="mt-1 text-[9px] text-muted" dir="ltr">{selected.user.email || selected.user.phone || '—'}</p>
              </div>
              <div className="text-left text-[9px] text-muted-2">
                <p>ئیمەیڵ: {selected.user.emailVerifiedAt ? '✓' : '—'}</p>
                <p className="mt-0.5">مۆبایل: {selected.user.phoneVerifiedAt ? '✓' : '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.05] px-3 py-2.5 text-[9px] leading-5 text-sky-100/90">
              🔒 ئەم فایلانە تەنها بۆ بەڕێوەبەرانە و بە token پارێزراون. دوای پشکنین داتاکان بە نهێنی بهێڵەوە و بڵاویان مەکەرەوە.
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="label !mb-2">ناسنامە — پێشەوە</p>
                <PrivateFile
                  path={`/api/admin/verifications/${selected.id}/files/front`}
                  alt="ناسنامەی نیشتمانی — پێشەوە"
                  label="پێشەوە"
                />
              </div>
              <div>
                <p className="label !mb-2">ناسنامە — دواوە</p>
                <PrivateFile
                  path={`/api/admin/verifications/${selected.id}/files/back`}
                  alt="ناسنامەی نیشتمانی — دواوە"
                  label="دواوە"
                />
              </div>
              <div>
                <p className="label !mb-2">سێلفی</p>
                <PrivateFile
                  path={`/api/admin/verifications/${selected.id}/files/selfie`}
                  alt="سێلفی بەکارهێنەر"
                  label="سێلفی"
                />
              </div>
            </div>

            {reviewError && <Alert kind="error">{reviewError}</Alert>}

            {selected.status === 'PENDING' ? (
              <label className="block">
                <span className="label">تێبینی بۆ بەکارهێنەر (ئارەزوومەندانە)</span>
                <textarea
                  className="admin-textarea !text-[11px]"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  placeholder="بۆ پەسەندکردن دەتوانیت تێبینی بنووسیت؛ بۆ ڕەتکردنەوە هۆکارەکە ڕوون بکەرەوە…"
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
