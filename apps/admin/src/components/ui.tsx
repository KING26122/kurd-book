import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useToastStore } from '@/stores/toast';
import type { AdminUser } from '@/types';

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
}

export function ScreenLoader({ label = 'پانێڵی بەڕێوەبەر بار دەکرێت…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[color:var(--primary)]" />
        <img src="/logo.svg" alt="" className="h-9 w-9 rounded-xl" />
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#42dfb4,#0f766e)',
  'linear-gradient(135deg,#efc96b,#b7791f)',
  'linear-gradient(135deg,#a78bfa,#5b21b6)',
  'linear-gradient(135deg,#67e8f9,#0e7490)',
  'linear-gradient(135deg,#ff8f9e,#b91c1c)',
  'linear-gradient(135deg,#93c5fd,#1d4ed8)',
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]!;
}

export function Avatar({
  user,
  size = 36,
  className,
}: {
  user?: Pick<AdminUser, 'name' | 'username' | 'avatarUrl'> | null;
  size?: number;
  className?: string;
}) {
  const name = user?.name || 'بەکارهێنەر';
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full bg-surface2', className)}
      style={{ width: size, height: size }}
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-extrabold text-white"
          style={{
            backgroundImage: gradientFor(user?.username || name),
            fontSize: Math.max(9, size * 0.36),
          }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-[color:var(--surface-2)] text-muted',
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/20 bg-red-400/10 text-red-300',
  info: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  gold: 'border-[color:var(--accent)]/25 bg-[color:var(--accent)]/10 text-[color:var(--accent)]',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-extrabold',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function verificationBadge(status: string) {
  switch (status) {
    case 'VERIFIED':
      return <Badge tone="gold" dot>پشتڕاستکراوە</Badge>;
    case 'PENDING':
      return <Badge tone="warning" dot>چاوەڕوان</Badge>;
    case 'REJECTED':
      return <Badge tone="danger" dot>ڕەتکراوە</Badge>;
    default:
      return <Badge tone="neutral">پشتڕاست نەکراوە</Badge>;
  }
}

export function reviewBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge tone="success" dot>پەسەندکراوە</Badge>;
    case 'REJECTED':
      return <Badge tone="danger" dot>ڕەتکراوە</Badge>;
    default:
      return <Badge tone="warning" dot>چاوەڕوان</Badge>;
  }
}

export function reportBadge(status: string) {
  switch (status) {
    case 'RESOLVED':
      return <Badge tone="success" dot>چارەسەرکراوە</Badge>;
    case 'DISMISSED':
      return <Badge tone="neutral" dot>پشتگوێخراوە</Badge>;
    default:
      return <Badge tone="danger" dot>کراوە</Badge>;
  }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="markdown-empty">
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
          {icon}
        </span>
      )}
      <h3 className="text-sm font-extrabold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-[11px] leading-6 text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Alert({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warning' | 'error' | 'success';
  children: ReactNode;
}) {
  const styles = {
    info: 'border-sky-400/20 bg-sky-400/[0.07] text-sky-100',
    warning: 'border-amber-400/20 bg-amber-400/[0.07] text-amber-100',
    error: 'border-red-400/20 bg-red-400/[0.07] text-red-100',
    success: 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100',
  };
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-6', styles[kind])}>
      <AlertTriangle size={14} className="mt-1 shrink-0" />
      <div className="flex-1">{children}</div>
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
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn('panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl', widths[size])}>
        {(title || subtitle) && (
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-extrabold text-ink">{title}</h2>}
              {subtitle && <p className="mt-1 text-[11px] leading-6 text-muted">{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn -me-1 -mt-1" onClick={onClose} aria-label="داخستن">
              <X size={17} />
            </button>
          </header>
        )}
        <div className="admin-scroll min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'دڵنیام',
  tone = 'danger',
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            پاشگەزبوونەوە
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-xs leading-7 text-muted">{description}</div>
    </Modal>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-3">
      <p className="text-[10px] text-muted-2">
        لاپەڕەی {page} لە {pages} · {total} تۆمار
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-soft !px-2.5 !py-1.5"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronRight size={14} /> پێشوو
        </button>
        <button
          type="button"
          className="btn-soft !px-2.5 !py-1.5"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          دواتر <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <span className={cn('skeleton block h-3', className)} />;
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return createPortal(
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[130] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-xl',
            item.kind === 'success' && 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100',
            item.kind === 'error' && 'border-red-400/30 bg-red-950/90 text-red-100',
            item.kind === 'info' && 'border-white/15 bg-[color:var(--panel)]/95 text-ink',
          )}
        >
          {item.kind === 'success' ? (
            <CheckCircle2 size={16} />
          ) : item.kind === 'error' ? (
            <XCircle size={16} />
          ) : (
            <Info size={16} />
          )}
          <span className="flex-1 leading-6">{item.message}</span>
          <button type="button" onClick={() => dismiss(item.id)} className="opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="stat-card">
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-wide text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-black leading-none text-ink">{value}</p>
          {hint && <p className="mt-1.5 text-[10px] text-muted-2">{hint}</p>}
        </div>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
            TONES[tone],
          )}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
