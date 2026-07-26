import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import type { StoreBusiness } from '@/api/types';

export function StoreFooter({ business }: { business: StoreBusiness }) {
  return (
    <footer className="border-t bg-surface/40 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
        <Link
          to="/track"
          className="inline-flex items-center gap-2 text-sm font-medium text-jade-500 hover:underline"
        >
          <PackageSearch className="size-4" />
          Track your order
        </Link>
        <p className="text-xs leading-relaxed text-low">
          {business.name}
          {business.city && ` · ${business.city}`}
          {business.codEnabled && ' · Cash on delivery available'}
        </p>
        <a href="/" className="text-[11px] text-low transition-colors hover:text-mid">
          Powered by <span className="font-medium text-mid">CartHedge</span>
        </a>
      </div>
    </footer>
  );
}
