import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock3, MessageCircle, Search, UserPlus, UserX, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import { Avatar, EmptyState, SectionTitle, Skeleton, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { FollowAction } from '@/components/UserCard';
import { UserCard } from '@/components/UserCard';
import { cn } from '@/lib/cn';
import type { FriendRequest, User } from '@/types';

type Tab = 'friends' | 'incoming' | 'outgoing' | 'suggestions';

export function FriendsPage() {
  const me = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<User[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendData, requestData, suggestionData] = await Promise.all([
        api<{ friends: User[] }>('/api/friends'),
        api<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/api/friends/requests'),
        api<{ suggestions: User[] }>('/api/friends/suggestions'),
      ]);
      setFriends(friendData.friends);
      setIncoming(requestData.incoming);
      setOutgoing(requestData.outgoing);
      setSuggestions(suggestionData.suggestions);
      useAuthStore.getState().patchUser({ pendingFriendRequests: requestData.incoming.length });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (request: FriendRequest) => {
    setBusy(request.id);
    try {
      await api(`/api/friends/${request.id}/accept`, { method: 'POST' });
      setIncoming((current) => current.filter((item) => item.id !== request.id));
      setFriends((current) => [{ ...request.user, friendshipId: request.id, friendsSince: new Date().toISOString() } as User, ...current]);
      useAuthStore.getState().patchUser({
        pendingFriendRequests: Math.max(0, (me?.pendingFriendRequests || 1) - 1),
      });
      toast(`ئێستا تۆ و ${request.user.name} هاوڕێن 🤝`, 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (request: FriendRequest) => {
    setBusy(request.id);
    try {
      await api(`/api/friends/${request.id}/reject`, { method: 'POST' });
      setIncoming((current) => current.filter((item) => item.id !== request.id));
      toast('داواکارییەکە ڕەتکرایەوە.', 'info');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (request: FriendRequest) => {
    setBusy(request.id);
    try {
      await api(`/api/friends/${request.id}`, { method: 'DELETE' });
      setOutgoing((current) => current.filter((item) => item.id !== request.id));
      toast('داواکارییەکە هەڵوەشێنرایەوە.', 'info');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const unfriend = async (friend: User) => {
    if (!friend.friendshipId) return;
    if (!window.confirm(`دڵنیایت لە لابردنی ${friend.name} لە هاوڕێکانت؟`)) return;
    setBusy(friend.id);
    try {
      await api(`/api/friends/${friend.friendshipId}`, { method: 'DELETE' });
      setFriends((current) => current.filter((item) => item.id !== friend.id));
      toast('لە لیستی هاوڕێکان لابرا.', 'info');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const addFriend = async (user: User) => {
    setBusy(user.id);
    try {
      const result = await api<{ accepted: boolean; friendshipId: string }>('/api/friends/request', {
        method: 'POST',
        body: { userId: user.id },
      });
      if (result.accepted) {
        setFriends((current) => [{ ...user, friendshipId: result.friendshipId }, ...current]);
        toast(`ئێستا تۆ و ${user.name} هاوڕێن 🤝`, 'success');
      } else {
        setOutgoing((current) => [{ id: result.friendshipId, user, createdAt: new Date().toISOString() }, ...current]);
        toast('داواکاری هاوڕێیەتی نێردرا.', 'success');
      }
      setSuggestions((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const message = async (user: User) => {
    try {
      const data = await api<{ conversation: { id: string } }>(`/api/chats/with/${user.id}`, { method: 'POST' });
      navigate(`/messages/${data.conversation.id}`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const filteredFriends = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((user) => user.name.toLowerCase().includes(term) || user.username.includes(term));
  }, [filter, friends]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'friends', label: 'هاوڕێکان', count: friends.length },
    { id: 'incoming', label: 'داواکارییەکان', count: incoming.length },
    { id: 'outgoing', label: 'نێردراوەکان', count: outgoing.length },
    { id: 'suggestions', label: 'پێشنیارەکان', count: suggestions.length },
  ];

  return (
    <div className="page-enter space-y-4">
      <section className="panel relative overflow-hidden p-5">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--primary)]"><Users size={14} /> کۆمەڵگەی کورد بووک</p>
            <h1 className="mt-1.5 font-display text-2xl font-black text-ink">هاوڕێکان</h1>
            <p className="mt-1 text-[11px] text-muted">هاوڕێی نوێ بدۆزەرەوە، داواکارییەکان پەسەند بکە و گفتوگۆ دەست پێبکە.</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'هاوڕێ', value: friends.length },
              { label: 'چاوەڕوان', value: incoming.length },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-[color:var(--surface-solid)]/60 px-4 py-2 text-center">
                <p className="text-lg font-black text-ink">{item.value}</p>
                <p className="text-[9px] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="tab-row">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn('tab flex-1', tab === item.id && 'tab-active')}
          >
            {item.label}
            <span className={cn('ms-1.5 rounded-full px-1.5 text-[9px]', tab === item.id ? 'bg-[color:var(--primary)]/15 text-[color:var(--primary)]' : 'bg-[color:var(--surface-3)] text-muted')}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <div className="panel p-4">
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-3 py-2">
            <Search size={15} className="text-muted" />
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="گەڕان لە هاوڕێکان…" className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted-2" />
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>
          ) : filteredFriends.length === 0 ? (
            <EmptyState
              icon={<Users size={28} />}
              title={friends.length === 0 ? 'هێشتا هاوڕێت نییە' : 'هیچ ئەنجامێک نییە'}
              description={friends.length === 0 ? 'سەیری پێشنیارەکان بکە و یەکەم هاوڕێت بدۆزەرەوە.' : 'بە ناوێکی تر بگەڕێ.'}
              action={friends.length === 0 ? <button type="button" className="btn-primary !text-xs" onClick={() => setTab('suggestions')}>بینینی پێشنیارەکان</button> : undefined}
            />
          ) : (
            <div className="space-y-0.5">
              {filteredFriends.map((friend) => (
                <UserCard
                  key={friend.id}
                  user={friend}
                  subtitle={friend.friendsSince ? `هاوڕێ لە ${new Date(friend.friendsSince).toLocaleDateString('ku-IQ')}` : undefined}
                  actions={
                    <>
                      <FollowAction label="نامە" icon="message" variant="soft" onClick={() => void message(friend)} />
                      <button
                        type="button"
                        className="icon-btn !h-9 !w-9 hover:!text-danger"
                        title="لابردنی هاوڕێیەتی"
                        onClick={() => void unfriend(friend)}
                        disabled={busy === friend.id}
                      >
                        <UserX size={16} />
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'incoming' && (
        <div className="panel p-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>
          ) : incoming.length === 0 ? (
            <EmptyState icon={<Check size={28} />} title="هیچ داواکارییەکی نوێ نییە" description="کاتێک کەسێک داوای هاوڕێیەتیت بکات، لێرە دەردەکەوێت." />
          ) : (
            <div className="space-y-0.5">
              {incoming.map((request) => (
                <UserCard
                  key={request.id}
                  user={request.user}
                  subtitle={`${new Date(request.createdAt).toLocaleDateString('ku-IQ')} · داوای هاوڕێیەتی`}
                  actions={
                    <>
                      <FollowAction label="پەسەند" icon="accept" onClick={() => void accept(request)} loading={busy === request.id} />
                      <button type="button" className="icon-btn !h-9 !w-9 hover:!text-danger" onClick={() => void reject(request)} disabled={busy === request.id} title="ڕەتکردنەوە">
                        <UserX size={16} />
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'outgoing' && (
        <div className="panel p-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>
          ) : outgoing.length === 0 ? (
            <EmptyState icon={<Clock3 size={28} />} title="هیچ داواکارییەکی نێردراو نییە" description="لە پێشنیارەکان یان گەڕان کەسێک هەڵبژێرە و داوای هاوڕێیەتی بنێرە." />
          ) : (
            <div className="space-y-0.5">
              {outgoing.map((request) => (
                <UserCard
                  key={request.id}
                  user={request.user}
                  subtitle="چاوەڕوانی وەڵامە"
                  actions={
                    <button type="button" className="btn-danger !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void cancel(request)} disabled={busy === request.id}>
                      هەڵوەشاندنەوە
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="panel p-4">
          <SectionTitle title="کەسانی نوێ" subtitle="بەپێی چالاکی و پشتڕاستکردنەوە" />
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>
          ) : suggestions.length === 0 ? (
            <EmptyState icon={<UserPlus size={28} />} title="پێشنیاری نوێ نییە" description="دواتر سەردان بکەرەوە بۆ بینینی بەکارهێنەرانی نوێ." />
          ) : (
            <div className="space-y-0.5">
              {suggestions.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  subtitle={user.mutualFriends ? `${user.mutualFriends} هاوڕێی هاوبەش` : undefined}
                  actions={
                    <>
                      <FollowAction label="هاوڕێ" icon="add" onClick={() => void addFriend(user)} loading={busy === user.id} />
                      <LinkToProfile username={user.username} />
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkToProfile({ username }: { username: string }) {
  return (
    <Link to={`/u/${username}`} className="icon-btn !h-9 !w-9" title="پرۆفایل">
      <Users size={15} />
    </Link>
  );
}
