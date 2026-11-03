import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, ImageOff, X } from 'lucide-react';
import { adminFileUrl } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui';

/**
 * Verification documents and payment receipts are private: they require the
 * admin bearer token, so they cannot be rendered with a bare <img src>. This
 * component downloads the bytes once, shows an object URL, and cleans it up.
 */
export function PrivateFile({
  path,
  alt,
  label,
  className,
  emptyLabel = 'فایل بەردەست نییە',
}: {
  path?: string | null;
  alt: string;
  label?: string;
  className?: string;
  emptyLabel?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      setLoading(false);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setUrl(null);

    void adminFileUrl(path)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'فایلەکە نەدۆزرایەوە.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, attempt]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [zoom]);

  if (!path) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-[color:var(--bg)]/40 p-4 text-muted-2', className)}>
        <ImageOff size={22} />
        <span className="text-[10px]">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => url && setZoom(true)}
        className={cn(
          'group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-[color:var(--bg)]/50 transition-colors hover:border-[color:var(--border-strong)]',
          className,
        )}
        aria-label={label ? `پیشاندانی ${label}` : alt}
      >
        {loading && (
          <span className="flex flex-col items-center gap-2 text-[10px] text-muted">
            <Spinner size={18} className="text-[color:var(--primary)]" />
            بار دەکرێت…
          </span>
        )}
        {!loading && error && (
          <span className="flex flex-col items-center gap-2 px-3 text-center">
            <ImageOff size={22} className="text-[color:var(--danger)]" />
            <span className="text-[10px] leading-5 text-muted">{error}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setAttempt((value) => value + 1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                  setAttempt((value) => value + 1);
                }
              }}
              className="btn-ghost !px-2 !py-1 !text-[10px]"
            >
              هەوڵدانەوە
            </span>
          </span>
        )}
        {url && !loading && (
          <img src={url} alt={alt} className="h-full w-full object-contain" />
        )}
        {url && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] font-bold text-white">
              <Eye size={13} /> گەورەکردن
            </span>
          </span>
        )}
        {label && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-2 py-0.5 text-[9px] font-bold text-white/90">
            {label}
          </span>
        )}
      </button>

      {zoom &&
        url &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setZoom(false)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setZoom(false)}
              aria-label="داخستن"
            >
              <X size={20} />
            </button>
            <img
              src={url}
              alt={alt}
              className="max-h-[92dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[11px] text-white/80">
              {label || alt}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
