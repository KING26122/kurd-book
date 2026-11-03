import type { User } from '@/types';
import { cn } from '@/lib/cn';

export function VerifiedCrown({ size = 17, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('verified-crown inline-flex shrink-0', className)}
      title="هەژماری پشتڕاستکراوە"
      aria-label="هەژماری پشتڕاستکراوە"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="crown-gold" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff3b0" />
            <stop offset=".45" stopColor="#efc65d" />
            <stop offset="1" stopColor="#b8862b" />
          </linearGradient>
        </defs>
        <path
          d="M3 8.2l4.1 3.5L12 4.5l4.9 7.2L21 8.2l-1.7 9.1a2 2 0 0 1-2 1.7H6.7a2 2 0 0 1-2-1.7L3 8.2Z"
          fill="url(#crown-gold)"
          stroke="#8c5d17"
          strokeWidth=".8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="15.2" r="1.35" fill="#fff6d5" stroke="#a87822" strokeWidth=".5" />
      </svg>
    </span>
  );
}

export function DiamondBadge({ size = 17, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 drop-shadow-[0_0_6px_rgba(104,214,255,.45)]', className)}
      title="ئەندامی Pro"
      aria-label="ئەندامی Pro"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="gem-ice" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8fbff" />
            <stop offset=".45" stopColor="#7fe4ff" />
            <stop offset="1" stopColor="#3f8cff" />
          </linearGradient>
        </defs>
        <path
          d="M7 3h10l4 6-9 12L3 9l4-6Z"
          fill="url(#gem-ice)"
          stroke="#2b6cc4"
          strokeWidth=".7"
          strokeLinejoin="round"
        />
        <path d="M3 9h18M7 3l3.5 6L12 21l1.5-12L17 3" stroke="#ffffff" strokeOpacity=".55" strokeWidth=".8" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ProCrownGem({ size = 16 }: { size?: number }) {
  return (
    <span
      className="pro-pill inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-extrabold leading-none"
      title="تاج و ئەڵماسی Pro"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="pro-gradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff4c4" />
            <stop offset=".42" stopColor="#ecc766" />
            <stop offset=".72" stopColor="#7fe4ff" />
            <stop offset="1" stopColor="#4b91ff" />
          </linearGradient>
        </defs>
        <path
          d="M3 7.5l4.2 3.2L12 4l4.8 6.7L21 7.5l-1.8 9A2 2 0 0 1 17.2 18H6.8a2 2 0 0 1-2-1.5l-1.8-9Z"
          fill="url(#pro-gradient)"
          stroke="#a47520"
          strokeWidth=".7"
          strokeLinejoin="round"
        />
        <path d="M9 14l3-3.4 3 3.4-3 4-3-4Z" fill="#eafaff" stroke="#3b85d5" strokeWidth=".6" />
      </svg>
      <span className="text-[color:var(--accent)]">PRO</span>
    </span>
  );
}

export function UserBadges({
  user,
  size = 16,
  withProLabel = false,
  className,
}: {
  user: { verificationStatus: string; isPro: boolean };
  size?: number;
  withProLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)}>
      {user.verificationStatus === 'VERIFIED' && <VerifiedCrown size={size} />}
      {user.isPro &&
        (withProLabel ? <ProCrownGem size={Math.max(12, size - 2)} /> : <DiamondBadge size={size} />)}
    </span>
  );
}
