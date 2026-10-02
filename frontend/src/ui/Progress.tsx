import { cn } from '@/lib/cn';

type ProgressProps = { value: number; max: number; tone?: 'jade' | 'gold' | 'danger'; className?: string };

const fills: Record<NonNullable<ProgressProps['tone']>, string> = {
  jade: 'bg-jade-500',
  gold: 'bg-gold-400',
  danger: 'bg-danger',
};

export function Progress({ value, max, tone = 'jade', className }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn('h-1.5 w-full overflow-hidden rounded-full neu-inset', className)}
    >
      <div
        className={cn(
          'h-full rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] transition-[width] duration-expr ease-enter',
          fills[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
