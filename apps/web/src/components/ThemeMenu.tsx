import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { applyTheme, THEMES, useThemeStore } from '@/stores/theme';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ThemeId } from '@/types';

export function ThemeMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    setOpen(false);
    api('/api/users/me', { method: 'PATCH', body: { theme: id } }).catch(() => undefined);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'icon-btn',
          compact && 'bg-[color:var(--surface-2)]',
          open && 'bg-[color:var(--surface-2)] text-ink',
        )}
        aria-label="ڕووکار"
        title="ڕووکار"
      >
        <Palette size={19} />
      </button>
      {open && (
        <div className="panel absolute left-0 top-12 z-[70] w-[min(92vw,330px)] rounded-3xl p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-extrabold text-ink">ڕووکاری کورد بووک</p>
          <div className="space-y-1.5">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-2xl border p-2.5 text-right transition-all',
                  theme === item.id
                    ? 'border-[color:var(--primary)]/50 bg-[color:var(--primary)]/10'
                    : 'border-transparent hover:border-line hover:bg-[color:var(--surface-2)]',
                )}
              >
                <span className="flex h-10 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  {item.swatch.map((color) => (
                    <span key={color} className="h-full flex-1" style={{ background: color }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-ink">{item.name}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">{item.subtitle}</span>
                </span>
                {theme === item.id && <Check size={16} className="text-[color:var(--primary)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
