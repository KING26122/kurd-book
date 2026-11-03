import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Crown, Radio, RefreshCw, Sparkles, Users, WifiOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { greeting } from '@/lib/format';
import { errorMessage, toast } from '@/stores/toast';
import { Composer, ComposerPrompt } from '@/components/Composer';
import { PostCard } from '@/components/PostCard';
import { StoryBar } from '@/components/StoryBar';
import { EmptyState, PostSkeleton, Spinner } from '@/components/ui';
import type { Post } from '@/types';

export function FeedPage() {
  const user = useAuthStore((state) => state.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api<{ posts: Post[]; nextCursor: string | null }>('/api/posts/feed?limit=12');
      setPosts(data.posts);
      setCursor(data.nextCursor);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load(true);
    window.addEventListener('kurdbook:feed-refresh', refresh);
    return () => window.removeEventListener('kurdbook:feed-refresh', refresh);
  }, [load]);

  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId) return;
    if (posts.some((post) => post.id === postId)) return;
    api<{ post: Post }>(`/api/posts/${postId}`)
      .then((data) => {
        setPosts((current) => [data.post, ...current.filter((post) => post.id !== data.post.id)]);
      })
      .catch(() => undefined)
      .finally(() => {
        searchParams.delete('post');
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ posts: Post[]; nextCursor: string | null }>(
        `/api/posts/feed?limit=12&cursor=${encodeURIComponent(cursor)}`,
      );
      setPosts((current) => {
        const known = new Set(current.map((post) => post.id));
        return [...current, ...data.posts.filter((post) => !known.has(post.id))];
      });
      setCursor(data.nextCursor);
    } catch (loadError) {
      toast(errorMessage(loadError), 'error');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !loadingMore) void loadMore();
      },
      { rootMargin: '500px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore, loadingMore]);

  const firstName = user?.name.split(' ')[0] || user?.name;

  return (
    <div className="page-enter space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-line p-5 sm:p-6">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--primary)]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--primary)]">
              <Sparkles size={13} /> {greeting()}
            </p>
            <h1 className="mt-2 font-display text-2xl font-black text-ink sm:text-3xl">{firstName}، بەخێربێیتەوە</h1>
            <p className="mt-1.5 max-w-md text-[11px] leading-6 text-muted">
              کوردستان لێرەیە. پۆست، ستۆری و گفتوگۆی پارێزراو لەگەڵ هاوڕێکانت.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/live" className="btn-soft !rounded-2xl !px-3 !py-2 !text-[11px]">
              <Radio size={15} className="text-rose-400" /> لایڤ
            </Link>
            <Link to="/pro" className="btn-soft !rounded-2xl !px-3 !py-2 !text-[11px]">
              <Crown size={15} className="text-[color:var(--accent)]" /> Pro
            </Link>
            <button
              type="button"
              onClick={() => void load(true)}
              className="btn-soft !rounded-2xl !px-3 !py-2 !text-[11px]"
            >
              <RefreshCw size={14} /> نوێکردنەوە
            </button>
          </div>
        </div>
      </section>

      <StoryBar />
      <ComposerPrompt onOpen={() => setComposerOpen(true)} />

      {loading ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : error ? (
        <div className="panel">
          <EmptyState
            icon={<WifiOff size={28} />}
            title="فید نەکرایەوە"
            description={error}
            action={
              <button type="button" className="btn-primary !text-xs" onClick={() => void load()}>
                <RefreshCw size={14} /> هەوڵدانەوە
              </button>
            }
          />
        </div>
      ) : posts.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Users size={28} />}
            title="ماڵەوە هێشتا بەتاڵە"
            description="یەکەم پۆستت بڵاو بکەرەوە، یان هاوڕێی نوێ بدۆزەرەوە بۆ ئەوەی فیدەکەت پڕ بێت."
            action={
              <div className="flex gap-2">
                <button type="button" className="btn-primary !text-xs" onClick={() => setComposerOpen(true)}>
                  پۆستێک بنووسە
                </button>
                <Link to="/explore" className="btn-soft !text-xs">دۆزینەوەی کەس</Link>
              </div>
            }
          />
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
              onChanged={(updated) =>
                setPosts((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
              }
            />
          ))}
          <div ref={sentinelRef} className="flex justify-center py-5">
            {loadingMore ? (
              <Spinner className="text-[color:var(--primary)]" size={22} />
            ) : cursor ? (
              <button type="button" className="btn-soft !text-xs" onClick={() => void loadMore()}>
                پۆستی زیاتر
              </button>
            ) : (
              <p className="text-[10px] text-muted-2">گەیشتیتە کۆتایی فیدەکە ✨</p>
            )}
          </div>
        </div>
      )}

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(post) => setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)])}
      />
    </div>
  );
}
