import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronUp,
  Flag,
  ImagePlus,
  Lock,
  Mic,
  MoreHorizontal,
  Paperclip,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Smile,
  Square,
  Trash2,
  User as UserIcon,
  VolumeX,
  X,
} from 'lucide-react';
import type { Conversation, DecodedMessagePayload, EncryptedMessage } from '@/types';
import { api } from '@/lib/api';
import { ensureIdentity, encryptFile, encryptPayload, decryptPayload, type Identity } from '@/lib/crypto';
import { getSocket } from '@/lib/socket';
import { uploadBlob } from '@/lib/upload';
import { processVoiceNote, wavDuration, VOICE_EFFECTS } from '@/lib/voice';
import { cn } from '@/lib/cn';
import { formatChatDay, formatDuration, formatTime, isOnlyEmoji, relativeDayKey } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { errorMessage, toast } from '@/stores/toast';
import { Alert, Avatar, EmptyState, Modal, ProgressBar, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { SecureMedia } from '@/components/chat/SecureMedia';
import { EmojiPicker } from '@/components/chat/EmojiPicker';

interface ChatProps {
  conversationId: string;
  onBack: () => void;
  onChanged: () => void;
}

type SendType = EncryptedMessage['type'];
type MessageStatus = 'pending' | 'failed' | undefined;

function sortMessages(list: EncryptedMessage[]): EncryptedMessage[] {
  return [...list].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

export function Chat({ conversationId, onBack, onChanged }: ChatProps) {
  const me = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Record<string, MessageStatus>>({});
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingSent = useRef(false);
  const markingRead = useRef(false);
  const outbox = useRef(new Map<string, { type: SendType; payload: DecodedMessagePayload }>());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimer = useRef<number | null>(null);

  const peer = conversation?.peer || null;
  const peerKey = peer?.publicKey || null;
  const muted = Boolean(conversation?.members.find((member) => member.id === me?.id)?.muted);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [conversationData, messageData] = await Promise.all([
        api<{ conversation: Conversation }>(`/api/chats/conversations/${conversationId}`),
        api<{ messages: EncryptedMessage[]; hasMore: boolean; nextCursor: string | null }>(
          `/api/chats/conversations/${conversationId}/messages?limit=50`,
        ),
      ]);
      setConversation(conversationData.conversation);
      setPeerReadAt(conversationData.conversation.peerLastReadAt || null);
      setMessages(sortMessages(messageData.messages));
      setHasMore(messageData.hasMore);
      const initialUnread = conversationData.conversation.unreadCount;
      if (initialUnread > 0 && !markingRead.current) {
        markingRead.current = true;
        const current = useAuthStore.getState().user;
        useAuthStore.getState().patchUser({
          unreadConversations: Math.max(0, (current?.unreadConversations || 0) - initialUnread),
        });
      }
      void api(`/api/chats/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => undefined);
      getSocket()?.emit('chat:read', { conversationId });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    ensureIdentity(current)
      .then(setIdentity)
      .catch((identityError) => toast(errorMessage(identityError), 'error'));
  }, [me?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('chat:join', { conversationId });

    const onNew = (message: EncryptedMessage) => {
      if (message.conversationId !== conversationId) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : sortMessages([...current, message])));
      if (message.senderId !== me?.id) {
        void api(`/api/chats/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => undefined);
        socket.emit('chat:read', { conversationId });
      }
    };
    const onDeleted = (payload: { id: string; conversationId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((current) =>
        current.map((item) =>
          item.id === payload.id ? { ...item, deletedAt: new Date().toISOString(), ciphertext: '', nonce: '', salt: '' } : item,
        ),
      );
    };
    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId !== conversationId || payload.userId === me?.id) return;
      setPeerTyping(payload.isTyping);
    };
    const onRead = (payload: { conversationId: string; userId: string; at: string }) => {
      if (payload.conversationId !== conversationId || payload.userId === me?.id) return;
      setPeerReadAt(payload.at);
    };

    socket.on('message:new', onNew);
    socket.on('message:deleted', onDeleted);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read', onRead);

    return () => {
      socket.emit('chat:leave', { conversationId });
      socket.off('message:new', onNew);
      socket.off('message:deleted', onDeleted);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read', onRead);
    };
  }, [conversationId, me?.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [emojiOpen]);

  const decoded = useMemo(() => {
    if (!identity || !peerKey) return messages.map((message) => ({ message, payload: null as DecodedMessagePayload | null }));
    return messages.map((message) => {
      if (message.deletedAt || !message.ciphertext) return { message, payload: null as DecodedMessagePayload | null };
      return {
        message,
        payload: decryptPayload(message, identity.privateKey, peerKey, conversationId),
      };
    });
  }, [conversationId, identity, messages, peerKey]);

  const undecryptable = decoded.filter((item) => !item.payload && !item.message.deletedAt && item.message.ciphertext).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [decoded.length, conversationId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => {
      setShowJump(node.scrollHeight - node.scrollTop - node.clientHeight > 350);
    };
    node.addEventListener('scroll', onScroll);
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 118)}px`;
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (recordTimer.current) window.clearInterval(recordTimer.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (recording && recordSeconds >= 300) finishRecording(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, recordSeconds]);

  const emitTyping = (isTyping: boolean) => {
    const socket = getSocket();
    socket?.emit('chat:typing', { conversationId, isTyping });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (value.trim()) {
      if (!typingSent.current) {
        typingSent.current = true;
        emitTyping(true);
      }
      typingTimer.current = window.setTimeout(() => {
        typingSent.current = false;
        emitTyping(false);
      }, 1800);
    } else if (typingSent.current) {
      typingSent.current = false;
      emitTyping(false);
    }
  };

  const sendEncrypted = useCallback(
    async (type: SendType, payload: DecodedMessagePayload) => {
      if (!identity || !peerKey || !me) {
        toast('کلیلی پاراستن ئامادە نییە. تکایە دواتر هەوڵ بدەوە.', 'error');
        return;
      }
      const encrypted = encryptPayload(payload, identity.privateKey, peerKey, conversationId);
      const clientId = crypto.randomUUID();
      const optimistic: EncryptedMessage = {
        id: `local-${clientId}`,
        conversationId,
        senderId: me.id,
        type,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        salt: encrypted.salt,
        protocol: 1,
        clientId,
        createdAt: new Date().toISOString(),
      };
      outbox.current.set(clientId, { type, payload });
      setMessages((current) => sortMessages([...current, optimistic]));
      setStatus((current) => ({ ...current, [clientId]: 'pending' }));

      try {
        const data = await api<{ message: EncryptedMessage }>(
          `/api/chats/conversations/${conversationId}/messages`,
          { method: 'POST', body: { type, ...encrypted, clientId } },
        );
        setMessages((current) => sortMessages(current.map((item) => (item.clientId === clientId ? data.message : item))));
        setStatus((current) => ({ ...current, [clientId]: undefined }));
        outbox.current.delete(clientId);
        onChanged();
      } catch (sendError) {
        setStatus((current) => ({ ...current, [clientId]: 'failed' }));
        toast(errorMessage(sendError), 'error');
      }
    },
    [conversationId, identity, me, onChanged, peerKey],
  );

  const sendText = () => {
    const content = text.trim();
    if (!content) return;
    if (!peerKey) {
      toast('کلیلی پاراستنی ئەم بەکارهێنەرە نەنێردراوە. ناتوانرێت نامە بنێردرێت.', 'error');
      return;
    }
    setText('');
    setEmojiOpen(false);
    if (typingSent.current) {
      typingSent.current = false;
      emitTyping(false);
    }
    const emojiOnly = isOnlyEmoji(content);
    void sendEncrypted(emojiOnly ? 'EMOJI' : 'TEXT', { v: 1, text: content, ...(emojiOnly ? { emoji: content } : {}) });
  };

  const sendSticker = (sticker: string) => {
    setEmojiOpen(false);
    void sendEncrypted('STICKER', { v: 1, text: '', sticker });
  };

  const retry = async (message: EncryptedMessage) => {
    if (!message.clientId) return;
    const item = outbox.current.get(message.clientId);
    if (!item) return;
    setStatus((current) => ({ ...current, [message.clientId!]: 'pending' }));
    try {
      const data = await api<{ message: EncryptedMessage }>(
        `/api/chats/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: {
            type: item.type,
            ciphertext: message.ciphertext,
            nonce: message.nonce,
            salt: message.salt,
            clientId: message.clientId,
          },
        },
      );
      setMessages((current) => sortMessages(current.map((entry) => (entry.clientId === message.clientId ? data.message : entry))));
      setStatus((current) => ({ ...current, [message.clientId!]: undefined }));
      outbox.current.delete(message.clientId);
    } catch (retryError) {
      setStatus((current) => ({ ...current, [message.clientId!]: 'failed' }));
      toast(errorMessage(retryError), 'error');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast('فایلەکە زۆر گەورەیە (زۆرترین ٢٠٠ م.ب).', 'error');
      return;
    }
    if (!peerKey) {
      toast('کلیلی پاراستنی ئەم بەکارهێنەرە نەنێردراوە.', 'error');
      return;
    }
    setSending(true);
    setUploadLabel('شێفڕەکردن و بەرزکردنەوەی فایل…');
    setUploadProgress(0);
    try {
      const kind = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'file';
      const encrypted = await encryptFile(file);
      const uploaded = await uploadBlob(encrypted.blob, `${file.name}.kb`, 'chat', setUploadProgress);
      const payload: DecodedMessagePayload = {
        v: 1,
        text: '',
        media: {
          url: uploaded.url,
          key: encrypted.key,
          nonce: encrypted.nonce,
          mime: file.type || 'application/octet-stream',
          name: file.name,
          kind,
        },
      };
      await sendEncrypted('MEDIA', payload);
      toast('میدیا بە شێوەی پارێزراو نێردرا 🔒', 'success');
    } catch (uploadError) {
      toast(errorMessage(uploadError), 'error');
    } finally {
      setSending(false);
      setUploadProgress(null);
      setUploadLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (!peerKey) {
      toast('کلیلی پاراستنی ئەم بەکارهێنەرە نەنێردراوە.', 'error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('وێبگەڕەکەت تۆمارکردنی دەنگ پشتگیری ناکات.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(250);
      streamRef.current = stream;
      recorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordTimer.current = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    } catch {
      toast('دەستڕاگەیشتن بە مایکرۆفۆن نەدرا. لە ڕێکخستنی وێبگەڕ ڕێگە بدە.', 'error');
    }
  };

  const cleanupRecording = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    if (recordTimer.current) window.clearInterval(recordTimer.current);
    recordTimer.current = null;
    setRecording(false);
    setRecordSeconds(0);
  };

  const finishRecording = (send: boolean) => {
    const recorder = recorderRef.current;
    if (!recorder) {
      cleanupRecording();
      return;
    }
    const mimeType = recorder.mimeType || 'audio/webm';
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      cleanupRecording();
      if (send && chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size > 1200) void sendVoice(blob);
      }
    };
    try {
      recorder.stop();
    } catch {
      cleanupRecording();
    }
  };

  const sendVoice = async (blob: Blob) => {
    if (!identity || !peerKey) return;
    setVoiceBusy(true);
    try {
      const effect = me?.voiceEffect || 'natural';
      let processed: Blob;
      try {
        processed = await processVoiceNote(blob, effect);
      } catch {
        processed = blob;
      }
      const encrypted = await encryptFile(processed);
      const uploaded = await uploadBlob(encrypted.blob, 'voice-note.kb', 'chat');
      const duration = processed.type === 'audio/wav' ? wavDuration(processed) : recordSeconds;
      await sendEncrypted('VOICE', {
        v: 1,
        text: '',
        media: {
          url: uploaded.url,
          key: encrypted.key,
          nonce: encrypted.nonce,
          mime: processed.type || 'audio/webm',
          name: 'نامەی دەنگی',
          duration,
          kind: 'audio',
        },
      });
      toast('نامەی دەنگی نێردرا 🎙️', 'success');
    } catch (voiceError) {
      toast(errorMessage(voiceError), 'error');
    } finally {
      setVoiceBusy(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم نامەیە؟')) return;
    try {
      await api(`/api/chats/messages/${id}`, { method: 'DELETE' });
      setMessages((current) =>
        current.map((item) =>
          item.id === id ? { ...item, deletedAt: new Date().toISOString(), ciphertext: '', nonce: '', salt: '' } : item,
        ),
      );
    } catch (deleteError) {
      toast(errorMessage(deleteError), 'error');
    }
  };

  const loadOlder = async () => {
    if (!messages[0] || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ messages: EncryptedMessage[]; hasMore: boolean }>(
        `/api/chats/conversations/${conversationId}/messages?limit=50&cursor=${encodeURIComponent(messages[0].id)}`,
      );
      const node = scrollRef.current;
      const previousHeight = node?.scrollHeight || 0;
      setMessages((current) => sortMessages([...data.messages, ...current]));
      setHasMore(data.hasMore);
      window.setTimeout(() => {
        if (node) node.scrollTop = node.scrollHeight - previousHeight;
      }, 30);
    } catch (olderError) {
      toast(errorMessage(olderError), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleMute = async () => {
    if (!conversation) return;
    try {
      await api(`/api/chats/conversations/${conversationId}/mute`, { method: 'POST', body: { muted: !muted } });
      setConversation((current) =>
        current
          ? {
              ...current,
              members: current.members.map((member) => (member.id === me?.id ? { ...member, muted: !muted } : member)),
            }
          : current,
      );
      toast(muted ? 'دەنگی گفتوگۆ چالاک کرا.' : 'گفتوگۆ بێدەنگ کرا.', 'success');
    } catch (muteError) {
      toast(errorMessage(muteError), 'error');
    }
  };

  const voiceEffectLabel = VOICE_EFFECTS.find((effect) => effect.id === (me?.voiceEffect || 'natural'))?.label || 'سروشتی';

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Spinner size={24} className="text-[color:var(--primary)]" />
        <p className="text-xs text-muted">گفتوگۆ دەکرێتەوە…</p>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-line p-3 lg:hidden">
          <button type="button" className="icon-btn" onClick={onBack}><ArrowRight size={19} /></button>
          <span className="text-sm font-bold">گفتوگۆ</span>
        </div>
        <EmptyState
          icon={<RefreshCw size={26} />}
          title="گفتوگۆ نەکرایەوە"
          description={error || 'گفتوگۆ نەدۆزرایەوە.'}
          action={<button type="button" className="btn-primary !text-xs" onClick={() => void load()}>هەوڵدانەوە</button>}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
        <button type="button" className="icon-btn lg:hidden" onClick={onBack} aria-label="گەڕانەوە">
          <ArrowRight size={20} />
        </button>
        <Link to={peer ? `/u/${peer.username}` : '#'} className="shrink-0">
          <Avatar user={peer} size={40} showOnline />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={peer ? `/u/${peer.username}` : '#'} className="flex items-center gap-1.5">
            <span className="truncate text-sm font-extrabold text-ink">{conversation.title}</span>
            {peer && <UserBadges user={{ verificationStatus: peer.verificationStatus, isPro: peer.isPro }} size={13} />}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
            {peerTyping ? (
              <span className="text-[color:var(--primary)]">دەنووسێت…</span>
            ) : (
              <>
                <Lock size={10} /> چاتی ئێندۆ-ئێندۆ پارێزراو
              </>
            )}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button type="button" className="icon-btn" onClick={() => setMenuOpen((value) => !value)} aria-label="زیاتر">
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <div className="panel absolute left-0 top-11 z-50 w-52 rounded-2xl p-1.5">
              {peer && (
                <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); navigate(`/u/${peer.username}`); }}>
                  <UserIcon size={16} /> پرۆفایلی بەکارهێنەر
                </button>
              )}
              <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); void toggleMute(); }}>
                <VolumeX size={16} /> {muted ? 'چالاککردنی دەنگ' : 'بێدەنگکردنی گفتوگۆ'}
              </button>
              <button type="button" className="menu-item" onClick={() => { setMenuOpen(false); void load(); }}>
                <RefreshCw size={16} /> نوێکردنەوە
              </button>
              <div className="divider my-1" />
              <button type="button" className="menu-item menu-item-danger" onClick={() => { setMenuOpen(false); setReportOpen(true); }}>
                <Flag size={16} /> ڕاپۆرتکردنی گفتوگۆ
              </button>
            </div>
          )}
        </div>
      </header>

      {(undecryptable > 0 || (!peerKey && !conversation.isGroup)) && (
        <div className="shrink-0 px-3 pt-2">
          <Alert kind="warning">
            {!peerKey
              ? 'بەکارهێنەرەکە هێشتا کلیلی پاراستنی نەناردووە. دەبێت ئەو کەسە یەک جار بچێتە ژوورەوە بۆ دروستکردنی کلیلی پاراستن.'
              : `نەتوانرا ${undecryptable} نامە بخوێنرێتەوە — ڕەنگە کلیلی پاراستن گۆڕدرابێت یان نامەکان لە ئامێرێکی ترەوە نێردراون.`}
            <button type="button" className="ms-2 rounded-lg bg-white/10 px-2 py-0.5 font-bold" onClick={() => void load()}>
              نوێکردنەوە
            </button>
          </Alert>
        </div>
      )}

      <div ref={scrollRef} className="chat-area hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button type="button" className="btn-soft !rounded-full !px-3 !py-1.5 !text-[10px]" onClick={() => void loadOlder()} disabled={loadingMore}>
              {loadingMore ? <Spinner size={12} /> : <ChevronUp size={13} />} نامەی کۆنتر
            </button>
          </div>
        )}

        {decoded.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
              <ShieldCheck size={28} />
            </div>
            <p className="text-sm font-extrabold text-ink">دەستپێکی گفتوگۆی پارێزراو</p>
            <p className="max-w-xs text-[11px] leading-6 text-muted">
              نامەکان لەم ئامێرە شێفڕە دەکرێن. تەنها تۆ و {conversation.title} دەتوانن بیانخوێننەوە.
            </p>
          </div>
        ) : (
          decoded.map(({ message, payload }, index) => {
            const previous = decoded[index - 1]?.message;
            const newDay = !previous || relativeDayKey(new Date(message.createdAt)) !== relativeDayKey(new Date(previous.createdAt));
            const mine = message.senderId === me?.id;
            const messageStatus = message.clientId ? status[message.clientId] : undefined;
            const showAvatar = !mine && (!decoded[index + 1] || decoded[index + 1]!.message.senderId !== message.senderId);
            const sameSender = previous && previous.senderId === message.senderId && !newDay;
            const messageRead = Boolean(peerReadAt && new Date(peerReadAt).getTime() >= new Date(message.createdAt).getTime());
            return (
              <div key={message.id}>
                {newDay && (
                  <div className="my-4 flex items-center justify-center">
                    <span className="rounded-full border border-line bg-[color:var(--surface-solid)]/80 px-3 py-1 text-[9px] font-bold text-muted">
                      {formatChatDay(message.createdAt)}
                    </span>
                  </div>
                )}
                <div className={cn('mb-1 flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start')}>
                  {!mine && (
                    <span className="w-7 shrink-0">
                      {showAvatar && <Avatar user={peer} size={28} />}
                    </span>
                  )}
                  <div className={cn('group relative max-w-[78%] sm:max-w-[68%]', mine ? 'items-end' : 'items-start')}>
                    {!mine && !sameSender && (
                      <p className="mb-0.5 flex items-center gap-1 px-1 text-[9px] font-bold text-[color:var(--primary)]">
                        {peer?.name}
                      </p>
                    )}
                    <div
                      className={cn(
                        'relative rounded-2xl px-3 py-2 text-[13px] leading-6',
                        mine ? 'bubble-me' : 'bubble-them',
                        messageStatus === 'failed' && 'border-red-400/60',
                      )}
                    >
                      {message.deletedAt ? (
                        <p className="italic text-muted">ئەم نامەیە سڕایەوە.</p>
                      ) : !payload ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted">
                          <Lock size={12} /> نامەیەکی پارێزراو — ناتوانرێت بخوێنرێتەوە.
                        </p>
                      ) : message.type === 'STICKER' && payload.sticker ? (
                        <span className="sticker-wiggle block py-2 text-center text-5xl leading-none">{payload.sticker}</span>
                      ) : message.type === 'EMOJI' && payload.emoji ? (
                        <span className="emoji-pop big-emoji block text-center">{payload.emoji}</span>
                      ) : (
                        <div className="space-y-1.5">
                          {payload.media && (
                            <SecureMedia media={payload.media} messageId={message.id} />
                          )}
                          {payload.text && (
                            <p className="whitespace-pre-wrap break-words text-ink">{payload.text}</p>
                          )}
                        </div>
                      )}
                      <div className={cn('mt-1 flex items-center justify-end gap-1 text-[9px]', mine ? 'text-[color:var(--muted)]' : 'text-muted-2')}>
                        <span>{formatTime(message.createdAt)}</span>
                        {mine && payload && !message.deletedAt && (
                          <>
                            {messageStatus === 'pending' ? (
                              <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                            ) : messageStatus === 'failed' ? (
                              <button type="button" onClick={() => void retry(message)} className="font-bold text-red-300 hover:underline">دووبارە</button>
                            ) : messageRead ? (
                              <CheckCheck size={12} className="text-[color:var(--primary)]" />
                            ) : (
                              <Check size={12} />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {mine && payload && !message.deletedAt && (
                      <button
                        type="button"
                        onClick={() => void deleteMessage(message.id)}
                        className="absolute -left-7 bottom-2 rounded-lg p-1 text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        title="سڕینەوەی نامە"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {peerTyping && (
          <div className="mb-2 flex items-center justify-start gap-2 ps-8">
            <span className="rounded-full border border-line bg-[color:var(--surface-solid)] px-2.5 py-1.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <span key={index} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${index * 120}ms` }} />
                ))}
              </span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showJump && (
        <button
          type="button"
          className="absolute bottom-24 left-6 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-[color:var(--surface-solid)] text-muted shadow-lg"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="بڕۆ بۆ خوارەوە"
        >
          <ChevronUp size={18} className="rotate-180" />
        </button>
      )}

      <footer className="shrink-0 border-t border-line p-2 sm:p-3">
        {uploadProgress !== null && (
          <div className="mb-2 px-1">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
              <span>{uploadLabel}</span><span>{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} />
          </div>
        )}

        {recording ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-3 py-2">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-400" />
            <span className="font-mono text-xs font-bold text-ink">{formatDuration(recordSeconds)}</span>
            <div className="flex h-7 flex-1 items-center justify-center gap-[3px]">
              {Array.from({ length: 28 }).map((_, index) => (
                <span key={index} className="w-[2px] animate-wave rounded-full bg-red-400/80" style={{ height: `${20 + ((index * 17) % 70)}%`, animationDelay: `${index * 40}ms` }} />
              ))}
            </div>
            <button type="button" className="icon-btn !h-9 !w-9 hover:!text-danger" onClick={() => finishRecording(false)} title="هەڵوەشاندنەوە">
              <X size={18} />
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-fg)]" onClick={() => finishRecording(true)} title="ناردن">
              <Send size={17} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="relative" ref={emojiRef}>
              <button type="button" className={cn('icon-btn !h-10 !w-10', emojiOpen && 'bg-[color:var(--surface-2)] text-ink')} onClick={() => setEmojiOpen((value) => !value)} aria-label="ئیمۆجی">
                <Smile size={20} />
              </button>
              {emojiOpen && (
                <div className="absolute bottom-12 right-0 z-30">
                  <EmojiPicker onEmoji={(emoji) => { setText((value) => `${value}${emoji}`.slice(0, 5000)); textareaRef.current?.focus(); }} onSticker={sendSticker} />
                </div>
              )}
            </div>
            <button type="button" className="icon-btn !h-10 !w-10" onClick={() => fileInputRef.current?.click()} disabled={sending || voiceBusy} aria-label="پێوەستکردنی فایل">
              <Paperclip size={19} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => handleTextChange(event.target.value.slice(0, 5000))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendText();
                }
              }}
              placeholder={peerKey ? 'نامەیەک بنووسە…' : 'چاوەڕوانی کلیلی پاراستن…'}
              className="input max-h-[118px] min-h-[42px] flex-1 resize-none !rounded-2xl !px-3.5 !py-2.5 !text-[13px] leading-6"
              rows={1}
              maxLength={5000}
              disabled={!peerKey}
            />
            {text.trim() ? (
              <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-fg)] transition-transform active:scale-95" onClick={sendText} disabled={sending || !peerKey} aria-label="ناردن">
                {sending ? <Spinner size={17} /> : <Send size={18} />}
              </button>
            ) : (
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-[color:var(--surface-2)] text-[color:var(--primary)] transition-transform active:scale-95 disabled:opacity-40"
                onClick={() => void startRecording()}
                disabled={sending || voiceBusy || !peerKey}
                title={`تۆمارکردنی دەنگ — شێوازی دەنگی تۆ: ${voiceEffectLabel}`}
                aria-label="تۆمارکردنی دەنگ"
              >
                {voiceBusy ? <Spinner size={17} /> : <Mic size={19} />}
              </button>
            )}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-muted-2">
          <span className="flex items-center gap-1"><Lock size={9} /> شێفڕەکراو لەم ئامێرە — سێرڤەر نامەکان ناخوێنێتەوە</span>
          <span className="hidden items-center gap-1 sm:flex"><Mic size={9} /> {voiceEffectLabel}</span>
        </div>
      </footer>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        conversation={conversation}
        decoded={decoded}
        meId={me?.id || ''}
        peerName={peer?.name || conversation.title}
      />
    </div>
  );
}

