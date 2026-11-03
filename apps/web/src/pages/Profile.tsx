import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Ban,
  CalendarDays,
  Check,
  Crown,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber, timeAgo } from '@/lib/format';
import { errorMessage, toast } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { Avatar, EmptyState, PostSkeleton, SectionTitle, Spinner } from '@/components/ui';
import { UserBadges, ProCrownGem } from '@/components/Badges';
import { PostCard } from '@/components/PostCard';
import { UserCard, FollowAction } from '@/components/UserCard';
import type { Post, ProfilePayload, User } from '@/types';

type ProfileTab = 'posts' | 'about';

export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ProfilePayload>(`/api/users/${encodeURIComponent(username)}`);
      setProfile(data);
      const postData = await api<{ posts: Post[]; nextCursor: string | null }>(
        `/api/posts/user/${encodeURIComponent(username)}?limit=12`,
      );
      setPosts(postData.posts);
      setCursor(postData.nextCursor);
    } catch (loadError) {
      setError(errorMessage(loadError));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    setTab('posts');
    void load();
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const loadMore = async () => {
    if (!cursor || loadingPosts) return;
    setLoadingPosts(true);
    try {
      const data = await api<{ posts: Post[]; nextCursor: string | null }>(
        `/api/posts/user/${encodeURIComponent(username)}?limit=12&cursor=${encodeURIComponent(cursor)}`,
      );
      setPosts((current) => [...current, ...data.posts.filter((post) => !current.some((p) => p.id === post.id))]);
      setCursor(data.nextCursor);
    } catch (loadError) {
      toast(errorMessage(loadError), 'error');
    } finally {
      setLoadingPosts(false);
    }
  };

  const addFriend = async () => {
    if (!profile) return;
    setBusy('friend');
    try {
      const result = await api<{ accepted: boolean }>('/api/friends/request', {
        method: 'POST',
        body: { userId: profile.user.id },
      });
      toast(result.accepted ? `ئێستا ${profile.user.name} هاوڕێتن 🤝` : 'داواکاری هاوڕێیەتی نێردرا.', 'success');
      await load();
    } catch (friendError) {
      toast(errorMessage(friendError), 'error');
    } finally {
      setBusy(null);
    }
  };

  const acceptFriend = async () => {
    if (!profile) return;
    setBusy('friend');
    try {
      await api('/api/friends/request', { method: 'POST', body: { userId: profile.user.id } });
      toast(`ئێستا ${profile.user.name} هاوڕێتن 🤝`, 'success');
      await load();
    } catch (friendError) {
      toast(errorMessage(friendError), 'error');
    } finally {
      setBusy(null);
    }
  };

  const removeFriendship = async () => {
    if (!profile?.relationship.friendshipId) return;
    const confirming = profile.relationship.isFriend
      ? 'دڵنیایت لە لابردنی ئەم هاوڕێیەتییە؟'
      : 'دڵنیایت لە هەڵوەشاندنەوەی داواکارییەکە؟';
    if (!window.confirm(confirming)) return;
    setBusy('friend');
    try {
      await api(`/api/friends/${profile.relationship.friendshipId}`, { method: 'DELETE' });
      toast('دووپاتکرایەوە.', 'success');
      await load();
    } catch (friendError) {
      toast(errorMessage(friendError), 'error');
    } finally {
      setBusy(null);
    }
  };

  const message = async () => {
    if (!profile) return;
    setBusy('message');
    try {
      const data = await api<{ conversation: { id: string } }>(`/api/chats/with/${profile.user.id}`, {
        method: 'POST',
      });
      navigate(`/messages/${data.conversation.id}`);
    } catch (messageError) {
      toast(errorMessage(messageError), 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleBlock = async () => {
    if (!profile) return;
    const blocked = profile.relationship.blocked;
    if (!blocked && !window.confirm('دڵنیایت لە بلۆککردنی ئەم بەکارهێنەرە؟')) return;
    setBusy('block');
    try {
      await api(`/api/users/${profile.user.id}/block`, { method: blocked ? 'DELETE' : 'POST' });
      toast(blocked ? 'بلۆکەکە لابرا.' : 'بەکارهێنەرەکە بلۆک کرا.', 'success');
      setMenuOpen(false);
      await load();
    } catch (blockError) {
      toast(errorMessage(blockError), 'error');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: profile?.user.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('بەستەری پرۆفایل کۆپی کرا.', 'success');
      }
    } catch {
      // cancelled
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="panel overflow-hidden">
          <div className="skeleton h-44 w-full rounded-none" />
          <div className="p-5">
            <div className="-mt-14 skeleton h-24 w-24 rounded-full" />
            <div className="skeleton mt-4 h-5 w-48" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        </div>
        <PostSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <EmptyState
        icon={<UserRound size={28} />}
        title="پرۆفایل نەدۆزرایەوە"
        description={error || 'ئەم بەکارهێنەرە بوونی نییە یان ناچالاک کراوە.'}
        action={<button type="button" className="btn-primary !text-xs" onClick={() => void load()}><RefreshCw size={15} /> هەوڵدانەوە</button>}
      />
    );
  }

  const user = profile.user;
  const relationship = profile.relationship;
  const isMe = relationship.isMe || me?.id === user.id;
  const postCount = user._count?.posts ?? posts.length;

  return (
    <div className="page-enter space-y-4">
      <section className="panel overflow-hidden">
        <div className="relative h-40 overflow-hidden sm:h-52">
          {user.coverUrl ? (
            <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundImage: 'var(--gradient-soft)' }}>
              <div className="flex h-full items-center justify-center opacity-30">
                <img src="/logo.svg" alt="" className="h-28 w-28 rounded-3xl" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--bg)]/70 to-transparent" />
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="-mt-14 flex items-end justify-between gap-3 sm:-mt-16">
            <div className="rounded-full border-4 border-[color:var(--surface-solid)] shadow-xl">
              <Avatar user={user} size={104} showOnline />
            </div>
            <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
              {isMe ? (
                <>
                  <Link to="/settings" className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]">
                    <Pencil size={14} /> دەستکاری پرۆفایل
                  </Link>
                  <button type="button" className="icon-btn border border-line" onClick={() => void share()} aria-label="هاوبەشکردن">
                    <Link2 size={17} />
                  </button>
                </>
              ) : (
                <>
                  {!relationship.blocked && relationship.isFriend && (
                    <button
                      type="button"
                      className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px]"
                      onClick={() => void message()}
                      disabled={busy === 'message'}
                    >
                      {busy === 'message' ? <Spinner size={14} /> : <MessageCircle size={14} />} چات
                    </button>
                  )}
                  {!relationship.blocked && !relationship.isFriend && !relationship.incomingRequest && !relationship.outgoingRequest && (
                    <button type="button" className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void addFriend()} disabled={busy === 'friend'}>
                      {busy === 'friend' ? <Spinner size={14} /> : <UserPlus size={14} />} زیادکردنی هاوڕێ
                    </button>
                  )}
                  {!relationship.blocked && relationship.incomingRequest && (
                    <>
                      <button type="button" className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void acceptFriend()} disabled={busy === 'friend'}>
                        <Check size={14} /> پەسەندکردن
                      </button>
                      <button type="button" className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void removeFriendship()} disabled={busy === 'friend'}>
                        <X size={14} /> ڕەتکردنەوە
                      </button>
                    </>
                  )}
                  {!relationship.blocked && relationship.outgoingRequest && (
                    <button type="button" className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void removeFriendship()} disabled={busy === 'friend'}>
                      <UserCheck size={14} /> داواکاری نێردراوە — هەڵوەشاندنەوە
                    </button>
                  )}
                  {relationship.blocked && (
                    <button type="button" className="btn-danger !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void toggleBlock()} disabled={busy === 'block'}>
                      <Ban size={14} /> لابردنی بلۆک
                    </button>
                  )}
                  <div className="relative" ref={menuRef}>
                    <button type="button" className="icon-btn border border-line" onClick={() => setMenuOpen((value) => !value)} aria-label="زیاتر">
                      <MoreHorizontal size={18} />
                    </button>
                    {menuOpen && (
                      <div className="panel absolute left-0 top-11 z-30 w-52 rounded-2xl p-1.5">
                        <button type="button" className="menu-item" onClick={() => void share()}>
                          <Link2 size={15} /> هاوبەشکردنی پرۆفایل
                        </button>
                        {relationship.isFriend && (
                          <button type="button" className="menu-item menu-item-danger" onClick={() => void removeFriendship()}>
                            <Users size={15} /> لابردنی هاوڕێیەتی
                          </button>
                        )}
                        {!relationship.blocked && (
                          <button type="button" className="menu-item menu-item-danger" onClick={() => void toggleBlock()}>
                            <Ban size={15} /> بلۆککردن
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black text-ink">{user.name}</h1>
              <UserBadges user={user} size={19} withProLabel />
              {isMe && user.verificationStatus !== 'VERIFIED' && (
                <Link to="/verification" className="chip chip-active !text-[10px]">
                  <ShieldCheck size={12} /> پشتڕاستکردنەوە
                </Link>
              )}
              {isMe && !user.isPro && (
                <Link to="/pro" className="pro-pill inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold">
                  <Crown size={12} /> Pro
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-muted" dir="ltr">@{user.username}</p>
            {user.bio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-ink/90">{user.bio}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
              {user.city && <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {user.city}</span>}
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> ئەندام لە {formatDate(user.createdAt)}</span>
              {user.online ? (
                <span className="inline-flex items-center gap-1.5 text-[color:var(--success)]">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--success)]" /> ئێستا ئۆنلاینە
                </span>
              ) : (
                <span>دوایین چالاکی: {timeAgo(user.lastActiveAt)}</span>
              )}
              {user.verificationStatus === 'VERIFIED' && (
                <span className="inline-flex items-center gap-1 text-[color:var(--accent)]"><Crown size={12} /> پشتڕاستکراوە</span>
              )}
              {user.isPro && (
                <span className="inline-flex items-center gap-1"><ProCrownGem size={11} /></span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/50 px-4 py-2.5">
                <span className="block text-base font-black text-ink">{formatNumber(postCount)}</span>
                <span className="text-[10px] text-muted">پۆست</span>
              </div>
              <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/50 px-4 py-2.5">
                <span className="block text-base font-black text-ink">{formatNumber(user.friendCount ?? 0)}</span>
                <span className="text-[10px] text-muted">هاوڕێ</span>
              </div>
              <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/50 px-4 py-2.5">
                <span className="block text-base font-black text-ink">{formatNumber(user._count?.stories ?? 0)}</span>
                <span className="text-[10px] text-muted">ستۆری</span>
              </div>
            </div>
          </div>

          <div className="tab-row mt-5">
            <button type="button" className={cn('tab', tab === 'posts' && 'tab-active')} onClick={() => setTab('posts')}>
              پۆستەکان
            </button>
            <button type="button" className={cn('tab', tab === 'about' && 'tab-active')} onClick={() => setTab('about')}>
              دەربارە
            </button>
          </div>
        </div>
      </section>

      {tab === 'posts' ? (
        <div>
          <SectionTitle
            title="پۆستەکان"
            subtitle={user._count ? `${formatNumber(postCount)} بڵاوکراوە` : undefined}
            action={
              <button type="button" className="btn-ghost !rounded-xl !px-2 !py-1 !text-[11px]" onClick={() => void load()}>
                <RefreshCw size={13} /> نوێکردنەوە
              </button>
            }
          />
          {posts.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={<UserRound size={26} />}
                title={isMe ? 'هێشتا پۆستت نییە' : 'هێشتا پۆستێک نییە'}
                description={isMe ? 'یەکەم پۆستت بڵاو بکەرەوە و لەگەڵ هاوڕێکانت هاوبەشی بکە.' : 'کاتێک ئەم بەکارهێنەرە پۆست بڵاو بکاتەوە، لێرە دەردەکەوێت.'}
                action={isMe ? <Link to="/" className="btn-primary !text-xs">بڵاوکردنەوەی پۆست</Link> : undefined}
              />
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => {
                    setPosts((current) => current.filter((post) => post.id !== id));
                    setProfile((current) =>
                      current
                        ? { ...current, user: { ...current.user, _count: { ...(current.user._count || { stories: 0, posts: 0 }), posts: Math.max(0, (current.user._count?.posts || 1) - 1) } } }
                        : current,
                    );
                  }}
                  onChanged={(updated) => setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)))}
                />
              ))}
              {cursor && (
                <div className="flex justify-center pb-4">
                  <button type="button" className="btn-soft !text-xs" onClick={() => void loadMore()} disabled={loadingPosts}>
                    {loadingPosts ? <Spinner size={14} /> : null} بینینی زیاتر
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="panel space-y-4 p-5">
          <SectionTitle title="دەربارەی بەکارهێنەر" className="!mb-1" />
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={<UserRound size={15} />} label="ناو" value={user.name} />
            <InfoRow icon={<UserRound size={15} />} label="ناوی بەکارهێنەر" value={`@${user.username}`} ltr />
            <InfoRow icon={<MapPin size={15} />} label="شار" value={user.city || 'نەناسراوە'} />
            <InfoRow icon={<CalendarDays size={15} />} label="ڕۆژی لەدایکبوون" value={user.birthDate ? formatDate(user.birthDate) : 'نەناسراوە'} />
            <InfoRow icon={<Users size={15} />} label="هاوڕێیان" value={formatNumber(user.friendCount ?? 0)} />
            <InfoRow icon={<CalendarDays size={15} />} label="ئەندامبوون" value={formatDate(user.createdAt)} />
          </div>
          {user.email && isMe && <InfoRow icon={<ShieldCheck size={15} />} label="ئیمەیڵ" value={user.email} ltr />}
          {user.phone && isMe && <InfoRow icon={<ShieldCheck size={15} />} label="مۆبایل" value={user.phone} ltr />}
          <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink"><ShieldCheck size={14} className="text-[color:var(--primary)]" /> ناسنامەی بەکارهێنەر</p>
            <p className="mt-2 text-[11px] leading-6 text-muted">
              {user.verificationStatus === 'VERIFIED'
                ? 'ئەم هەژمارە لەلایەن تیمەکانی کورد بووک پشتڕاست کراوەتەوە. تاجی ئاڵتوونی نیشانەی ئەندامێکی ڕاستەقینەیە.'
                : 'هەژماری پشتڕاستکراو تاجی ئاڵتوونی وەردەگرێت و متمانەی زیاتری هاوڕێیان دەدەستێنێت.'}
            </p>
            {isMe && user.verificationStatus !== 'VERIFIED' && (
              <Link to="/verification" className="btn-primary mt-3 !text-[11px]"><ShieldCheck size={14} /> پشتڕاستکردنەوەی ئێستا</Link>
            )}
          </div>
        </div>
      )}

      {isMe && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs font-extrabold text-ink">هاوڕێی نوێ بدۆزەرەوە</p>
            <p className="mt-1 text-[11px] text-muted">لە پەڕەی دۆزینەوە کەسانی نوێ بناسە و چات دەست پێبکە.</p>
          </div>
          <Link to="/explore" className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]"><Users size={14} /> دۆزینەوە</Link>
        </div>
      )}

      {!isMe && relationship.isFriend && me && (
        <div className="panel p-4">
          <UserCard user={{ ...user, online: user.online }} subtitle="هاوڕێن" compact />
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/35 px-3 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] text-muted">{label}</span>
        <span className="block truncate text-xs font-bold text-ink" dir={ltr ? 'ltr' : undefined}>{value}</span>
      </span>
    </div>
  );
}
