import { cn } from '@/lib/cn';

type ProgressProps = { value: number; max: number; tone?: 'jade' | 'gold' | 'danger'; className?: string };

const fills: Record<NonNullable<ProgressProps['tone']>, string> = {
  jade: 'from-jade-400 to-jade-500',
  gold: 'from-gold-300 to-gold-400',
  danger: 'from-danger to-[rgb(210_78_66)]',
};

export function Progress({ value, max, tone = 'jade', className }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full neu-inset', className)}
    >
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] transition-[width] duration-expr ease-enter',
          fills[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
