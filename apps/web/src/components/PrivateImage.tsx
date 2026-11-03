import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';

/**
 * Loads a private upload through fetch with the bearer token, because the
 * private upload endpoints deliberately reject unauthenticated <img> requests.
 */
export function PrivateImage({
  src,
  alt = '',
  className,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setObjectUrl(null);
    setFailed(false);

    const token = useAuthStore.getState().accessToken;
    fetch(src, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-[color:var(--surface-2)] text-muted-2',
          className,
        )}
      >
        <ImageOff size={24} />
        <span className="text-[10px]">وێنە بەردەست نییە</span>
      </div>
    );
  }

  if (!objectUrl) {
    return <div className={cn('skeleton', className)} />;
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
      decoding="async"
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
}
