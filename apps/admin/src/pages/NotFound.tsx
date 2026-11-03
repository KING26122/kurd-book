import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, ShieldQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export function AdminNotFoundPage() {
  return (
    <div className="panel rounded-2xl">
      <EmptyState
        icon={<ShieldQuestion size={28} />}
        title="ئەم پەڕەیە نەدۆزرایەوە"
        description="ئەم بەستەرە لە پانێڵی بەڕێوەبەردا بوونی نییە. لەوانەیە کارێکە هەڵوەشێنرابێتەوە یان بەستەرەکە هەڵە بێت."
        action={
          <Link to="/" className="btn-primary !text-[10px]">
            <LayoutDashboard size={14} /> گەڕانەوە بۆ داشبۆرد
            <ArrowRight size={14} />
          </Link>
        }
      />
    </div>
  );
}
