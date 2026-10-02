import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Table shell: opaque panel, frosted sticky header; low-value columns drop on phones. */
export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-x-auto overscroll-x-contain rounded-lg panel', className)}>
      <table className="w-full min-w-full border-collapse text-sm sm:min-w-[640px]">{children}</table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'glass-bar sticky top-0 z-10 whitespace-nowrap border-b px-4 py-3 text-left text-[12px] font-medium text-low first:rounded-tl-lg last:rounded-tr-lg',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle text-hi', className)} {...rest} />;
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-t transition-colors duration-micro first:border-t-0 hover:bg-[rgb(var(--field)/0.04)]',
        className,
      )}
      {...rest}
    />
  );
}
