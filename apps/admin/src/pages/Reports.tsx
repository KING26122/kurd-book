import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flag,
  LockKeyhole,
  MessageSquareQuote,
  RefreshCw,
  ShieldAlert,
  UserX,
  XCircle,
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
  reportBadge,
} from '@/components/ui';
import { errorMessage, toast } from '@/stores/toast';
import type { AdminReport, ReportsResponse } from '@/types';

type StatusFilter = 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'OPEN', label: 'کراوە' },
  { id: 'RESOLVED', label: 'چارەسەرکراوە' },
  { id: 'DISMISSED', label: 'پشتگوێخراوە' },
  { id: 'ALL', label: 'هەموو' },
];

const TARGET_LABELS: Record<string, string> = {
  USER: 'بەکارهێنەر',
  MESSAGE: 'نامە',
  CONVERSATION: 'چات',
  POST: 'پۆست',
  STORY: 'ستۆری',
};

export function ReportsPage() {
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [note, setNote] = useState('');
  const [disableTarget, setDisableTarget] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<'RESOLVED' | 'DISMISSED' | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(
          await adminApi<ReportsResponse>(
            `/api/admin/reports?status=${status}&page=${page}&pageSize=12`,
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

  const openReview = (report: AdminReport) => {
    setSelected(report);
    setNote(report.note || '');
    setDisableTarget(false);
    setReviewError(null);
  };

  const review = async (nextStatus: 'RESOLVED' | 'DISMISSED') => {
    if (!selected) return;
    setReviewing(nextStatus);
    setReviewError(null);
    try {
      await adminApi(`/api/admin/reports/${selected.id}/review`, {
        method: 'POST',
        body: {
          status: nextStatus,
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(nextStatus === 'RESOLVED' && disableTarget && selected.targetUser
            ? { disableUserId: selected.targetUser.id }
            : {}),
        },
      });
      toast(
        nextStatus === 'RESOLVED'
          ? disableTarget
            ? 'ڕاپۆرتەکە چارەسەر کرا و هەژماری بەکارهێنەر ناچالاک کرا.'
            : 'ڕاپۆرتەکە چارەسەر کرا.'
          : 'ڕاپۆرتەکە پشتگوێ خرا و ئاگاداری بەکارهێنەر کرا.',
        'success',
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
              <ShieldAlert size={20} />
            </span>
            <div>
              <h2 className="text-xs font-extrabold text-ink">ڕاپۆرت و سکاڵاکان</h2>
              <p className="mt-0.5 text-[9px] text-muted">بەڵگەی چات تەنها دوای ڕەزامەندی بەکارهێنەر لێرە دەردەکەوێت</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip"><Flag size={12} /> {data?.total || 0} تۆمار</span>
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
              <SkeletonLine className="w-28" />
              <SkeletonLine className="mt-3 h-12 w-full" />
              <SkeletonLine className="mt-3 w-32" />
            </div>
          ))}
        </div>
      ) : !data || data.reports.length === 0 ? (
        <div className="panel rounded-2xl">
          <EmptyState
            icon={<ShieldAlert size={26} />}
            title={status === 'OPEN' ? 'هیچ ڕاپۆرتێکی کراوە نییە' : 'هیچ تۆمارێک نەدۆزرایەوە'}
            description={status === 'OPEN' ? 'سیستەمەکە پاکە. کاتێک ڕاپۆرتێکی نوێ بێت، لێرە دەردەکەوێت.' : 'لەم دۆخەدا هیچ ڕاپۆرتێک نییە.'}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.reports.map((report) => (
              <article
                key={report.id}
                className={cn(
                  'panel relative overflow-hidden rounded-2xl p-4 transition-colors',
                  report.status === 'OPEN' && 'border-orange-400/20',
                )}
              >
                {report.status === 'OPEN' && <span className="absolute inset-y-0 right-0 w-[3px] bg-orange-400/70" />}
                <div className="flex items-start gap-2.5">
                  <Avatar user={report.reporter} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[11px] font-extrabold text-ink">{report.reporter.name}</p>
                      {reportBadge(report.status)}
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-muted">شیکاری: {report.reason}</p>
                    <p className="mt-0.5 text-[8px] text-muted-2">{timeAgo(report.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-[color:var(--bg)]/35 p-2.5 text-[9px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-2">جۆری ئامانج</span>
                    <span className="font-bold text-ink">{TARGET_LABELS[report.targetType] || report.targetType}</span>
                  </div>
                  {report.targetUser && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-2">ئامانج</span>
                      <span className="truncate font-bold text-ink">{report.targetUser.name} <span className="font-normal text-muted-2">@{report.targetUser.username}</span></span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-2">بەڵگەی چات</span>
                    <span className={cn('font-bold', report.evidence.length ? 'text-[color:var(--accent)]' : 'text-muted')}>
                      {report.evidence.length ? `${report.evidence.length} نامە` : 'نییە'}
                    </span>
                  </div>
                </div>

                {report.details && (
                  <p className="mt-2 line-clamp-2 text-[9px] leading-5 text-muted">{report.details}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[8px] text-muted-2">
                    {report.evidence.length > 0 && <><MessageSquareQuote size={11} /> بە ڕەزامەندی</>}
                  </div>
                  <button
                    type="button"
                    className={report.status === 'OPEN' ? 'btn-primary !px-3 !py-1.5 !text-[9px]' : 'btn-soft !px-3 !py-1.5 !text-[9px]'}
                    onClick={() => openReview(report)}
                  >
                    <Flag size={12} /> {report.status === 'OPEN' ? 'پشکنین' : 'بینین'}
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
        title={selected ? `ڕاپۆرت — ${selected.reason}` : 'ڕاپۆرت'}
        subtitle={selected ? `${formatDateTime(selected.createdAt)} · ${TARGET_LABELS[selected.targetType] || selected.targetType} · ${selected.targetId}` : undefined}
        size="lg"
        footer={
          selected?.status === 'OPEN' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] leading-5 text-muted">بڕیارەکەت بەکارهێنەر ئاگادار دەکاتەوە.</p>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-soft !text-[10px]" onClick={() => void review('DISMISSED')} disabled={Boolean(reviewing)}>
                  {reviewing === 'DISMISSED' ? <Spinner size={13} /> : <XCircle size={13} />} پشتگوێخستن
                </button>
                <button type="button" className="btn-primary !text-[10px]" onClick={() => void review('RESOLVED')} disabled={Boolean(reviewing)}>
                  {reviewing === 'RESOLVED' ? <Spinner size={13} /> : <CheckCircle2 size={13} />} چارەسەرکردن
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
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-[color:var(--bg)]/35 p-3.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-2">ڕاپۆرتکەر</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <Avatar user={selected.reporter} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-extrabold text-ink">{selected.reporter.name}</p>
                    <p className="mt-0.5 truncate text-[9px] text-muted">@{selected.reporter.username}</p>
                    <p className="mt-0.5 truncate text-[8px] text-muted-2" dir="ltr">{selected.reporter.email || selected.reporter.phone || '—'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-[color:var(--bg)]/35 p-3.5">
                <p className="text-[8px] font-bold uppercase tracking-wider text-muted-2">ئامانجی ڕاپۆرت</p>
                {selected.targetUser ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <Avatar user={selected.targetUser} size={38} />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-extrabold text-ink">{selected.targetUser.name}</p>
                      <p className="mt-0.5 truncate text-[9px] text-muted">@{selected.targetUser.username}</p>
                      <p className="mt-0.5 text-[8px] text-muted-2">{selected.targetUser.verificationStatus === 'VERIFIED' ? 'پشتڕاستکراوە' : 'ئاسایی'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                    <Flag size={15} className="text-muted-2" />
                    {TARGET_LABELS[selected.targetType] || selected.targetType} — <span dir="ltr">{selected.targetId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">هۆکاری ڕاپۆرت</p>
                <p className="mt-1 text-[11px] font-bold text-ink">{selected.reason}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">دۆخ</p>
                <div className="mt-1">{reportBadge(selected.status)}</div>
              </div>
            </div>

            {selected.details && (
              <div className="rounded-xl border border-line bg-[color:var(--surface-2)]/35 p-3">
                <p className="text-[8px] text-muted-2">وردەکاری زیاتر</p>
                <p className="mt-1 whitespace-pre-wrap text-[10px] leading-6 text-muted">{selected.details}</p>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-2 border-b border-line bg-[color:var(--surface-2)]/40 px-3.5 py-2.5">
                <MessageSquareQuote size={15} className="text-[color:var(--accent)]" />
                <p className="flex-1 text-[10px] font-extrabold text-ink">بەڵگەی چات</p>
                <Badge tone="gold"><LockKeyhole size={9} /> بە ڕەزامەندی</Badge>
              </div>
              <div className="border-b border-sky-400/10 bg-sky-400/[0.04] px-3.5 py-2 text-[8px] leading-5 text-sky-100/80">
                ئەم دەقانە لەلایەن ڕاپۆرتکەرەوە بە ڕەزامەندی هاوبەش کراوە بۆ پشکنینی ڕاپۆرت. دەرکەوتنیان بۆ هیچ کەسێکی تر نیشان مەدە.
              </div>
              <div className="admin-scroll max-h-[320px] space-y-2.5 overflow-y-auto p-3">
                {selected.evidence.length === 0 ? (
                  <div className="py-5 text-center text-[10px] text-muted">
                    ڕاپۆرتکەر هیچ بەڵگەیەکی چاتی هاوبەش نەکردووە.
                  </div>
                ) : (
                  selected.evidence.map((message, index) => (
                    <div key={`${message.sentAt}-${index}`} className="rounded-xl border border-line bg-[color:var(--bg)]/45 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-[8px]">
                        <span className="font-bold text-[color:var(--primary)]">{message.sender || 'بەکارهێنەر'}</span>
                        <span className="flex items-center gap-1 text-muted-2">
                          <Clock size={9} />
                          {message.sentAt ? formatDateTime(message.sentAt) : '—'}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-[10px] leading-6 text-ink">{message.text || '—'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {reviewError && <Alert kind="error">{reviewError}</Alert>}

            {selected.status === 'OPEN' ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="label">بڕیار / تێبینی بۆ بەکارهێنەر (ئارەزوومەندانە)</span>
                  <textarea
                    className="admin-textarea !text-[11px]"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    placeholder="ئەنجامی پشکنین و هۆکاری بڕیارەکە بنووسە…"
                  />
                  <span className="mt-1 block text-left text-[8px] text-muted-2">{note.length}/1000</span>
                </label>

                {selected.targetUser && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-3">
                    <input
                      type="checkbox"
                      checked={disableTarget}
                      onChange={(event) => setDisableTarget(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--danger)]"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-red-200">
                        <UserX size={13} /> هەژماری ئامانج ناچالاک بکە
                      </span>
                      <span className="mt-1 block text-[9px] leading-5 text-muted">
                        ئەمە تەنها لەگەڵ «چارەسەرکردن» جێبەجێ دەبێت. هەموو دانیشتنەکانی «{selected.targetUser.name}» دەسووڕێنرێنەوە.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-[color:var(--surface-2)]/40 p-3 text-[10px] leading-6 text-muted">
                <p className="font-bold text-ink">ئەنجامی پشکنین</p>
                <p className="mt-1">
                  {selected.status === 'RESOLVED' ? 'چارەسەرکراوە' : 'پشتگوێخراوە'}
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
