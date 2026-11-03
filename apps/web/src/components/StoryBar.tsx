import { useCallback, useEffect, useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Avatar, Skeleton } from '@/components/ui';
import { StoryViewer } from '@/components/StoryViewer';
import { StoryComposer } from '@/components/StoryComposer';
import type { StoryGroup } from '@/types';

export function StoryBar() {
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const load = useCallback(async () => {
    try {
      const data = await api<{ groups: StoryGroup[] }>('/api/stories');
      setGroups(data.groups);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('kurdbook:stories-refresh', refresh);
    return () => window.removeEventListener('kurdbook:stories-refresh', refresh);
  }, [load]);

  const myGroup = groups?.find((group) => group.user.id === user?.id) || null;
  const otherGroups = groups?.filter((group) => group.user.id !== user?.id) || [];
  const ordered = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  return (
    <>
      <div className="panel mb-4 overflow-hidden p-3">
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="group flex w-[78px] shrink-0 flex-col items-center gap-2"
          >
            <span className="relative">
              {myGroup ? (
                <span className="story-ring block rounded-full">
                  <span className="block rounded-full border-[3px] border-[color:var(--bg)]">
                    <Avatar user={myGroup.user} size={62} />
                  </span>
                </span>
              ) : (
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-2)] text-[color:var(--primary)]">
                  <Avatar user={user} size={56} />
                </span>
              )}
              <span className="absolute -bottom-0.5 -left-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[color:var(--bg)] bg-[color:var(--primary)] text-[color:var(--primary-fg)] shadow-lg">
                <Plus size={14} strokeWidth={3} />
              </span>
            </span>
            <span className="text-[10px] font-bold text-muted group-hover:text-ink">ستۆری تۆ</span>
          </button>

          {groups === null
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex w-[78px] shrink-0 flex-col items-center gap-2">
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              ))
            : ordered
                .filter((group) => group.stories.length > 0)
                .map((group) => {
                  const index = ordered.indexOf(group);
                  return (
                    <button
                      key={group.user.id}
                      type="button"
                      onClick={() => setViewerIndex(index)}
                      className="group flex w-[78px] shrink-0 flex-col items-center gap-2"
                    >
                      <span className={group.allViewed ? 'story-ring-viewed block rounded-full' : 'story-ring block rounded-full'}>
                        <span className="block rounded-full border-[3px] border-[color:var(--bg)]">
                          <Avatar user={group.user} size={62} />
                        </span>
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-bold text-muted group-hover:text-ink">
                        {group.user.id === user?.id ? 'تۆ' : group.user.name}
                      </span>
                    </button>
                  );
                })}

          {groups !== null && ordered.length === 0 && (
            <div className="flex min-h-[88px] flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[11px] text-muted">
              <Radio size={15} />
              یەکەم ستۆری بڵاو بکەرەوە
            </div>
          )}
        </div>
      </div>

      {viewerIndex !== null && ordered.length > 0 && (
        <StoryViewer
          groups={ordered}
          initialGroup={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChanged={() => void load()}
        />
      )}

      <StoryComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublished={() => {
          setComposerOpen(false);
          void load();
        }}
      />
    </>
  );
}
