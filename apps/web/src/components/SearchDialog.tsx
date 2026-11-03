import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal, Spinner } from '@/components/ui';
import { UserCard } from '@/components/UserCard';
import type { User } from '@/types';

export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-10 w-full max-w-[320px] items-center gap-2 rounded-full border border-line bg-[color:var(--surface-solid)]/70 px-4 text-xs text-muted transition-colors hover:border-[color:var(--border-strong)] hover:text-ink md:flex"
    >
      <Search size={16} />
      <span className="flex-1 text-right">گەڕان بۆ کەس، ناو یان شار…</span>
      <kbd className="rounded-md border border-line bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[9px] text-muted-2">/</kbd>
    </button>
  );
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setUsers([]);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 1) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(term)}&limit=12`);
        setUsers(data.users);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openUser = (username: string) => {
    onClose();
    navigate(`/u/${username}`);
  };

  return (
    <Modal open={open} onClose={onClose} size="md" panelClassName="max-w-2xl">
      <div className="-m-1">
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-solid)] px-4 py-3">
          <Search size={19} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="گەڕان بۆ کەس، ناوی بەکارهێنەر یان شار…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-2"
          />
          {query && (
            <button type="button" className="text-muted hover:text-ink" onClick={() => setQuery('')}>
              <X size={17} />
            </button>
          )}
          {loading && <Spinner size={16} className="text-[color:var(--primary)]" />}
        </div>

        <div className="mt-2">
          {!query.trim() ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">
                <Users size={28} />
              </div>
              <p className="text-sm font-extrabold text-ink">کەسێک بدۆزەرەوە</p>
              <p className="max-w-xs text-xs leading-6 text-muted">
                بە ناو، ناوی بەکارهێنەر یان شار بگەڕێ. دەتوانیت هاوڕێیەتی بکەیت و چاتی پارێزراو دەست پێ بکەیت.
              </p>
              <button type="button" className="btn-soft mt-1 !text-xs" onClick={() => { onClose(); navigate('/explore'); }}>
                بینینی هەموو کەسەکان
              </button>
            </div>
          ) : users.length === 0 && !loading ? (
            <div className="py-12 text-center text-xs text-muted">
              هیچ بەکارهێنەرێک بە «{query}» نەدۆزرایەوە.
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((user) => (
                <div key={user.id} onClick={() => openUser(user.username)}>
                  <UserCard user={user} compact />
                </div>
              ))}
            </div>
          )}
        </div>
        {users.length > 0 && (
          <button
            type="button"
            className="btn-soft mt-3 w-full !text-xs"
            onClick={() => {
              onClose();
              navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            بینینی هەموو ئەنجامەکان
          </button>
        )}
      </div>
    </Modal>
  );
}
