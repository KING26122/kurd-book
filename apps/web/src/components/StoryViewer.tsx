import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Eye, MoreHorizontal, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast, errorMessage } from '@/stores/toast';
import { formatTime, timeAgo } from '@/lib/format';
import { Avatar, EmptyState } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import type { User, StoryGroup } from '@/types';

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroup: number;
  onClose: () => void;
  onChanged: () => void;
}

export function StoryViewer({ groups, initialGroup, onClose, onChanged }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(Math.max(0, Math.min(initialGroup, groups.length - 1)));
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewers, setViewers] = useState<User[] | null>(null);
  const viewedRef = useRef(new Set<string>());
  const videoRef = useRef<HTMLVideoElement>(null);
  const group = groups[groupIndex];
  const story = group?.stories[storyIndex] ?? null;

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (!group) return;
      const nextStory = storyIndex + direction;
      if (nextStory >= 0 && nextStory < group.stories.length) {
        setStoryIndex(nextStory);
        setProgress(0);
        return;
      }
      const nextGroup = groupIndex + direction;
      if (nextGroup >= 0 && nextGroup < groups.length) {
        setGroupIndex(nextGroup);
        setStoryIndex(direction === 1 ? 0 : Math.max(0, groups[nextGroup]!.stories.length - 1));
        setProgress(0);
        return;
      }
      if (direction === 1) onClose();
    },
    [group, groupIndex, groups, onClose, storyIndex],
  );

  useEffect(() => {
    if (!story || menuOpen || viewers) return;
    if (story.mediaType === 'video') return;
    setProgress(0);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const value = Math.min(1, (Date.now() - started) / 6000);
      setProgress(value);
      if (value >= 1) {
        window.clearInterval(timer);
        advance(1);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [advance, menuOpen, story, viewers]);

  useEffect(() => {
    setMuted(true);
    setMenuOpen(false);
    if (!story || story.isMine || story.viewed) return;
    if (viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    void api(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => undefined);
  }, [story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') advance(1);
      if (event.key === 'ArrowRight') advance(-1);
      if (event.key === ' ') {
        event.preventDefault();
        if (story?.mediaType === 'video' && videoRef.current) {
          if (videoRef.current.paused) void videoRef.current.play();
          else videoRef.current.pause();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [advance, onClose, story?.mediaType]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const remove = async () => {
    if (!story) return;
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم ستۆرییە؟')) return;
    try {
      await api(`/api/stories/${story.id}`, { method: 'DELETE' });
      onChanged();
      toast('ستۆری سڕدرایەوە.', 'success');
      setMenuOpen(false);
      onClose();
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const loadViewers = async () => {
    if (!story) return;
    try {
      const data = await api<{ viewers: User[] }>(`/api/stories/${story.id}/viewers`);
      setViewers(data.viewers);
      setMenuOpen(false);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  if (!story || !group) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="relative flex h-dvh w-full max-w-[520px] flex-col overflow-hidden bg-black sm:h-[92dvh] sm:rounded-[2rem] sm:border sm:border-white/10">
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 p-2">
          {group.stories.map((item, index) => (
            <div key={item.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-100"
                style={{
                  width: index < storyIndex ? '100%' : index === storyIndex ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <header className="absolute inset-x-0 top-3 z-30 flex items-center gap-2.5 px-3 pt-3">
          <Avatar user={group.user} size={38} />
          <div className="min-w-0 flex-1 drop-shadow">
            <div className="flex items-center gap-1">
              <p className="truncate text-xs font-extrabold text-white">{group.user.name}</p>
              <UserBadges user={group.user} size={12} />
            </div>
            <p className="text-[10px] text-white/70">{timeAgo(story.createdAt)}</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? 'دەنگ چالاک بکە' : 'بێدەنگ'}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <div className="relative">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="زیاتر"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="panel absolute left-0 top-11 z-40 w-44 overflow-hidden rounded-2xl p-1.5">
                {story.isMine ? (
                  <>
                    <button type="button" className="menu-item" onClick={() => void loadViewers()}>
                      <Eye size={15} /> بینەران ({story.viewCount})
                    </button>
                    <button type="button" className="menu-item menu-item-danger" onClick={() => void remove()}>
                      <Trash2 size={15} /> سڕینەوەی ستۆری
                    </button>
                  </>
                ) : (
                  <button type="button" className="menu-item" onClick={() => setMenuOpen(false)}>
                    داخستنی لیست
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
            onClick={onClose}
            aria-label="داخستن"
          >
            <X size={19} />
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden">
          {story.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={muted}
              className="h-full w-full object-contain"
              onTimeUpdate={(event) => {
                const element = event.currentTarget;
                if (element.duration) setProgress(element.currentTime / element.duration);
              }}
              onEnded={() => advance(1)}
            />
          ) : (
            <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" decoding="async" />
          )}

          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/3"
            onClick={() => advance(1)}
            aria-label="داهاتوو"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/3"
            onClick={() => advance(-1)}
            aria-label="پێشوو"
          />
          <button type="button" className="absolute inset-y-0 left-1/3 w-1/3" onClick={onClose} aria-label="داخستن" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-7 pt-16">
            {story.caption && <p className="text-sm leading-7 text-white drop-shadow">{story.caption}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-white/60">{formatTime(story.createdAt)}</span>
              {story.isMine && (
                <span className="flex items-center gap-1 text-[10px] text-white/70">
                  <Eye size={12} /> {story.viewCount}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur sm:flex"
            onClick={() => advance(1)}
            aria-label="داهاتوو"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur sm:flex"
            onClick={() => advance(-1)}
            aria-label="پێشوو"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {viewers && (
          <div className="absolute inset-0 z-40 flex flex-col bg-black/85 backdrop-blur-md">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-extrabold text-white">بینەرانی ستۆری — {viewers.length}</h3>
              <button type="button" className="rounded-full p-2 text-white/70 hover:text-white" onClick={() => setViewers(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="hide-scrollbar flex-1 overflow-y-auto p-3">
              {viewers.length === 0 ? (
                <EmptyState title="هێشتا کەس نەیبینیوە" description="کاتێک هاوڕێکانت ستۆرییەکەت دەبینن، لێرە دەردەکەون." />
              ) : (
                viewers.map((viewer) => (
                  <div key={viewer.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-white/5">
                    <Avatar user={viewer} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-xs font-bold text-white">
                        {viewer.name} <UserBadges user={viewer} size={11} />
                      </p>
                      <p className="text-[10px] text-white/50">@{viewer.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
