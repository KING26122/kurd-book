import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Comment, MediaItem, Post } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatNumber, timeAgo } from '@/lib/format';
import { errorMessage, toast } from '@/stores/toast';
import { Avatar, EmptyState, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';

function MediaLightbox({
  media,
  index,
  onClose,
  onIndex,
}: {
  media: MediaItem[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const item = media[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index < media.length - 1) onIndex(index + 1);
      if (event.key === 'ArrowRight' && index > 0) onIndex(index - 1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, media.length, onClose, onIndex]);

  if (!item) return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 p-3" onClick={onClose}>
      <button
        type="button"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
        onClick={onClose}
        aria-label="داخستن"
      >
        <X size={20} />
      </button>
      <div className="flex max-h-full max-w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {item.type === 'video' ? (
          <video src={item.url} controls autoPlay className="max-h-[92dvh] max-w-[94vw] rounded-xl" />
        ) : (
          <img src={item.url} alt="" className="max-h-[92dvh] max-w-[94vw] rounded-xl object-contain" />
        )}
      </div>
      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onIndex(Math.max(0, index - 1)); }}
            disabled={index === 0}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur disabled:opacity-20"
            aria-label="پێشوو"
          >
            <ChevronRight size={24} />
          </button>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onIndex(Math.min(media.length - 1, index + 1)); }}
            disabled={index === media.length - 1}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur disabled:opacity-20"
            aria-label="داهاتوو"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
            {index + 1} / {media.length}
          </span>
        </>
      )}
    </div>,
    document.body,
  );
}

