import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Compass,
  Crown,
  Hash,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage, toast } from '@/stores/toast';
import { UserCard, FollowAction } from '@/components/UserCard';
import { PostCard } from '@/components/PostCard';
import { EmptyState, PostSkeleton, SectionTitle, Spinner, Skeleton } from '@/components/ui';
import type { Post, User } from '@/types';

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ suggestions: User[] }>('/api/friends/suggestions'),
      api<{ posts: Post[] }>('/api/posts/feed?limit=8'),
    ])
      .then(([suggestionData, postData]) => {
        if (cancelled) return;
        setSuggestions(suggestionData.suggestions);
        setPosts(postData.posts);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(trimmed)}&limit=30`);
        setResults(data.users);
        setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
      } catch (error) {
        toast(errorMessage(error), 'error');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const addFriend = async (user: User) => {
    setBusy(user.id);
    try {
      const result = await api<{ accepted: boolean }>('/api/friends/request', {
        method: 'POST',
        body: { userId: user.id },
      });
      toast(result.accepted ? `ئێستا ${user.name} هاوڕێتن 🤝` : 'داواکاری هاوڕێیەتی نێردرا.', 'success');
      setSuggestions((current) => current.filter((item) => item.id !== user.id));
      setResults((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="page-enter space-y-4">
      <section className="panel relative overflow-hidden p-5 sm:p-7">
        <div className="absolute inset-0 -z-10 opacity-80" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[color:var(--primary)]/10 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--primary)]">
            <Compass size={14} /> دۆزینەوە
          </p>
          <h1 className="mt-2 font-display text-2xl font-black text-ink sm:text-3xl">کوردستان پێکەوە</h1>
          <p className="mt-1.5 max-w-lg text-[11px] leading-6 text-muted">
            کەس، ناو یان شار بگەڕێ. هاوڕێی نوێ بدۆزەرەوە و پەیوەندی دروست بکە.
          </p>

          <div className="relative mt-5">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="گەڕان… بۆ نموونە «هەولێر» یان «ئاراس»"
              className="input !rounded-2xl !py-3.5 !pr-12 !pl-12"
              autoFocus={Boolean(searchParams.get('q'))}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-muted hover:text-ink"
                aria-label="پاککردنەوە"
              >
                <X size={14} />
              </button>
            )}
            {searching && (
              <span className="absolute left-12 top-1/2 -translate-y-1/2">
                <Spinner size={16} className="text-[color:var(--primary)]" />
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: 'پشتڕاستکراو', icon: ShieldCheck },
              { label: 'Pro', icon: Crown },
              { label: 'لایڤ', icon: Radio },
            ].map((tag) => (
              <span key={tag.label} className="chip !text-[10px]">
                <tag.icon size={11} /> {tag.label}
              </span>
            ))}
            <span className="chip !text-[10px]"><Hash size={11} /> کوردستان</span>
          </div>
        </div>
      </section>

      {trimmed ? (
        <section className="panel p-4 sm:p-5">
          <SectionTitle
            title={`ئەنجامی گەڕان بۆ «${trimmed}»`}
            subtitle={searching ? 'دەگەڕێت…' : `${results.length} بەکارهێنەر`}
            action={
              <button type="button" className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={clearSearch}>
                <X size={13} /> پاککردنەوە
              </button>
            }
          />
          {searching && results.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-2.5 w-24" /></div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Search size={26} />}
              title="هیچ ئەنجامێک نەدۆزرایەوە"
              description="ناوی تر یان شارێکی تر تاقی بکەرەوە."
            />
          ) : (
            <div className="space-y-1">
              {results.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  actions={
                    <FollowAction
                      label="هاوڕێ"
                      icon="add"
                      variant="soft"
                      loading={busy === user.id}
                      onClick={() => void addFriend(user)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="panel p-4 sm:p-5">
            <SectionTitle
              title="لەوانەیە بناسیت"
              subtitle="بەپێی چالاکی و پشتڕاستکردنەوە"
              action={<Link to="/friends" className="text-[11px] font-bold text-[color:var(--primary)] hover:underline">هاوڕێیان</Link>}
            />
            {loading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <EmptyState icon={<Users size={25} />} title="ئێستا پێشنیار نییە" description="دوای ماوەیەک دووبارە سەردانی ئەم پەڕەیە بکە." />
            ) : (
              <div className="grid gap-1 lg:grid-cols-2">
                {suggestions.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    actions={
                      <FollowAction
                        label="هاوڕێ"
                        icon="add"
                        variant="soft"
                        loading={busy === user.id}
                        onClick={() => void addFriend(user)}
                      />
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              title="نوێترین بڵاوکراوەکان"
              subtitle="پۆستی گشتی و هاوڕێیان"
              action={<Link to="/" className="text-[11px] font-bold text-[color:var(--primary)] hover:underline">ماڵەوە</Link>}
            />
            {loading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="panel">
                <EmptyState icon={<Sparkles size={26} />} title="هێشتا پۆست نییە" description="یەکەم پۆست بڵاو بکەرەوە." />
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
                  onChanged={(updated) => setPosts((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
