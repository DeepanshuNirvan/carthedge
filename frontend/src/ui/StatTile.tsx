import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

type StatTileProps = {
  label: string;
  value: ReactNode;
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  accent?: 'jade' | 'gold' | 'danger';
  loading?: boolean;
};

export function StatTile({ label, value, delta, hint, icon, accent, loading }: StatTileProps) {
  return (
    <Card className="relative overflow-hidden p-5">
      {accent && (
        <div
          aria-hidden
          className={cn(
            'absolute -right-8 -top-8 size-24 rounded-full blur-2xl opacity-20',
            accent === 'jade' && 'bg-jade-500',
            accent === 'gold' && 'bg-gold-400',
            accent === 'danger' && 'bg-danger',
          )}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-mid">{label}</p>
        {icon && <span className="text-low">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight tnum">{value}</p>
      )}
      {(delta !== undefined || hint) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-jade-500' : 'text-danger')}>
              {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-low">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
