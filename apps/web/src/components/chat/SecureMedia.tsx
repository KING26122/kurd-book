import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Loader2, Pause, Play, RotateCw } from 'lucide-react';
import { decryptFile } from '@/lib/crypto';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { DecodedMedia } from '@/types';

function Waveform({ seed, progress, onSeek }: { seed: string; progress: number; onSeek: (value: number) => void }) {
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: 34 }, (_, index) => {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      return 22 + (hash % 72);
    });
  }, [seed]);

  return (
    <button
      type="button"
      className="flex h-10 flex-1 items-center gap-[2px] px-1"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (rect.right - event.clientX) / rect.width));
        onSeek(ratio);
      }}
      aria-label="چاوەڕوانی دەنگ"
    >
      {bars.map((height, index) => {
        const active = index / bars.length <= progress;
        return (
          <span
            key={index}
            className={cn('w-[2px] shrink-0 rounded-full transition-colors', active ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--muted-2)]/40')}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </button>
  );
}

function VoiceNotePlayer({ url, fallbackDuration, seed }: { url: string; fallbackDuration?: number; seed: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      audio.currentTime = 0;
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [url]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className="flex w-[230px] items-center gap-2 sm:w-[280px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={() => void toggle()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-fg)]"
        aria-label={playing ? 'وەستان' : 'لێدان'}
      >
        {playing ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ps-0.5" />}
      </button>
      <Waveform
        seed={seed}
        progress={progress}
        onSeek={(value) => {
          const audio = audioRef.current;
          if (!audio || !duration) return;
          audio.currentTime = value * duration;
          setCurrent(audio.currentTime);
        }}
      />
      <span className="shrink-0 text-[9px] tabular-nums text-muted">{formatDuration(playing || current > 0 ? current : duration)}</span>
    </div>
  );
}

export function SecureMedia({ media, messageId }: { media: DecodedMedia; messageId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(false);
    (async () => {
      try {
        const response = await fetch(media.url);
        if (!response.ok) throw new Error('media download failed');
        const encrypted = await response.blob();
        const decrypted = await decryptFile(encrypted, media.key, media.nonce);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([decrypted], { type: media.mime }));
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.key, media.mime, media.nonce, media.url, attempt]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-[10px] text-red-200">
        <RotateCw size={13} />
        <span className="flex-1">میدیا نەکرایەوە.</span>
        <button type="button" className="rounded-lg bg-white/10 px-2 py-1" onClick={() => setAttempt((value) => value + 1)}>هەوڵدانەوە</button>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-36 w-52 items-center justify-center rounded-2xl border border-line bg-[color:var(--surface-2)]/60 text-muted">
        <Loader2 size={20} className="animate-spin" />
        <span className="ms-2 text-[10px]">شێفڕەکردنەوەی میدیا…</span>
      </div>
    );
  }

  if (media.kind === 'audio') {
    return <VoiceNotePlayer url={url} fallbackDuration={media.duration} seed={messageId} />;
  }

  if (media.kind === 'image') {
    return (
      <button type="button" onClick={() => window.open(url, '_blank', 'noopener')} className="block overflow-hidden rounded-2xl">
        <img src={url} alt={media.name || ''} className="max-h-[340px] w-auto max-w-full object-contain" loading="lazy" />
      </button>
    );
  }

  if (media.kind === 'video') {
    return (
      <video src={url} controls playsInline className="max-h-[340px] max-w-full rounded-2xl bg-black" />
    );
  }

  return (
    <a href={url} download={media.name || 'kurdbook-file'} className="flex items-center gap-2 rounded-xl border border-line bg-[color:var(--surface-2)]/60 px-3 py-2 text-[11px] text-ink">
      <FileText size={16} className="text-[color:var(--primary)]" />
      <span className="max-w-[180px] truncate">{media.name || 'فایل'}</span>
      <Download size={14} className="ms-auto text-muted" />
    </a>
  );
}
