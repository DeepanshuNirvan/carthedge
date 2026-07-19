import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Styled table shell — horizontal scroll on mobile, sticky header. */
export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg bg-surface hairline shadow-soft', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'sticky top-0 whitespace-nowrap bg-surface-2/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-low backdrop-blur first:rounded-tl-lg last:rounded-tr-lg',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle', className)} {...rest} />;
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-t transition-colors duration-micro hover:bg-surface-2/60', className)}
      {...rest}
    />
  );
}
