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

const accentGlow: Record<NonNullable<StatTileProps['accent']>, string> = {
  jade: 'bg-jade-500',
  gold: 'bg-gold-400',
  danger: 'bg-danger',
};

export function StatTile({ label, value, delta, hint, icon, accent, loading }: StatTileProps) {
  return (
    <Card interactive className="group relative overflow-hidden p-5">
      {accent && (
        <div
          aria-hidden
          className={cn(
            'absolute -right-10 -top-10 size-28 rounded-full opacity-[0.18] blur-2xl transition-opacity duration-std group-hover:opacity-30',
            accentGlow[accent],
          )}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-mid">{label}</p>
        {icon && (
          <span className={cn('text-low', accent === 'jade' && 'text-jade-400', accent === 'gold' && 'text-gold-500')}>
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-8 w-24" />
      ) : (
        <p className="mt-2 font-display text-[1.7rem] font-semibold leading-none tracking-tight tnum text-hi">
          {value}
        </p>
      )}
      {(delta !== undefined || hint) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                delta >= 0 ? 'bg-jade-500/12 text-jade-400' : 'bg-danger/12 text-danger',
              )}
            >
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