function ReportDialog({
  open,
  onClose,
  conversation,
  decoded,
  meId,
  peerName,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  decoded: Array<{ message: EncryptedMessage; payload: DecodedMessagePayload | null }>;
  meId: string;
  peerName: string;
}) {
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const evidence = useMemo(() => {
    return decoded
      .filter((item) => item.payload && !item.message.deletedAt)
      .slice(-25)
      .map((item) => ({
        sender: item.message.senderId === meId ? 'من' : peerName,
        sentAt: item.message.createdAt,
        text: item.payload?.text
          ? item.payload.text
          : item.payload?.media
            ? `[${item.payload.media.kind === 'audio' ? 'نامەی دەنگی' : item.payload.media.kind === 'image' ? 'وێنە' : item.payload.media.kind === 'video' ? 'ڤیدیۆ' : 'فایل'}]`
            : item.payload?.sticker
              ? '[ستیكەر]'
              : '',
      }))
      .filter((item) => item.text);
  }, [decoded, meId, peerName]);

  const submit = async () => {
    if (!consent) {
      toast('بۆ ناردنی ڕاپۆرت، ڕەزامەندی بۆ هاوبەشکردنی بەڵگە پێویستە.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/chats/conversations/${conversation.id}/report`, {
        method: 'POST',
        body: {
          reason,
          details: details.trim() || undefined,
          evidence,
          consent: true,
        },
      });
      toast('ڕاپۆرتەکەت نێردرا. بەڕێوەبەر پێداچوونەوەی دەکات.', 'success');
      onClose();
      setConsent(false);
      setDetails('');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="ڕاپۆرتکردنی گفتوگۆ"
      subtitle="چاتەکان بە شێوەی ئێندۆ-ئێندۆ پارێزراون. تەنها ئەو نامانەی کە خۆت ڕەزامەندی دەدەیت بۆ پشکنین دەگوازرێنەوە."
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose} disabled={busy}>پاشگەزبوونەوە</button>
          <button type="button" className="btn-danger" onClick={() => void submit()} disabled={busy || !consent}>
            {busy ? <Spinner size={15} /> : <Flag size={15} />} ناردنی ڕاپۆرت
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">هۆکاری ڕاپۆرت</label>
          <select value={reason} onChange={(event) => setReason(event.target.value)} className="input">
            <option value="harassment">هەراسانکردن یان هەڕەشە</option>
            <option value="spam">سپام یان ڕیکلام</option>
            <option value="scam">فێڵ یان ساختەکاری</option>
            <option value="violence">توندوتیژی یان ناوەڕۆکی ناشیرین</option>
            <option value="other">هۆکارێکی تر</option>
          </select>
        </div>
        <div>
          <label className="label">وردەکاری (ئارەزوومەندانە)</label>
          <textarea value={details} onChange={(event) => setDetails(event.target.value.slice(0, 2000))} className="textarea !min-h-[90px]" placeholder="ڕوونکردنەوەیەک بدە بۆ بەڕێوەبەر…" />
        </div>
        <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-ink"><ShieldCheck size={14} className="text-[color:var(--accent)]" /> بەڵگەی پێشکەشکراو</p>
          <p className="text-[10px] leading-6 text-muted">
            {evidence.length} نامەی کۆتایی (تێکست) لەگەڵ ڕاپۆرتەکە دەنێردرێت. میدیا و نامە دەنگییەکان ناگوازرێنەوە.
          </p>
          <div className="hide-scrollbar mt-2 max-h-32 space-y-1 overflow-y-auto">
            {evidence.slice(-6).map((item, index) => (
              <p key={index} className="rounded-lg bg-[color:var(--surface-solid)] px-2 py-1 text-[9px] text-muted">
                <span className="font-bold text-ink">{item.sender}:</span> {item.text.slice(0, 90)}
              </p>
            ))}
            {evidence.length === 0 && <p className="text-[10px] text-muted-2">هیچ نامەیەکی تێکست نییە بۆ هاوبەشکردن.</p>}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-5 text-muted">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[color:var(--danger)]" />
          <span>ڕەزامەندم کە {evidence.length} نامەی سەرەوە بۆ پشکنینی بەڕێوەبەر بهێڵدرێتەوە. دەزانم کە بەبێ ئەمە چاتەکە ئێندۆ-ئێندۆ پارێزراو دەمێنێتەوە.</span>
        </label>
      </div>
    </Modal>
  );
}
