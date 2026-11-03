import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Crown,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber, timeAgo } from '@/lib/format';
import {
  Alert,
  Avatar,
  Badge,
  ConfirmDialog,
  EmptyState,
  Modal,
  Pagination,
  SkeletonLine,
  Spinner,
  reviewBadge,
  verificationBadge,
} from '@/components/ui';
import { useAdminAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import type { AdminUser, UserDetail, UsersResponse } from '@/types';

type Filter = 'all' | 'verified' | 'pro' | 'pending' | 'disabled';
type UserActionKind = 'disable' | 'enable' | 'promote' | 'demote';

interface PendingAction {
  kind: UserActionKind;
  user: AdminUser;
}

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'هەموو' },
  { id: 'pending', label: 'چاوەڕوان' },
  { id: 'verified', label: 'پشتڕاستکراوە' },
  { id: 'pro', label: 'Pro' },
  { id: 'disabled', label: 'ناچالاک' },
];

function actionCopy(action: PendingAction) {
  switch (action.kind) {
    case 'disable':
      return {
        title: 'ناچالاککردنی هەژمار',
        description: `دڵنیایت لە ناچالاککردنی «${action.user.name}»؟ هەموو دانیشتنەکانی دەستبەجێ دەسووڕێنرێنەوە و ناتوانێت بچێتە ژوورەوە.`,
        label: 'ناچالاک بکە',
      };
    case 'enable':
      return {
        title: 'چالاککردنی هەژمار',
        description: `دڵنیایت لە چالاککردنی «${action.user.name}»؟ لە دوای چالاککردن دەبێت دووبارە بچێتە ژوورەوە.`,
        label: 'چالاک بکە',
      };
    case 'promote':
      return {
        title: 'کردن بە بەڕێوەبەر',
        description: `«${action.user.name}» دەستگەیشتنی تەواوی بەڕێوەبەر دەبێت بە پانێڵەکە. تکایە تەنها بۆ کەسانی متمانەپێکراو بەکاربهێنە.`,
        label: 'بەڕێوەبەر بکە',
      };
    case 'demote':
      return {
        title: 'لابردنی دەستگەیشتنی بەڕێوەبەر',
        description: `دەستگەیشتنی بەڕێوەبەر لە «${action.user.name}» دەسەندرێتەوە و دەبێتە بەکارهێنەری ئاسایی.`,
        label: 'لابردن',
      };
  }
}

