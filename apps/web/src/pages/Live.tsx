import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  MonitorUp,
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Wifi,
} from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useParticipants,
} from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import '@livekit/components-styles';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { errorMessage, toast } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { Alert, Avatar, EmptyState, Modal, SectionTitle, Skeleton, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import type { LiveRoom, LiveTokenPayload } from '@/types';

interface LiveListPayload {
  livekitEnabled: boolean;
  rooms: LiveRoom[];
}

export function LivePage() {
  const [data, setData] = useState<LiveListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api<LiveListPayload>('/api/live');
      setData(payload);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 2) return;
    setStarting(true);
    try {
      const result = await api<{ room: { id: string }; resumed: boolean }>('/api/live/start', {
        method: 'POST',
        body: { title: title.trim() },
      });
      toast(result.resumed ? 'لایڤی پێشووت هێشتا چالاکە — گەڕایتەوە.' : 'لایڤەکەت دەستی پێکرد! 🎥', 'success');
      setStartOpen(false);
      setTitle('');
      navigate(`/live/${result.room.id}`);
    } catch (startError) {
      toast(errorMessage(startError), 'error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-line p-5 sm:p-7">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="chip !border-rose-400/30 !bg-rose-400/10 !text-rose-200">
              <span className="live-pulse h-2 w-2 rounded-full bg-rose-400" /> LIVE
            </span>
            <h1 className="mt-3 font-display text-2xl font-black text-ink sm:text-3xl">لایڤی کورد بووک</h1>
            <p className="mt-1.5 max-w-lg text-[11px] leading-6 text-muted">
              لایڤ پەخش بکە، شاشەت هاوبەش بکە و لەگەڵ هاوڕێکانت ڕاستەوخۆ قسە بکە. ئەندامانی Pro بە کوالیتی 1080p پەخش دەکەن.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip !text-[10px]"><Video size={12} /> کامێرا</span>
              <span className="chip !text-[10px]"><MonitorUp size={12} /> شاشە هاوبەشکردن</span>
              <span className="chip !text-[10px]"><Users size={12} /> تا ١٠٠ بینەر</span>
              <span className="pro-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold">
                <Crown size={11} /> 1080p بۆ Pro
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary !rounded-2xl"
            onClick={() => setStartOpen(true)}
            disabled={data ? !data.livekitEnabled : false}
          >
            <Radio size={17} /> دەستپێکردنی لایڤ
          </button>
        </div>
      </section>

      {data && !data.livekitEnabled && (
        <Alert kind="warning">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 font-extrabold"><AlertTriangle size={14} /> خزمەتگوزاری لایڤ هێشتا ڕێک نەخراوە</p>
              <p className="mt-1 text-[11px] leading-6">
                بۆ چالاککردنی لایڤ و شاشە هاوبەشکردن، لە فایلی <code className="rounded bg-white/10 px-1">.env</code> ی سێرڤەر
                <code className="mx-1 rounded bg-white/10 px-1">LIVEKIT_URL</code>،
                <code className="mx-1 rounded bg-white/10 px-1">LIVEKIT_API_KEY</code> و
                <code className="mx-1 rounded bg-white/10 px-1">LIVEKIT_API_SECRET</code> دابنێ. دەتوانیت LiveKit Cloud یان سێرڤەرێکی خۆت بەکاربهێنیت.
              </p>
            </div>
            <a href="https://livekit.io" target="_blank" rel="noreferrer" className="btn-soft !rounded-xl !px-3 !py-1.5 !text-[11px]">
              <Settings2 size={13} /> ڕێنمایی LiveKit
            </a>
          </div>
        </Alert>
      )}

      {error && (
        <Alert kind="error">
          {error}
          <button type="button" className="ms-2 font-bold underline" onClick={() => void load()}>هەوڵدانەوە</button>
        </Alert>
      )}

      <section className="panel p-4 sm:p-5">
        <SectionTitle
          title="ئێستا لە پەخشدا"
          subtitle="هەموو لایڤە چالاکەکان"
          action={
            <button type="button" className="btn-ghost !rounded-xl !px-2 !py-1 !text-[11px]" onClick={() => void load()}>
              <RefreshCw size={13} /> نوێکردنەوە
            </button>
          }
        />
        {loading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-line">
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="space-y-2 p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : !data || data.rooms.length === 0 ? (
          <EmptyState
            icon={<Radio size={28} />}
            title="هیچ لایڤێکی چالاک نییە"
            description="یەکەم کەس بە کە لایڤەکەت دەست پێبکات. هاوڕێکانت دەتوانن سەیرت بکەن و لە چاتدا قسە بکەن."
            action={<button type="button" className="btn-primary !text-xs" onClick={() => setStartOpen(true)} disabled={data ? !data.livekitEnabled : false}><Radio size={15} /> دەستپێکردن</button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.rooms.map((room) => (
              <Link
                key={room.id}
                to={`/live/${room.id}`}
                className="group overflow-hidden rounded-3xl border border-line bg-[color:var(--surface-solid)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--primary)]/35 hover:shadow-lg"
              >
                <div className="relative flex h-40 items-center justify-center overflow-hidden" style={{ backgroundImage: 'var(--gradient-soft)' }}>
                  <Avatar user={room.host} size={78} ring />
                  <span className="live-pulse absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[9px] font-black text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
                  </span>
                  {room.host.isPro && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/40 p-1.5 text-amber-300 backdrop-blur">
                      <Crown size={14} />
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                    <Users size={11} /> {room.participantCount ?? 0}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-extrabold text-ink group-hover:text-[color:var(--primary)]">{room.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar user={room.host} size={26} />
                    <span className="truncate text-[11px] font-bold text-ink">{room.host.name}</span>
                    <UserBadges user={room.host} size={12} />
                  </div>
                  <p className="mt-2 text-[10px] text-muted">دەستی پێکرد {timeAgo(room.startedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Video, title: 'کامێرا و دەنگ', body: 'بە یەک کلیک کامێرا و مایکت چالاک بکە. شاشەت هاوبەش بکە.' },
          { icon: ShieldCheck, title: 'بینەری پارێزراو', body: 'تەنها بەکارهێنەرانی چووەژوور دەتوانن لایڤەکەت ببینن.' },
          { icon: Sparkles, title: 'کوالیتی Pro', body: 'ئەندامانی Pro بە 1080p و bitrate بەرزتر پەخش دەکەن.' },
        ].map((item) => (
          <div key={item.title} className="panel p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)]"><item.icon size={18} /></span>
            <p className="mt-3 text-xs font-extrabold text-ink">{item.title}</p>
            <p className="mt-1 text-[10px] leading-5 text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="لایڤێکی نوێ دەست پێبکە"
        subtitle={user?.isPro ? 'وەک ئەندامی Pro، پەخشەکەت بە کوالیتی 1080p دەبێت.' : 'بە کوالیتی 720p پەخش دەکەیت. بۆ 1080p بەشداربە لە Pro.'}
        size="sm"
      >
        <form onSubmit={start} className="space-y-4">
          <div>
            <label className="label" htmlFor="live-title">ناونیشانی لایڤ</label>
            <input
              id="live-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 90))}
              className="input"
              placeholder="بۆ نموونە: چاوپێکەوتن لە هەولێر"
              maxLength={90}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/40 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-rose-400"><Wifi size={17} /></span>
            <p className="text-[10px] leading-5 text-muted">
              پەخشەکە لە پەڕەی لایڤ دەردەکەوێت. کاتێک کۆتایی پێدەهێنیت، بینەران دەتوانن دەربچن.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={starting || title.trim().length < 2}>
              {starting ? <Spinner size={16} /> : <Radio size={16} />} دەستپێکردن
            </button>
            <button type="button" className="btn-soft" onClick={() => setStartOpen(false)}>پاشگەزبوونەوە</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LiveRoomPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [livekitEnabled, setLivekitEnabled] = useState(true);
  const [token, setToken] = useState<LiveTokenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ room: LiveRoom; livekitEnabled: boolean }>(`/api/live/${id}`);
      setRoom(data.room);
      setLivekitEnabled(data.livekitEnabled);
      if (!data.room.isLive) setEnded(true);
      if (data.livekitEnabled && data.room.isLive) {
        setConnecting(true);
        const payload = await api<LiveTokenPayload>(`/api/live/${id}/token`, { method: 'POST' });
        setToken(payload);
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const endLive = async () => {
    if (!room || !window.confirm('دڵنیایت لایڤەکە کۆتایی پێدەهێنیت؟')) return;
    try {
      await api(`/api/live/${room.id}/end`, { method: 'POST' });
      setEnded(true);
      toast('لایڤەکە کۆتایی هات.', 'success');
      navigate('/live');
    } catch (endError) {
      toast(errorMessage(endError), 'error');
    }
  };

  if (loading) {
    return (
      <div className="panel flex min-h-[55vh] flex-col items-center justify-center gap-3">
        <Spinner size={26} className="text-[color:var(--primary)]" />
        <p className="text-xs text-muted">لایڤ ئامادە دەکرێت…</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Radio size={28} />}
          title="لایڤ نەکرایەوە"
          description={error || 'لایڤەکە نەدۆزرایەوە یان کۆتایی هاتووە.'}
          action={
            <div className="flex gap-2">
              <button type="button" className="btn-primary !text-xs" onClick={() => void load()}><RefreshCw size={14} /> هەوڵدانەوە</button>
              <Link to="/live" className="btn-soft !text-xs">گەڕانەوە بۆ لایڤ</Link>
            </div>
          }
        />
      </div>
    );
  }

  if (ended) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Radio size={28} />}
          title="لایڤەکە کۆتایی هات"
          description={`«${room.title}» لەلایەن ${room.host.name} کۆتایی پێهێنرا.`}
          action={<Link to="/live" className="btn-primary !text-xs"><ArrowRight size={15} /> گەڕانەوە بۆ لایڤ</Link>}
        />
      </div>
    );
  }

  if (!livekitEnabled || !token) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/live" className="icon-btn" aria-label="گەڕانەوە"><ArrowRight size={19} /></Link>
          <h1 className="text-base font-extrabold text-ink">{room.title}</h1>
        </div>
        <Alert kind="warning">
          لایڤی ڤیدیۆیی ڕێک نەخراوە. بۆ بینینی ئەم لایڤە پێویستە بەڕێوەبەر LiveKit ڕێکبخات
          (<code className="rounded bg-white/10 px-1">LIVEKIT_URL</code>،
          <code className="mx-1 rounded bg-white/10 px-1">LIVEKIT_API_KEY</code>،
          <code className="mx-1 rounded bg-white/10 px-1">LIVEKIT_API_SECRET</code>).
        </Alert>
        <div className="panel flex items-center gap-3 p-4">
          <Avatar user={room.host} size={48} ring />
          <div><p className="text-sm font-extrabold text-ink">{room.host.name}</p><p className="text-[11px] text-muted">خاوەنی لایڤ</p></div>
        </div>
      </div>
    );
  }

  const isHost = token.isHost;
  const capture = token.maxHeight >= 1080 ? VideoPresets.h1080 : VideoPresets.h720;

  return (
    <div className="page-enter">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/live" className="icon-btn shrink-0" aria-label="گەڕانەوە"><ArrowRight size={19} /></Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold text-ink">{room.title}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-1.5 py-0.5 font-black text-rose-300">
                <span className="live-pulse h-1.5 w-1.5 rounded-full bg-rose-400" /> LIVE
              </span>
              <span>{token.host.name}</span>
              <UserBadges user={token.host} size={11} />
              {token.isPro && <span className="chip pro-pill !px-1.5 !py-0 !text-[8px]">PRO 1080p</span>}
            </p>
          </div>
        </div>
        {isHost && (
          <button type="button" className="btn-danger !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void endLive()}>
            کۆتاییپێهێنانی لایڤ
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-black" dir="ltr">
        <LiveKitRoom
          token={token.token}
          serverUrl={token.serverUrl}
          connect
          audio={isHost}
          video={isHost}
          options={{
            videoCaptureDefaults: {
              resolution: capture.resolution,
            },
          }}
          onDisconnected={() => {
            if (!isHost) toast('پەیوەندی لایڤ هەڵوەشایەوە.', 'info');
          }}
          onError={(livekitError) => toast(livekitError.message || 'هەڵەی لایڤ', 'error')}
          className="min-h-[60vh]"
          data-lk-theme="default"
        >
          <VideoConference />
          <RoomAudioRenderer />
          <LiveRoomBadge isHost={isHost} />
        </LiveKitRoom>
      </div>
      <p className="mt-2 px-1 text-[10px] leading-5 text-muted">
        {isHost
          ? 'بۆ شاشە هاوبەشکردن لە نوارەی کۆنترۆل ئایکۆنی شاشەکە بەکاربهێنە. بینەران تەنها دەبینن و دەبیستن.'
          : `تۆ وەک بینەر لەم لایڤەدا ئامادەیت. ${me?.isPro ? 'Pro ـت چالاکە.' : 'بۆ لایڤی خۆت بە 1080p، بەشداربە لە Pro.'}`}
      </p>
    </div>
  );
}

function LiveRoomBadge({ isHost }: { isHost: boolean }) {
  const participants = useParticipants();
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
      <span className="live-pulse h-1.5 w-1.5 rounded-full bg-rose-400" />
      {isHost ? 'پەخش' : 'بینەر'} · {participants.length}
    </div>
  );
}
