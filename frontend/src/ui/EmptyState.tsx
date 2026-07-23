import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="relative flex size-14 items-center justify-center rounded-2xl neu text-jade-400">
          <span aria-hidden className="absolute inset-0 rounded-2xl bg-jade-500/10 blur-lg" />
          <span className="relative">{icon}</span>
        </div>
      )}
      <div>
        <p className="font-display text-base font-semibold text-hi">{title}</p>
        {message && <p className="mx-auto mt-1.5 max-w-sm text-sm text-mid">{message}</p>}
      </div>
      {action}
    </div>
  );
}
