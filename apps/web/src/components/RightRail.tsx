import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Crown, Lock, Sparkles, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { toast, errorMessage } from '@/stores/toast';
import { UserCard, FollowAction } from '@/components/UserCard';
import { Avatar, SectionTitle, Spinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types';

export function RightRail() {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const me = useAuthStore((state) => state.user);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ suggestions: User[] }>('/api/friends/suggestions'),
      api<{ friends: User[] }>('/api/friends'),
    ])
      .then(([suggestionData, friendData]) => {
        if (cancelled) return;
        setSuggestions(suggestionData.suggestions.slice(0, 4));
        setFriends(friendData.friends.slice(0, 6));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const addFriend = async (user: User) => {
    setBusy(user.id);
    try {
      const result = await api<{ accepted: boolean }>('/api/friends/request', {
        method: 'POST',
        body: { userId: user.id },
      });
      toast(result.accepted ? `ئێستا ${user.name} هاوڕێتن 🤝` : 'داواکاری هاوڕێیەتی نێردرا.', 'success');
      setSuggestions((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="panel overflow-hidden">
        <div className="relative overflow-hidden rounded-t-3xl border-b border-line p-5">
          <div
            className="absolute inset-0 opacity-70"
            style={{ backgroundImage: 'var(--gradient-soft)' }}
          />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <span className="chip chip-active"><Sparkles size={12} /> Pro</span>
              <Crown size={22} className="verified-crown" />
            </div>
            <h3 className="text-base font-extrabold text-ink">تاج و ئەڵماسەکەت وەربگرە</h3>
            <p className="mt-1.5 text-[11px] leading-6 text-muted">
              نیشانەی تاج و ئەڵماس، لایڤی 1080p، شاشە هاوبەشکردنی کوالیتی بەرز و دەنگی تایبەت.
            </p>
            <Link to="/pro" className="btn-primary mt-4 w-full !py-2.5 !text-xs">
              بینینی پلانەکانی Pro <ChevronLeft size={15} />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
            <Lock size={18} />
          </span>
          <div className="flex-1">
            <p className="text-xs font-extrabold text-ink">چاتی ئێندۆ-ئێندۆ پارێزراو</p>
            <p className="mt-0.5 text-[10px] leading-5 text-muted">تەنها تۆ و ئەو کەسە دەتوانن نامەکان بخوێننەوە.</p>
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <SectionTitle
          title="هاوڕێیان"
          subtitle={friends.length ? 'ئۆنلاین و چالاک' : 'هاوڕێی نوێ بدۆزەرەوە'}
          action={
            <Link to="/friends" className="text-[11px] font-bold text-[color:var(--primary)] hover:underline">
              هەموو
            </Link>
          }
          className="!mb-2"
        />
        {loading ? (
          <div className="flex justify-center py-6"><Spinner className="text-muted" /></div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center py-5 text-center">
            <Users size={24} className="text-muted-2" />
            <p className="mt-2 text-[11px] text-muted">هێشتا هاوڕێت نییە. لە خوارەوە دەست پێبکە.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {friends.map((friend) => (
              <Link key={friend.id} to={`/u/${friend.username}`} title={friend.name}>
                <Avatar user={friend} size={44} showOnline />
              </Link>
            ))}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="panel p-3">
          <SectionTitle title="لەوانەیە بناسیت" className="!mb-1 !px-1" />
          <div className="space-y-1">
            {suggestions.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                compact
                actions={
                  <FollowAction
                    label="هاوڕێ"
                    icon="add"
                    onClick={() => void addFriend(user)}
                    loading={busy === user.id}
                    variant="soft"
                  />
                }
              />
            ))}
          </div>
        </div>
      )}

      <footer className="px-4 text-[10px] leading-5 text-muted-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>کورد بووک © {new Date().getFullYear()}</span>
          <span>بۆ کوردستان 🏔️</span>
          {me?.role === 'ADMIN' && (
            <a href="http://localhost:5174" target="_blank" rel="noreferrer" className="text-[color:var(--accent)] hover:underline">
              پانێلی بەڕێوەبەر
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
