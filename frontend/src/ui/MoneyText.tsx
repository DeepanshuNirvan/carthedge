import { cn } from '@/lib/cn';
import { formatPaise, formatPaiseCompact } from '@/lib/money';

type MoneyTextProps = {
  paise: number;
  compact?: boolean;
  className?: string;
  strike?: boolean;
};

/** The only way money is rendered: tabular figures, formatted en-IN. */
export function MoneyText({ paise, compact, className, strike }: MoneyTextProps) {
  return (
    <span className={cn('tnum tracking-snug', strike && 'text-low line-through decoration-1', className)}>
      {compact ? formatPaiseCompact(paise) : formatPaise(paise)}
    </span>
  );
}
