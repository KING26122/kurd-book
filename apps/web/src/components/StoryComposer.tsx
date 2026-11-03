import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Sparkles, Upload, X } from 'lucide-react';
import { Modal, ProgressBar, Spinner } from '@/components/ui';
import { uploadFile } from '@/lib/upload';
import { api } from '@/lib/api';
import { errorMessage, toast } from '@/stores/toast';

export function StoryComposer({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption('');
      setProgress(0);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const publish = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const uploaded = await uploadFile(file, 'story', setProgress);
      await api('/api/stories', {
        method: 'POST',
        body: {
          mediaUrl: uploaded.url,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          caption: caption.trim() || undefined,
        },
      });
      toast('ستۆرییەکەت بڵاوکرایەوە ✨', 'success');
      window.dispatchEvent(new Event('kurdbook:stories-refresh'));
      onPublished();
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
      title="ستۆرییەکی نوێ"
      subtitle="وێنە یان ڤیدیۆ بە کوالیتی ڕەسەن — ٢٤ کاتژمێر دەمێنێتەوە"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[10px] text-muted sm:block">MP4 · WebM · JPG · PNG · HEIC · تا ٢٥٠ م.ب</p>
          <div className="flex flex-1 justify-end gap-2">
            <button type="button" className="btn-soft" onClick={onClose} disabled={busy}>پاشگەزبوونەوە</button>
            <button type="button" className="btn-primary" onClick={() => void publish()} disabled={!file || busy}>
              {busy ? <Spinner size={16} /> : <Upload size={16} />}
              {busy ? `بارکردن ${progress}%` : 'بڵاوکردنەوە'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-3xl bg-black">
            {file?.type.startsWith('video/') ? (
              <video src={preview} className="max-h-[52vh] w-full object-contain" controls playsInline />
            ) : (
              <img src={preview} alt="پێشبینین" className="max-h-[52vh] w-full object-contain" />
            )}
            <button
              type="button"
              className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
              onClick={() => setFile(null)}
              disabled={busy}
              aria-label="لابردنی فایل"
            >
              <X size={17} />
            </button>
            <span className="absolute right-3 top-3 chip !bg-black/55 !text-white">
              {file?.name}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-solid)]/50 transition-colors hover:border-[color:var(--primary)]/60 hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
              <ImagePlus size={28} />
            </span>
            <span className="text-sm font-extrabold text-ink">وێنە یان ڤیدیۆ هەڵبژێرە</span>
            <span className="text-[11px] text-muted">کوالیتی ڕەسەن دەپارێزرێت — هیچ پەستاندنێک نییە</span>
          </button>
        )}

        {busy && <ProgressBar value={progress} />}

        <div>
          <label className="label" htmlFor="story-caption">تێبینی (ئارەزوومەندانە)</label>
          <textarea
            id="story-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 300))}
            placeholder="شتێک بنووسە لەسەر ئەم ستۆرییە…"
            className="textarea !min-h-[80px]"
            maxLength={300}
            disabled={busy}
          />
          <div className="mt-1 text-left text-[10px] text-muted-2">{caption.length}/300</div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-3 py-2.5 text-[10px] leading-5 text-muted">
          <Sparkles size={15} className="shrink-0 text-[color:var(--accent)]" />
          وێنە و ڤیدیۆکان بە کوالیتی بەرز بەرز دەکرێنەوە. ستۆری تەنها بۆ هاوڕێکانت دەردەکەوێت.
        </div>
      </div>
    </Modal>
  );
}
