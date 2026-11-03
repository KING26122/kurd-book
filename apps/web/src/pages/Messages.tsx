import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, MessageCircle, Plus, Search, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ensureIdentity, decryptPayload, type Identity } from '@/lib/crypto';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import { cn } from '@/lib/cn';
import { formatDate, formatTime, timeAgo } from '@/lib/format';
import { Avatar, CountBadge, EmptyState, Modal, Skeleton, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { Chat } from '@/pages/Chat';
import type { Conversation, DecodedMessagePayload, User } from '@/types';

function previewFor(payload: DecodedMessagePayload | null): string | null {
  if (!payload) return null;
  if (payload.media) {
    const labels = { image: '📷 وێنە', video: '🎥 ڤیدیۆ', audio: '🎤 نامەی دەنگی', file: '📎 فایل' };
    return labels[payload.media.kind] || '📎 فایل';
  }
  if (payload.sticker) return `✨ ستیکەر ${payload.sticker}`;
  if (payload.text) return payload.text;
  return null;
}

function sameDay(a: string, b: Date): boolean {
  const date = new Date(a);
  return date.toDateString() === b.toDateString();
}

export function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [previews, setPreviews] = useState<Record<string, { text: string; mine: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[]; totalUnread: number }>('/api/chats/conversations');
      setConversations(data.conversations);
      useAuthStore.getState().patchUser({ unreadConversations: data.totalUnread });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const current = useAuthStore.getState().user;
    if (current) ensureIdentity(current).then(setIdentity).catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const schedule = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void load(), 500);
    };
    socket.on('conversation:update', schedule);
    socket.on('message:new', schedule);
    return () => {
      socket.off('conversation:update', schedule);
      socket.off('message:new', schedule);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [load]);

  useEffect(() => {
    if (!identity) return;
    const next: Record<string, { text: string; mine: boolean }> = {};
    for (const conversation of conversations) {
      const last = conversation.lastMessage;
      if (!last || !conversation.peer?.publicKey) continue;
      const payload = decryptPayload(last, identity.privateKey, conversation.peer.publicKey, conversation.id);
      const text = previewFor(payload);
      if (text) next[conversation.id] = { text, mine: last.senderId === me?.id };
    }
    setPreviews(next);
  }, [conversations, identity, me?.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (unreadOnly && conversation.unreadCount === 0) return false;
      if (!term) return true;
      return (
        conversation.title.toLowerCase().includes(term) ||
        (conversation.peer?.username || '').toLowerCase().includes(term)
      );
    });
  }, [conversations, search, unreadOnly]);

  const openConversation = (conversation: Conversation) => {
    navigate(`/messages/${conversation.id}`);
  };

  return (
    <div className="page-enter flex h-[calc(100dvh-140px)] gap-3 lg:h-[calc(100dvh-76px)]">
      <aside className={cn('panel flex w-full min-w-0 flex-col overflow-hidden lg:w-[330px] lg:shrink-0', id && 'hidden lg:flex')}>
        <header className="shrink-0 border-b border-line p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-1.5 text-base font-extrabold text-ink">
                چاتەکان
                <span className="flex items-center gap-0.5 rounded-full bg-[color:var(--primary)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[color:var(--primary)]">
                  <Lock size={9} /> E2EE
                </span>
              </h1>
              <p className="mt-0.5 text-[10px] text-muted">گفتوگۆکانی پارێزراوت</p>
            </div>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-fg)] transition-transform active:scale-95"
              title="گفتوگۆی نوێ"
              aria-label="گفتوگۆی نوێ"
            >
              <Plus size={19} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-[color:var(--surface-solid)] px-3 py-2">
            <Search size={14} className="text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="گەڕان لە گفتوگۆکان…"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted-2"
            />
            {search && <button type="button" onClick={() => setSearch('')} className="text-muted"><X size={13} /></button>}
          </div>
          <div className="mt-2 flex gap-1">
            <button type="button" onClick={() => setUnreadOnly(false)} className={cn('chip !py-1', !unreadOnly && 'chip-active')}>
              هەموو
            </button>
            <button type="button" onClick={() => setUnreadOnly(true)} className={cn('chip !py-1', unreadOnly && 'chip-active')}>
              نخوێندراونەوە
            </button>
          </div>
        </header>

        <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5">
          {loading ? (
            <div className="space-y-1.5 p-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-44" /></div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={28} />}
              title={conversations.length === 0 ? 'هێشتا گفتوگۆت نییە' : 'هیچ ئەنجامێک نییە'}
              description={conversations.length === 0 ? 'هاوڕێیەک هەڵبژێرە و گفتوگۆیەکی پارێزراو دەست پێبکە.' : 'گەڕانەکەت بگۆڕە یان فلتەرەکە لابەرە.'}
              action={conversations.length === 0 ? <button type="button" className="btn-primary !text-xs" onClick={() => setNewChatOpen(true)}>گفتوگۆی نوێ</button> : undefined}
            />
          ) : (
            filtered.map((conversation) => {
              const preview = previews[conversation.id];
              const active = id === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openConversation(conversation)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-right transition-colors',
                    active
                      ? 'border-[color:var(--primary)]/30 bg-[color:var(--primary)]/[0.07]'
                      : 'border-transparent hover:border-line hover:bg-[color:var(--surface-2)]/60',
                  )}
                >
                  <Avatar user={conversation.peer ? { ...conversation.peer, online: undefined } : null} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-extrabold text-ink">{conversation.title}</span>
                      {conversation.peer && <UserBadges user={{ verificationStatus: conversation.peer.verificationStatus, isPro: conversation.peer.isPro }} size={11} />}
                      <span className="ms-auto shrink-0 text-[9px] text-muted-2">
                        {conversation.lastMessage
                          ? sameDay(conversation.lastMessageAt, new Date())
                            ? formatTime(conversation.lastMessageAt)
                            : sameDay(conversation.lastMessageAt, new Date(Date.now() - 86400000))
                              ? 'دوێنێ'
                              : formatDate(conversation.lastMessageAt)
                          : ''}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[10px] text-muted">
                        {preview ? (
                          <>
                            {preview.mine && <span className="text-muted-2">تۆ: </span>}
                            {preview.text}
                          </>
                        ) : conversation.lastMessage ? (
                          <span className="inline-flex items-center gap-1"><Lock size={9} /> نامەیەکی پارێزراو</span>
                        ) : (
                          'گفتوگۆ دەست پێبکە'
                        )}
                      </span>
                      {conversation.members.find((member) => member.id === me?.id)?.muted && <VolumeXIcon />}
                      <CountBadge count={conversation.unreadCount} />
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className="shrink-0 border-t border-line px-3 py-2 text-center text-[9px] text-muted-2">
          <Lock size={9} className="me-1 inline" /> نامەکان لەسەر ئامێرەکەت شێفڕە دەکرێن
        </footer>
      </aside>

      <section className={cn('panel min-w-0 flex-1 overflow-hidden', !id && 'hidden lg:flex')}>
        {id ? (
          <Chat key={id} conversationId={id} onBack={() => navigate('/messages')} onChanged={() => void load()} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-line bg-[color:var(--surface-2)] text-[color:var(--primary)]">
              <MessageCircle size={38} />
              <span className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[color:var(--bg)] bg-[color:var(--primary)] text-[color:var(--primary-fg)]">
                <Lock size={14} />
              </span>
            </div>
            <h2 className="mt-2 font-display text-lg font-black text-ink">گفتوگۆیەک هەڵبژێرە</h2>
            <p className="max-w-xs text-[11px] leading-6 text-muted">
              هەموو نامەکان بە کلیلی ئامێرەکەت شێفڕە دەکرێن. تەنها تۆ و ئەو کەسەی نامەکانی پێ دەنێریت دەتوانن بیانخوێننەوە.
            </p>
            <button type="button" className="btn-primary mt-1 !text-xs" onClick={() => setNewChatOpen(true)}>
              <Plus size={15} /> گفتوگۆی نوێ
            </button>
          </div>
        )}
      </section>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(conversation) => {
          setNewChatOpen(false);
          void load();
          navigate(`/messages/${conversation.id}`);
        }}
      />
    </div>
  );
}

function VolumeXIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-2">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  );
}

function NewChatModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}) {
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch('');
    api<{ friends: User[] }>('/api/friends')
      .then((data) => setFriends(data.friends))
      .catch((error) => toast(errorMessage(error), 'error'))
      .finally(() => setLoading(false));
  }, [open]);

  const create = async (user: User) => {
    setBusy(user.id);
    try {
      const data = await api<{ conversation: Conversation }>(`/api/chats/with/${user.id}`, { method: 'POST' });
      onCreated(data.conversation);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const filtered = friends.filter((friend) => {
    const term = search.trim().toLowerCase();
    return !term || friend.name.toLowerCase().includes(term) || friend.username.includes(term);
  });

  return (
    <Modal open={open} onClose={onClose} title="گفتوگۆی نوێ" subtitle="تەنها هاوڕێکان دەتوانرێت گفتوگۆیان لەگەڵ بکرێت." size="sm">
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-3 py-2">
        <Search size={15} className="text-muted" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="گەڕان لە هاوڕێکان…" className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted-2" autoFocus />
      </div>
      <div className="hide-scrollbar max-h-[50vh] space-y-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="text-muted" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="هیچ هاوڕێیەک نییە" description="سەرەتا لە بەشی هاوڕێیان کەسێک زیاد بکە." />
        ) : (
          filtered.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => void create(friend)}
              disabled={Boolean(busy)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-right transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <Avatar user={friend} size={40} showOnline />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-xs font-extrabold text-ink">
                  {friend.name} <UserBadges user={friend} size={11} />
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted">@{friend.username}</span>
              </span>
              {busy === friend.id ? <Spinner size={15} className="text-[color:var(--primary)]" /> : <MessageCircle size={16} className="text-[color:var(--primary)]" />}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
