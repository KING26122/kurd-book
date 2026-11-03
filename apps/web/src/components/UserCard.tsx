import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, UserPlus, UserCheck, Clock3, Ban, Check, X } from 'lucide-react';
import type { User } from '@/types';
import { Avatar } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';

export function UserCard({
  user,
  subtitle,
  actions,
  compact = false,
  className,
}: {
  user: Pick<User, 'id' | 'username' | 'name' | 'avatarUrl' | 'verificationStatus' | 'isPro' | 'city' | 'bio' | 'online' | 'lastActiveAt' | 'mutualFriends'>;
  subtitle?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-transparent p-2.5 transition-colors hover:border-line hover:bg-[color:var(--surface-2)]/55',
        className,
      )}
    >
      <Link to={`/u/${user.username}`} className="shrink-0">
        <Avatar user={user} size={compact ? 42 : 48} showOnline />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/u/${user.username}`} className="flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-ink hover:underline">{user.name}</span>
          <UserBadges user={user} size={14} />
        </Link>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {subtitle ||
            (user.online ? (
              <span className="text-[color:var(--success)]">ئێستا ئۆنلاینە</span>
            ) : user.lastActiveAt ? (
              `${timeAgo(user.lastActiveAt)}`
            ) : (
              `@${user.username}`
            ))}
        </p>
        {!compact && (user.bio || user.city) && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-2">
            {user.city && <MapPin size={11} />}
            {user.city || user.bio}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function FollowAction({
  label,
  icon = 'add',
  onClick,
  loading,
  variant = 'primary',
}: {
  label: string;
  icon?: 'add' | 'check' | 'clock' | 'message' | 'block' | 'accept' | 'reject';
  onClick: () => void;
  loading?: boolean;
  variant?: 'primary' | 'soft' | 'danger';
}) {
  const icons = {
    add: UserPlus,
    check: UserCheck,
    clock: Clock3,
    message: MessageCircle,
    block: Ban,
    accept: Check,
    reject: X,
  };
  const Icon = icons[icon];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'btn !rounded-xl !px-3 !py-2 !text-[11px]',
        variant === 'primary' && 'btn-primary',
        variant === 'soft' && 'btn-soft',
        variant === 'danger' && 'btn-danger',
      )}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" /> : <Icon size={14} />}
      {label}
    </button>
  );
}
