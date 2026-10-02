import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BulbString } from '@/ui/BulbString';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
  /** h1 when the empty state is the whole page (a buyer's dead link), so it still has a heading */
  titleAs?: 'p' | 'h1' | 'h2';
};

/** An empty place is a row of unlit bulbs: nothing is wrong, it is waiting for you. */
export function EmptyState({ icon, title, message, action, className, titleAs: Title = 'p' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 rounded-lg px-6 py-14 text-center', className)}>
      {icon && (
        <div className="relative flex flex-col items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full neu text-jade-ink">{icon}</span>
          <BulbString count={5} />
        </div>
      )}
      <div>
        <Title className="text-[15px] font-semibold tracking-snug text-hi">{title}</Title>
        {message && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-mid">{message}</p>}
      </div>
      {action}
    </div>
  );
}
