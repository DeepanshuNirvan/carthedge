import { cn } from '@/lib/cn';

type ProgressProps = { value: number; max: number; tone?: 'jade' | 'gold' | 'danger'; className?: string };

export function Progress({ value, max, tone = 'jade', className }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-expr ease-enter',
          tone === 'jade' && 'bg-jade-500',
          tone === 'gold' && 'bg-gold-400',
          tone === 'danger' && 'bg-danger',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
