import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Crown,
  Flag,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  formatDayShort,
  formatNumber,
  timeAgo,
} from '@/lib/format';
import {
  Alert,
  Avatar,
  Badge,
  EmptyState,
  SkeletonLine,
  StatCard,
  reviewBadge,
  verificationBadge,
} from '@/components/ui';
import { errorMessage } from '@/stores/toast';
import type { AdminStats } from '@/types';

function ActivityChart({ data }: { data: AdminStats['daily'] }) {
  const width = 760;
  const height = 230;
  const paddingX = 28;
  const paddingY = 24;
  const max = Math.max(1, ...data.map((point) => Math.max(point.active, point.messages, point.newUsers)));

  const xFor = (index: number) =>
    data.length <= 1
      ? width / 2
      : paddingX + (index * (width - paddingX * 2)) / (data.length - 1);
  const yFor = (value: number) =>
    height - paddingY - (value / max) * (height - paddingY * 2);

  const line = (key: 'active' | 'messages' | 'newUsers') =>
    data.map((point, index) => `${xFor(index)},${yFor(point[key])}`).join(' ');

  const area = `M ${xFor(0)} ${height - paddingY} L ${data
    .map((point, index) => `${xFor(index)} ${yFor(point.messages)}`)
    .join(' L ')} L ${xFor(data.length - 1)} ${height - paddingY} Z`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[9px] font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" /> چالاکی ڕۆژانە
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" /> نامەکان
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[color:var(--info)]" /> بەکارهێنەری نوێ
        </span>
        <span className="ms-auto text-muted-2">لووتکە: {formatNumber(max)}</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[195px] w-full" role="img" aria-label="چالاکی ١٤ ڕۆژی کورد بووک">
        <defs>
          <linearGradient id="messages-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="active-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#42dfb4" />
            <stop offset="100%" stopColor="#7effd9" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = paddingY + fraction * (height - paddingY * 2);
          return (
            <g key={fraction}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 6"
                strokeWidth="1"
              />
              <text
                x={width - paddingX + 8}
                y={y + 3}
                fill="var(--muted-2)"
                fontSize="8"
                textAnchor="start"
              >
                {formatNumber(Math.round(max * (1 - fraction)))}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#messages-area)" />
        <polyline
          points={line('messages')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.7"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.75"
        />
        <polyline
          points={line('newUsers')}
          fill="none"
          stroke="var(--info)"
          strokeWidth="1.4"
          strokeDasharray="4 5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        <polyline
          points={line('active')}
          fill="none"
          stroke="url(#active-line)"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((point, index) => (
          <g key={point.day}>
            <circle cx={xFor(index)} cy={yFor(point.active)} r="3.2" fill="var(--bg)" stroke="var(--primary)" strokeWidth="1.6">
              <title>{`${point.day} — ${point.active} چالاک، ${point.messages} نامە، ${point.newUsers} نوێ`}</title>
            </circle>
            {(index % 2 === 0 || index === data.length - 1) && (
              <text
                x={xFor(index)}
                y={height - 5}
                fill="var(--muted-2)"
                fontSize="8"
                textAnchor="middle"
              >
                {formatDayShort(point.day)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function QueueCard({
  title,
  count,
  icon,
  to,
  accent,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  to: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel overflow-hidden rounded-2xl">
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent)}>{icon}</span>
        <div className="flex-1">
          <h3 className="text-[11px] font-extrabold text-ink">{title}</h3>
          <p className="mt-0.5 text-[9px] text-muted">{count ? `${count} چاوەڕوان` : 'هیچ چاوەڕوانێک نییە'}</p>
        </div>
        <Link to={to} className="btn-ghost !px-2 !py-1 !text-[9px]">
          بینین <ArrowLeft size={12} />
        </Link>
      </header>
      <div className="divide-y divide-[color:var(--border)]">{children}</div>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await adminApi<AdminStats>('/api/admin/stats'));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 45_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const peakDay = useMemo(() => {
    if (!data?.daily.length) return null;
    return data.daily.reduce((best, point) => (point.active > best.active ? point : best), data.daily[0]!);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="panel rounded-2xl p-4">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="mt-3 h-7 w-16" />
              <SkeletonLine className="mt-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="panel rounded-2xl p-5"><SkeletonLine className="h-52 w-full" /></div>
          <div className="panel rounded-2xl p-5"><SkeletonLine className="h-52 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-2">
            <Sparkles size={11} /> کورتەی ڕۆژ
          </p>
          <h2 className="mt-1 text-lg font-black text-ink">بەخێربێیتەوە، {data?.recentUsers ? 'بەڕێوەبەر' : 'بەڕێوەبەر'} 👋</h2>
          <p className="mt-1 text-[10px] text-muted">ئەمە وێنەیەکی خێرای کورد بووکە لەم ساتەدا.</p>
        </div>
        <button type="button" className="btn-soft" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          نوێکردنەوە
        </button>
      </div>

      {error && (
        <Alert kind="error">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" className="btn-ghost !px-2 !py-1 !text-[9px]" onClick={() => void load()}>هەوڵدانەوە</button>
          </div>
        </Alert>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="کۆی بەکارهێنەران"
              value={formatNumber(data.totals.totalUsers)}
              hint={`${formatNumber(data.totals.newToday)} ئەمڕۆ زیادکرا`}
              icon={<Users size={16} />}
              tone="info"
            />
            <StatCard
              label="چالاکی ئەمڕۆ"
              value={formatNumber(data.totals.activeToday)}
              hint={peakDay ? `لووتکە: ${formatDayShort(peakDay.day)} · ${formatNumber(peakDay.active)}` : undefined}
              icon={<Activity size={16} />}
              tone="success"
            />
            <StatCard
              label="کۆی نامەکان"
              value={formatNumber(data.totals.totalMessages)}
              hint={`${formatNumber(data.totals.totalPosts)} پۆست · ${formatNumber(data.totals.activeStories)} ستۆری`}
              icon={<MessageCircle size={16} />}
              tone="gold"
            />
            <StatCard
              label="پشتڕاستکراوەکان"
              value={formatNumber(data.totals.verifiedUsers)}
              hint={`${formatNumber(data.totals.proUsers)} ئەندامی Pro`}
              icon={<ShieldCheck size={16} />}
              tone="gold"
            />
            <StatCard
              label="چاوەڕوانی پشتڕاستکردنەوە"
              value={formatNumber(data.totals.pendingVerifications)}
              hint="ناسنامە + سێلفی"
              icon={<ShieldCheck size={16} />}
              tone="warning"
            />
            <StatCard
              label="چاوەڕوانی Pro"
              value={formatNumber(data.totals.pendingPro)}
              hint="پسووڵە و پارەدان"
              icon={<Crown size={16} />}
              tone="warning"
            />
            <StatCard
              label="ڕاپۆرتی کراوە"
              value={formatNumber(data.totals.openReports)}
              hint="پێویستی بە پشکنین"
              icon={<Flag size={16} />}
              tone={data.totals.openReports > 0 ? 'danger' : 'success'}
            />
            <StatCard
              label="هەژماری ناچالاک"
              value={formatNumber(data.totals.disabledUsers)}
              hint="دەستگەیشتنیان بلۆک کراوە"
              icon={<Users size={16} />}
              tone="neutral"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <div className="panel rounded-2xl p-4 sm:p-5">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <BarChart3 size={15} className="text-[color:var(--primary)]" />
                    چالاکی ١٤ ڕۆژی ڕابردوو
                  </h3>
                  <p className="mt-1 text-[9px] text-muted">چالاکی بەکارهێنەر، نامە و بەکارهێنەری نوێ بەپێی ڕۆژی UTC</p>
                </div>
                <Badge tone="info">{data.daily.length} ڕۆژ</Badge>
              </div>
              <div className="mt-4">
                <ActivityChart data={data.daily} />
              </div>
            </div>

            <div className="panel rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-ink">بەکارهێنەرە نوێیەکان</h3>
                  <p className="mt-1 text-[9px] text-muted">دوایین شەش هەژماری تۆمارکراو</p>
                </div>
                <Link to="/users" className="btn-ghost !px-2 !py-1 !text-[9px]">هەموو <ArrowLeft size={12} /></Link>
              </div>
              <div className="mt-3 space-y-1">
                {data.recentUsers.length === 0 ? (
                  <EmptyState icon={<UserPlus size={20} />} title="هێشتا بەکارهێنەر نییە" />
                ) : (
                  data.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2.5 rounded-xl px-1.5 py-2 transition-colors hover:bg-[color:var(--surface-2)]/60">
                      <Avatar user={user} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-extrabold text-ink">{user.name}</p>
                        <p className="mt-0.5 truncate text-[8px] text-muted">@{user.username} · {timeAgo(user.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {user.verificationStatus === 'VERIFIED' && <Badge tone="gold">تاج</Badge>}
                        {user.isPro && <Badge tone="info">PRO</Badge>}
                        {user.role === 'ADMIN' && <Badge tone="warning">ADMIN</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <QueueCard
              title="پشتڕاستکردنەوەی نوێ"
              count={data.totals.pendingVerifications}
              icon={<ShieldCheck size={15} />}
              to="/verifications"
              accent="bg-amber-400/10 text-amber-300"
            >
              {data.queues.verifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-[10px] text-muted">هیچ داواکارییەکی چاوەڕوان نییە.</p>
              ) : (
                data.queues.verifications.slice(0, 3).map((request) => (
                  <Link key={request.id} to="/verifications" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[color:var(--surface-2)]/50">
                    <Avatar user={request.user} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold text-ink">{request.user.name}</p>
                      <p className="mt-0.5 text-[8px] text-muted">{timeAgo(request.createdAt)}</p>
                    </div>
                    {verificationBadge(request.status)}
                  </Link>
                ))
              )}
            </QueueCard>

            <QueueCard
              title="داواکاری Pro"
              count={data.totals.pendingPro}
              icon={<Crown size={15} />}
              to="/pro"
              accent="bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
            >
              {data.queues.proRequests.length === 0 ? (
                <p className="px-4 py-6 text-center text-[10px] text-muted">هیچ داواکارییەکی چاوەڕوان نییە.</p>
              ) : (
                data.queues.proRequests.slice(0, 3).map((request) => (
                  <Link key={request.id} to="/pro" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[color:var(--surface-2)]/50">
                    <Avatar user={request.user} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold text-ink">{request.user.name}</p>
                      <p className="mt-0.5 text-[8px] text-muted">{request.provider} · {request.plan === 'YEARLY' ? 'ساڵانە' : 'مانگانە'}</p>
                    </div>
                    {reviewBadge(request.status)}
                  </Link>
                ))
              )}
            </QueueCard>

            <QueueCard
              title="ڕاپۆرتە کراوەکان"
              count={data.totals.openReports}
              icon={<Flag size={15} />}
              to="/reports"
              accent="bg-orange-400/10 text-orange-300"
            >
              {data.queues.reports.length === 0 ? (
                <p className="px-4 py-6 text-center text-[10px] text-muted">هیچ ڕاپۆرتێکی کراوە نییە.</p>
              ) : (
                data.queues.reports.slice(0, 3).map((report) => (
                  <Link key={report.id} to="/reports" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[color:var(--surface-2)]/50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300">
                      <Flag size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold text-ink">{report.reason}</p>
                      <p className="mt-0.5 truncate text-[8px] text-muted">لەلایەن {report.reporter.name} · {timeAgo(report.createdAt)}</p>
                    </div>
                    <Badge tone="danger">کراوە</Badge>
                  </Link>
                ))
              )}
            </QueueCard>
          </div>
        </>
      )}
    </div>
  );
}
