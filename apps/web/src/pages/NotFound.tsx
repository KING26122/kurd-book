import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Home } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export function NotFoundPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: 'var(--gradient)' }}
      />
      <div className="panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--primary)] shadow-glow">
          <Compass size={30} />
        </div>
        <p className="mt-6 font-display text-6xl font-black leading-none aurora-text">404</p>
        <h1 className="mt-4 text-xl font-black text-ink">ئەم پەڕەیە نەدۆزرایەوە</h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          لەوانەیە لینکەکە کۆن بێت، یان پەڕەکە گواسترابێتەوە. با بگەڕێینەوە بۆ شوێنێکی ئاشنا.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/" className="btn-primary">
            <Home size={16} /> ماڵەوە
          </Link>
          <Link to={user ? '/explore' : '/login'} className="btn-soft">
            {user ? 'دۆزینەوە' : 'چوونەژوورەوە'} <ArrowRight size={16} className="rotate-180" />
          </Link>
        </div>
        <p className="mt-8 text-[10px] tracking-wide text-muted-2">کورد بووک · KURD BOOK</p>
      </div>
    </div>
  );
}