export function UsersPage() {
  const me = useAdminAuthStore((state) => state.user);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
          filter,
          ...(search ? { q: search } : {}),
        });
        setData(await adminApi<UsersResponse>(`/api/admin/users?${params.toString()}`));
      } catch (loadError) {
        setError(errorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, page, search],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openDetail = async (user: AdminUser) => {
    setDetailId(user.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await adminApi<UserDetail>(`/api/admin/users/${user.id}`));
    } catch (detailError) {
      toast(errorMessage(detailError), 'error');
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async () => {
    if (!pending) return;
    setActionBusy(true);
    try {
      const body =
        pending.kind === 'disable'
          ? { disabled: true }
          : pending.kind === 'enable'
            ? { disabled: false }
            : pending.kind === 'promote'
              ? { role: 'ADMIN' }
              : { role: 'USER' };
      await adminApi(`/api/admin/users/${pending.user.id}`, { method: 'PATCH', body });
      toast(
        pending.kind === 'disable'
          ? 'هەژمارەکە ناچالاک کرا.'
          : pending.kind === 'enable'
            ? 'هەژمارەکە چالاک کرا.'
            : pending.kind === 'promote'
              ? 'دەستگەیشتنی بەڕێوەبەر درا.'
              : 'دەستگەیشتنی بەڕێوەبەر لابرا.',
        'success',
      );
      setPending(null);
      setRefreshKey((value) => value + 1);
      if (detailId) {
        try {
          setDetail(await adminApi<UserDetail>(`/api/admin/users/${detailId}`));
        } catch {
          // the list refresh is the important part
        }
      }
    } catch (actionError) {
      toast(errorMessage(actionError), 'error');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <div className="panel rounded-2xl p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative min-w-[220px] flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchDraft.trim());
            }}
          >
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              className="admin-input !py-2.5 !pr-9"
              placeholder="گەڕان بە ناو، ئیمەیڵ، ژمارە یان یوزەرنەیم…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            {searchDraft && (
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-2 hover:text-ink"
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                  setPage(1);
                }}
                aria-label="سڕینەوەی گەڕان"
              >
                <X size={13} />
              </button>
            )}
          </form>
          <button type="submit" className="btn-soft" onClick={() => { setPage(1); setSearch(searchDraft.trim()); }}>
            <Search size={14} /> گەڕان
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          </button>
          <div className="ms-auto flex items-center gap-1.5 text-[10px] text-muted">
            <Users size={14} className="text-[color:var(--primary)]" />
            <span className="font-extrabold text-ink">{formatNumber(data?.total)}</span> بەکارهێنەر
          </div>
        </div>

        <div className="tab-row mt-3">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn('tab', filter === item.id && 'tab-active')}
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
            >
              {item.label}
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

      <div className="panel overflow-hidden rounded-2xl">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>بەکارهێنەر</th>
                <th>پەیوەندی</th>
                <th>دۆخ</th>
                <th>چالاکی</th>
                <th>دوایین چالاکی</th>
                <th>بەرواری تۆمار</th>
                <th className="text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <tr key={index}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="skeleton h-9 w-9 rounded-full" />
                        <div className="space-y-1.5">
                          <SkeletonLine className="w-24" />
                          <SkeletonLine className="w-16 !h-2" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell}><SkeletonLine className="w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : data && data.users.length > 0 ? (
                data.users.map((user) => {
                  const isSelf = user.id === me?.id;
                  const online = Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000;
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <Avatar user={user} size={36} />
                            {online && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--panel)] bg-[color:var(--success)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="max-w-[150px] truncate text-[11px] font-extrabold text-ink">{user.name}</span>
                              {isSelf && <Badge tone="warning">تۆ</Badge>}
                              {user.role === 'ADMIN' && <Badge tone="gold">ADMIN</Badge>}
                            </div>
                            <p className="mt-0.5 text-[9px] text-muted">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-0.5 text-[9px] text-muted" dir="ltr">
                          {user.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={10} className="shrink-0 text-muted-2" />
                              <span className="max-w-[170px] truncate">{user.email}</span>
                              {user.emailVerifiedAt && <CheckCircle2 size={10} className="shrink-0 text-emerald-400" />}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={10} className="shrink-0 text-muted-2" />
                              <span>{user.phone}</span>
                              {user.phoneVerifiedAt && <CheckCircle2 size={10} className="shrink-0 text-emerald-400" />}
                            </div>
                          )}
                          {!user.email && !user.phone && <span className="text-muted-2">—</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          {verificationBadge(user.verificationStatus)}
                          {user.isPro && <Badge tone="info"><Crown size={9} /> PRO</Badge>}
                          {user.disabled && <Badge tone="danger">ناچالاک</Badge>}
                        </div>
                      </td>
                      <td>
                        <div className="text-[10px] font-bold text-ink">{formatNumber(user._count?.posts || 0)} پۆست</div>
                        <div className="mt-0.5 text-[8px] text-muted">{formatNumber(user.friendCount || 0)} هاوڕێ</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="text-[10px] text-muted">{timeAgo(user.lastActiveAt)}</div>
                        <div className={cn('mt-0.5 text-[8px]', online ? 'text-emerald-400' : 'text-muted-2')}>
                          {online ? 'ئۆنلاین' : 'ئۆفلاین'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[9px] text-muted">{formatDateTime(user.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="icon-btn !h-7 !w-7 hover:!text-[color:var(--primary)]"
                            onClick={() => void openDetail(user)}
                            aria-label="بینینی وردەکاری"
                            title="وردەکاری"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'icon-btn !h-7 !w-7',
                              user.disabled ? 'hover:!text-emerald-400' : 'hover:!text-[color:var(--danger)]',
                            )}
                            onClick={() => setPending({ kind: user.disabled ? 'enable' : 'disable', user })}
                            disabled={isSelf}
                            aria-label={user.disabled ? 'چالاککردن' : 'ناچالاککردن'}
                            title={user.disabled ? 'چالاککردن' : 'ناچالاککردن'}
                          >
                            {user.disabled ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Users size={24} />}
                      title="هیچ بەکارهێنەرێک نەدۆزرایەوە"
                      description={search ? 'گەڕانەکە بگۆڕە یان فلتەرەکان پاک بکەرەوە.' : 'هێشتا هیچ بەکارهێنەرێک تۆمار نەکراوە.'}
                      action={
                        search ? (
                          <button type="button" className="btn-soft !text-[10px]" onClick={() => { setSearch(''); setSearchDraft(''); setFilter('all'); setPage(1); }}>
                            پاککردنەوەی فلتەر
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </div>

      <Modal
        open={Boolean(detailId)}
        onClose={() => { setDetailId(null); setDetail(null); }}
        title="پرۆفایلی بەکارهێنەر"
        subtitle="زانیارییەکان، بەکارهێنانی ڕۆژانە و دەستگەیشتن"
        size="lg"
        footer={
          detail && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={detail.user.role === 'ADMIN' ? 'btn-soft !text-[9px]' : 'btn-soft !text-[9px]'}
                  onClick={() => setPending({ kind: detail.user.role === 'ADMIN' ? 'demote' : 'promote', user: detail.user })}
                  disabled={detail.user.id === me?.id}
                >
                  <UserCog size={13} />
                  {detail.user.role === 'ADMIN' ? 'لابردنی ئەدمین' : 'کردن بە ئەدمین'}
                </button>
                <button
                  type="button"
                  className={detail.user.disabled ? 'btn-soft !text-[9px]' : 'btn-danger !text-[9px]'}
                  onClick={() => setPending({ kind: detail.user.disabled ? 'enable' : 'disable', user: detail.user })}
                  disabled={detail.user.id === me?.id}
                >
                  {detail.user.disabled ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                  {detail.user.disabled ? 'چالاککردن' : 'ناچالاککردن'}
                </button>
              </div>
              <button type="button" className="btn-ghost !text-[10px]" onClick={() => { setDetailId(null); setDetail(null); }}>
                داخستن
              </button>
            </div>
          )
        }
      >
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center py-16 text-xs text-muted">
            <Spinner size={20} className="me-2 text-[color:var(--primary)]" /> وردەکاری بار دەکرێت…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-[color:var(--bg)]/35 p-4">
              <Avatar user={detail.user} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-ink">{detail.user.name}</h3>
                  {verificationBadge(detail.user.verificationStatus)}
                  {detail.user.isPro && <Badge tone="info"><Crown size={10} /> PRO</Badge>}
                  {detail.user.role === 'ADMIN' && <Badge tone="gold">ADMIN</Badge>}
                  {detail.user.disabled && <Badge tone="danger">ناچالاک</Badge>}
                </div>
                <p className="mt-1 text-[10px] text-muted">@{detail.user.username} · ID: <span dir="ltr">{detail.user.id}</span></p>
                <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-muted" dir="ltr">
                  {detail.user.email && <span className="flex items-center gap-1"><Mail size={11} /> {detail.user.email}</span>}
                  {detail.user.phone && <span className="flex items-center gap-1"><Phone size={11} /> {detail.user.phone}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'پۆست', value: detail.user.stats.posts },
                { label: 'کۆمێنت', value: detail.user.stats.comments },
                { label: 'لایک وەرگیراو', value: detail.user.stats.likesReceived },
                { label: 'ستۆری', value: detail.user.stats.stories },
                { label: 'نامەی نێردراو', value: detail.user.stats.messages },
                { label: 'هاوڕێ', value: detail.user.stats.friends },
                { label: 'ڕاپۆرتی کردووە', value: detail.user.stats.reportsMade },
                { label: 'ڕاپۆرت کراوە', value: detail.user.stats.reportsReceived },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-[color:var(--surface-2)]/40 p-2.5 text-center">
                  <p className="text-base font-black text-ink">{formatNumber(item.value)}</p>
                  <p className="mt-0.5 text-[8px] text-muted">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-line p-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-extrabold text-ink">بەکارهێنانی ڕۆژانە · ١٤ ڕۆژ</h4>
                <span className="text-[8px] text-muted-2">ڕۆژانی چالاکی</span>
              </div>
              <div className="mt-3 flex h-16 items-end gap-1">
                {detail.user.activity.map((day) => {
                  const max = Math.max(1, ...detail.user.activity.map((entry) => entry.count));
                  return (
                    <div key={day.day} className="group relative flex-1">
                      <div
                        className={cn(
                          'w-full rounded-t-[3px] transition-colors',
                          day.count > 0 ? 'bg-[color:var(--primary)]/65 group-hover:bg-[color:var(--primary)]' : 'bg-[color:var(--surface-3)]',
                        )}
                        style={{ height: `${Math.max(4, (day.count / max) * 56)}px` }}
                        title={`${day.day}: ${day.count} چالاکی`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[8px] text-muted-2">
                <span>{detail.user.activity[0]?.day}</span>
                <span>{detail.user.activity[detail.user.activity.length - 1]?.day}</span>
              </div>
            </div>

            <div className="grid gap-2 text-[10px] sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">بەرواری تۆمارکردن</p>
                <p className="mt-1 font-bold text-ink">{formatDateTime(detail.user.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">دوایین چالاکی</p>
                <p className="mt-1 font-bold text-ink">{formatDateTime(detail.user.lastActiveAt)}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">دۆخی وشەی نهێنی / 2FA</p>
                <p className="mt-1 font-bold text-ink">{detail.user.emailVerifiedAt ? 'ئیمەیڵ پشتڕاستکراوە' : 'ئیمەیڵ پشتڕاست نەکراوە'}</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">کۆتایی Pro</p>
                <p className="mt-1 font-bold text-ink">{detail.user.proExpiresAt ? formatDateTime(detail.user.proExpiresAt) : '—'}</p>
              </div>
            </div>

            {detail.user.bio && (
              <div className="rounded-xl border border-line p-3">
                <p className="text-[8px] text-muted-2">بایۆ</p>
                <p className="mt-1 whitespace-pre-wrap text-[10px] leading-6 text-muted">{detail.user.bio}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {pending && (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          onConfirm={() => void runAction()}
          title={actionCopy(pending).title}
          description={actionCopy(pending).description}
          confirmLabel={actionCopy(pending).label}
          tone={pending.kind === 'enable' || pending.kind === 'promote' ? 'primary' : 'danger'}
          busy={actionBusy}
        />
      )}
    </div>
  );
}
