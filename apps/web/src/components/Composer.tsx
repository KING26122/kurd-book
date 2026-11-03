import { useEffect, useRef, useState } from 'react';
import { Globe2, ImagePlus, Loader2, Send, Shield, Trash2, Users, Video, X } from 'lucide-react';
import { Modal, ProgressBar, Spinner } from '@/components/ui';
import { fileKind, mediaDimensions, uploadFile } from '@/lib/upload';
import { api } from '@/lib/api';
import { errorMessage, toast } from '@/stores/toast';
import { cn } from '@/lib/cn';
import type { MediaItem, Post } from '@/types';

interface SelectedFile {
  file: File;
  preview: string;
  kind: 'image' | 'video' | 'audio' | 'file';
}

export function Composer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS'>('PUBLIC');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      files.forEach((item) => URL.revokeObjectURL(item.preview));
      setFiles([]);
      setContent('');
      setVisibility('PUBLIC');
      setBusy(false);
      setProgress(0);
    }
    // Only reset when the modal closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => files.forEach((item) => URL.revokeObjectURL(item.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = [...list].filter((file) => {
      if (file.size > 250 * 1024 * 1024) {
        toast(`${file.name} زۆر گەورەیە (زۆرترین ٢٥٠ م.ب).`, 'error');
        return false;
      }
      const kind = fileKind(file);
      if (kind !== 'image' && kind !== 'video') {
        toast('تەنها وێنە و ڤیدیۆ بۆ پۆست پشتگیری دەکرێن.', 'error');
        return false;
      }
      return true;
    });
    setFiles((current) => {
      const next = [...current];
      for (const file of accepted) {
        if (next.length >= 6) break;
        next.push({ file, preview: URL.createObjectURL(file), kind: fileKind(file) as 'image' | 'video' });
      }
      return next;
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((current) => {
      URL.revokeObjectURL(current[index]!.preview);
      return current.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (!content.trim() && files.length === 0) {
      toast('تێکست یان میدیایەک زیاد بکە.', 'error');
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const media: MediaItem[] = [];
      for (let index = 0; index < files.length; index++) {
        const item = files[index]!;
        const uploaded = await uploadFile(item.file, 'post', (value) => {
          const overall = ((index + value / 100) / files.length) * 90;
          setProgress(overall);
        });
        const dimensions = await mediaDimensions(item.file);
        media.push({
          url: uploaded.url,
          type: item.kind === 'video' ? 'video' : 'image',
          ...dimensions,
          name: item.file.name,
        });
      }
      setProgress(95);
      const data = await api<{ post: Post }>('/api/posts', {
        method: 'POST',
        body: { content: content.trim(), media, visibility },
      });
      setProgress(100);
      onCreated(data.post);
      toast('پۆستەکەت بڵاوکرایەوە 🎉', 'success');
      window.dispatchEvent(new Event('kurdbook:feed-refresh'));
      onClose();
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
      title="پۆستێکی نوێ"
      subtitle="بیرۆکەکەت، وێنەکەت یان ڤیدیۆکەت لەگەڵ کورد بووک هاوبەش بکە"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-2xl border border-line p-1">
            <button
              type="button"
              onClick={() => setVisibility('PUBLIC')}
              className={cn('chip !border-0 !py-1.5', visibility === 'PUBLIC' && 'chip-active')}
            >
              <Globe2 size={13} /> گشتی
            </button>
            <button
              type="button"
              onClick={() => setVisibility('FRIENDS')}
              className={cn('chip !border-0 !py-1.5', visibility === 'FRIENDS' && 'chip-active')}
            >
              <Users size={13} /> هاوڕێیان
            </button>
          </div>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={busy}>
            {busy ? <Spinner size={16} /> : <Send size={16} />}
            {busy ? `بارکردن ${Math.round(progress)}%` : 'بڵاوکردنەوە'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 5000))}
          placeholder="چی لە دڵتە، کوردستان؟"
          className="textarea !min-h-[150px] !text-base"
          autoFocus
          maxLength={5000}
          disabled={busy}
        />
        <div className="-mt-2 flex justify-between text-[10px] text-muted-2">
          <span>پۆستەکەت بە کوالیتی ڕەسەن بڵاو دەبێتەوە</span>
          <span>{content.length}/5000</span>
        </div>

        {files.length > 0 && (
          <div className={cn('grid gap-2', files.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {files.map((item, index) => (
              <div key={item.preview} className="group relative overflow-hidden rounded-2xl border border-line bg-black">
                {item.kind === 'video' ? (
                  <video src={item.preview} className="h-40 w-full object-cover" muted playsInline />
                ) : (
                  <img src={item.preview} alt="" className="h-40 w-full object-cover" />
                )}
                <span className="absolute bottom-2 right-2 chip !bg-black/60 !text-white !text-[9px]">
                  {item.kind === 'video' ? <Video size={11} /> : <ImagePlus size={11} />}
                  {(item.file.size / 1024 / 1024).toFixed(1)} م.ب
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={busy}
                  className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-red-600"
                  aria-label="لابردن"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {busy && (
          <div className="space-y-1.5">
            <ProgressBar value={progress} />
            <p className="flex items-center gap-1.5 text-[10px] text-muted">
              <Loader2 size={11} className="animate-spin" /> فایلەکان بەرز دەکرێنەوە… تکایە ڕەمەکە مەکە.
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-soft !flex-1 !justify-start !text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={busy || files.length >= 6}
          >
            <ImagePlus size={17} className="text-[color:var(--primary)]" /> وێنە / ڤیدیۆ
          </button>
          <span className="text-[10px] text-muted-2">{files.length}/6</span>
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-3 py-2.5 text-[10px] leading-5 text-muted">
          <Shield size={15} className="mt-0.5 shrink-0 text-[color:var(--primary)]" />
          فایلەکان وەک خۆیان پارێزراون — کورد بووک وێنە و ڤیدیۆکان کۆمپرێس ناکات. کوالیتی ٤K و HEIC پشتگیری دەکرێن.
        </div>
      </div>
    </Modal>
  );
}

export function ComposerPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel mb-4 flex w-full items-center gap-3 p-3.5 text-right transition-all hover:border-[color:var(--border-strong)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--gradient-soft)] text-[color:var(--primary)]">
        <ImagePlus size={19} />
      </span>
      <span className="flex-1 text-sm text-muted">چی لە دڵتە، کوردستان؟</span>
      <span className="btn-primary hidden !rounded-xl !px-4 !py-2 !text-xs sm:inline-flex">بڵاوکردنەوە</span>
    </button>
  );
}
