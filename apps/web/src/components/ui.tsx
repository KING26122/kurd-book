import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useToastStore } from '@/stores/toast';
import type { User } from '@/types';

export function Spinner({ className, size = 18 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
}

export function ScreenLoader({ label = 'کورد بووک بار دەکرێت…' }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-line" />
        <div className="absolute inset-0 animate-spinSlow rounded-full border-2 border-transparent border-t-[color:var(--primary)]" />
        <img src="/logo.svg" alt="" className="h-11 w-11 rounded-2xl" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#39e0b2,#0f766e)',
  'linear-gradient(135deg,#f3cc6d,#c06a2c)',
  'linear-gradient(135deg,#b45bff,#5b21b6)',
  'linear-gradient(135deg,#3cf2e3,#0e7490)',
  'linear-gradient(135deg,#ff8a7a,#b91c1c)',
  'linear-gradient(135deg,#93c5fd,#1d4ed8)',
  'linear-gradient(135deg,#f9a8d4,#9d174d)',
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]!;
}

export function Avatar({
  user,
  size = 44,
  className,
  ring = false,
  showOnline = false,
  onClick,
}: {
  user?: Pick<User, 'name' | 'username' | 'avatarUrl' | 'online'> | null;
  size?: number;
  className?: string;
  ring?: boolean;
  showOnline?: boolean;
  onClick?: () => void;
}) {
  const name = user?.name || 'بەکارهێنەر';
  const content = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={name}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span
      className="flex h-full w-full items-center justify-center font-extrabold text-white"
      style={{ backgroundImage: gradientFor(user?.username || name), fontSize: Math.max(10, size * 0.34) }}
    >
      {initials(name)}
    </span>
  );

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-surface2',
        ring && 'ring-2 ring-[color:var(--primary)] ring-offset-2 ring-offset-[color:var(--bg)]',
        onClick && 'cursor-pointer transition-transform hover:scale-105',
        className,
      )}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') onClick();
            }
          : undefined
      }
    >
      {content}
      {showOnline && user?.online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2 border-[color:var(--bg)] bg-[color:var(--success)]"
          style={{ width: Math.max(9, size * 0.24), height: Math.max(9, size * 0.24) }}
        />
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  panelClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-6xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'panel page-enter flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl',
          widths[size],
          panelClassName,
        )}
      >
        {(title || subtitle) && (
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-lg font-extrabold text-ink">{title}</h2>}
              {subtitle && <p className="mt-1 text-xs leading-6 text-muted">{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn -me-1 -mt-1" onClick={onClose} aria-label="داخستن">
              <X size={19} />
            </button>
          </header>
        )}
        <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface2 text-[color:var(--primary)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-7 text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function PostSkeleton() {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-4 h-52 w-full rounded-2xl" />
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return createPortal(
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[120] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
      {toasts.map((item) => {
        const icon =
          item.kind === 'success' ? (
            <CheckCircle2 size={18} />
          ) : item.kind === 'error' ? (
            <XCircle size={18} />
          ) : (
            <Info size={18} />
          );
        return (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl',
              item.kind === 'success' && 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100',
              item.kind === 'error' && 'border-red-400/30 bg-red-950/90 text-red-100',
              item.kind === 'info' && 'border-white/15 bg-[color:var(--surface-solid)]/95 text-ink',
            )}
          >
            {icon}
            <span className="flex-1 leading-6">{item.message}</span>
            <button type="button" onClick={() => dismiss(item.id)} className="opacity-60 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50',
        checked
          ? 'border-transparent bg-[color:var(--primary)]'
          : 'border-line bg-[color:var(--surface-3)]',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all',
          checked ? 'right-1' : 'right-6',
        )}
      />
    </button>
  );
}

export function Alert({
  kind = 'info',
  children,
  className,
}: {
  kind?: 'info' | 'warning' | 'error' | 'success';
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    warning: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    error: 'border-red-400/25 bg-red-400/10 text-red-100',
    success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  };
  return (
    <div className={cn('flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-6', styles[kind], className)}>
      <AlertTriangle size={15} className="mt-1 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]', className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundImage: 'var(--gradient)' }}
      />
    </div>
  );
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--danger)] px-1.5 text-[10px] font-extrabold leading-[18px] text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-3 py-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface2 text-[color:var(--primary)]">
        {icon}
      </span>
      <div>
        <div className="text-sm font-extrabold text-ink">{value}</div>
        <div className="text-[10px] text-muted">{label}</div>
      </div>
    </div>
  );
}