function MediaGrid({ media, onOpen }: { media: MediaItem[]; onOpen: (index: number) => void }) {
  if (media.length === 0) return null;
  if (media.length === 1) {
    const item = media[0]!;
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-black">
        {item.type === 'video' ? (
          <video
            src={item.url}
            controls
            playsInline
            preload="metadata"
            className="max-h-[620px] w-full object-contain"
          />
        ) : (
          <button type="button" className="block w-full" onClick={() => onOpen(0)}>
            <img
              src={item.url}
              alt={item.name || ''}
              loading="lazy"
              decoding="async"
              className="max-h-[620px] w-full object-contain"
            />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('mt-3 grid gap-1 overflow-hidden rounded-2xl border border-line bg-black', media.length === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
      {media.slice(0, 4).map((item, index) => (
        <button
          key={`${item.url}-${index}`}
          type="button"
          className="group relative aspect-square overflow-hidden bg-black"
          onClick={() => onOpen(index)}
        >
          {item.type === 'video' ? (
            <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <img
              src={item.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          )}
          {index === 3 && media.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-black text-white">
              +{media.length - 4}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PostCard({
  post,
  onDeleted,
  onChanged,
}: {
  post: Post;
  onDeleted?: (id: string) => void;
  onChanged?: (post: Post) => void;
}) {
  const me = useAuthStore((state) => state.user);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [heart, setHeart] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const toggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    try {
      const data = await api<{ liked: boolean; likeCount?: number }>(`/api/posts/${post.id}/like`, {
        method: 'POST',
      });
      setLiked(data.liked);
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      onChanged?.({ ...post, likedByMe: data.liked, likeCount: data.likeCount ?? likeCount });
    } catch (error) {
      setLiked(!nextLiked);
      setLikeCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
      toast(errorMessage(error), 'error');
    }
  };

  const doubleLike = () => {
    if (liked) return;
    setHeart(true);
    window.setTimeout(() => setHeart(false), 650);
    void toggleLike();
  };

  const loadComments = async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (comments.length > 0) return;
    setCommentsLoading(true);
    try {
      const data = await api<{ comments: Comment[] }>(`/api/posts/${post.id}/comments?limit=50`);
      setComments(data.comments);
      setCommentCount(Math.max(data.comments.length, post.commentCount));
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const data = await api<{ comment: Comment }>(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: { content },
      });
      setComments((current) => [...current, data.comment]);
      setCommentCount((value) => value + 1);
      setCommentText('');
      onChanged?.({ ...post, commentCount: commentCount + 1 });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await api(`/api/posts/${post.id}/comments/${commentId}`, { method: 'DELETE' });
      setComments((current) => current.filter((item) => item.id !== commentId));
      setCommentCount((value) => Math.max(0, value - 1));
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const deletePost = async () => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم پۆستە؟')) return;
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      onDeleted?.(post.id);
      toast('پۆستەکە سڕدرایەوە.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `پۆستی ${post.author.name}`, text: post.content.slice(0, 100), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('بەستەری پۆستەکە کۆپی کرا.', 'success');
      }
    } catch {
      // user cancelled share
    }
  };

  const canDelete = me?.id === post.author.id || me?.role === 'ADMIN';

  return (
    <>
      <article className="panel mb-4 overflow-hidden">
        <header className="flex items-center gap-3 px-4 pt-4">
          <Link to={`/u/${post.author.username}`}>
            <Avatar user={post.author} size={44} showOnline />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/u/${post.author.username}`} className="flex items-center gap-1.5">
              <span className="truncate text-sm font-extrabold text-ink hover:underline">{post.author.name}</span>
              <UserBadges user={post.author} size={14} />
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                {post.visibility === 'PUBLIC' ? <Globe2 size={10} /> : <Users size={10} />}
                {post.visibility === 'PUBLIC' ? 'گشتی' : 'هاوڕێیان'}
              </span>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="icon-btn !h-9 !w-9"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="زیاتر"
            >
              <MoreHorizontal size={19} />
            </button>
            {menuOpen && (
              <div className="panel absolute left-0 top-10 z-30 w-44 rounded-2xl p-1.5">
                {canDelete ? (
                  <button type="button" className="menu-item menu-item-danger" onClick={() => { setMenuOpen(false); void deletePost(); }}>
                    <Trash2 size={15} /> سڕینەوەی پۆست
                  </button>
                ) : (
                  <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); void share(); }}>
                    <Share2 size={15} /> هاوبەشکردن
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {post.content && (
          <div className="px-4 pt-3">
            <p className="user-text text-[15px] text-ink">{post.content}</p>
          </div>
        )}

        <div className="relative px-4 pb-1">
          <MediaGrid media={post.media} onOpen={(index) => setLightbox(index)} />
          {post.media.length > 0 && (
            <div
              className="absolute inset-x-4 top-3 bottom-1"
              onDoubleClick={doubleLike}
              aria-hidden
            />
          )}
          {heart && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl animate-heart">
              ❤️
            </span>
          )}
        </div>

        <footer className="px-4 pb-3 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void toggleLike()}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors',
                liked ? 'text-rose-400' : 'text-muted hover:bg-[color:var(--surface-2)] hover:text-ink',
              )}
            >
              <Heart size={19} className={cn(liked && 'fill-current animate-pop')} />
              {likeCount > 0 && formatNumber(likeCount)}
            </button>
            <button
              type="button"
              onClick={() => void loadComments()}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-muted transition-colors hover:bg-[color:var(--surface-2)] hover:text-ink"
            >
              <MessageCircle size={19} />
              {commentCount > 0 && formatNumber(commentCount)}
            </button>
            <button
              type="button"
              onClick={() => void share()}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-muted transition-colors hover:bg-[color:var(--surface-2)] hover:text-ink"
            >
              <Share2 size={18} />
            </button>
          </div>

          {commentsOpen && (
            <div className="mt-2 border-t border-line pt-3">
              {commentsLoading ? (
                <div className="flex justify-center py-4"><Spinner className="text-muted" /></div>
              ) : comments.length === 0 ? (
                <EmptyState
                  className="!py-5"
                  title="هێشتا کۆمێنت نییە"
                  description="یەکەم کەس بە بۆ کۆمێنتکردن."
                />
              ) : (
                <div className="mb-3 space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2.5">
                      <Link to={`/u/${comment.user.username}`}>
                        <Avatar user={comment.user} size={32} />
                      </Link>
                      <div className="min-w-0 flex-1 rounded-2xl bg-[color:var(--surface-2)]/65 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/u/${comment.user.username}`} className="text-[11px] font-extrabold text-ink hover:underline">
                            {comment.user.name}
                          </Link>
                          <UserBadges user={comment.user} size={11} />
                          <span className="ms-auto text-[9px] text-muted-2">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-ink/90">{comment.content}</p>
                      </div>
                      {(comment.userId === me?.id || me?.id === post.author.id) && (
                        <button
                          type="button"
                          onClick={() => void deleteComment(comment.id)}
                          className="mt-2 text-muted-2 hover:text-danger"
                          aria-label="سڕینەوەی کۆمێنت"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Avatar user={me} size={32} />
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value.slice(0, 1000))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void submitComment();
                    }
                  }}
                  placeholder="کۆمێنتێک بنووسە…"
                  className="input !rounded-full !py-2 !text-xs"
                  maxLength={1000}
                />
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={!commentText.trim() || sending}
                  className="icon-btn !h-9 !w-9 !bg-[color:var(--primary)]/10 !text-[color:var(--primary)] disabled:opacity-40"
                  aria-label="ناردن"
                >
                  {sending ? <Spinner size={15} /> : <Send size={15} />}
                </button>
              </div>
            </div>
          )}
        </footer>
      </article>

      {lightbox !== null && (
        <MediaLightbox media={post.media} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </>
  );
}
