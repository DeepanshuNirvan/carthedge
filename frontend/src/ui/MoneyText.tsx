import { cn } from '@/lib/cn';
import { formatPaise, formatPaiseCompact } from '@/lib/money';

type MoneyTextProps = {
  paise: number;
  compact?: boolean;
  className?: string;
  strike?: boolean;
};

/** The only way money is rendered — mono, tabular, formatted en-IN. */
export function MoneyText({ paise, compact, className, strike }: MoneyTextProps) {
  return (
    <span className={cn('font-mono tnum', strike && 'text-low line-through', className)}>
      {compact ? formatPaiseCompact(paise) : formatPaise(paise)}
    </span>
  );
}
