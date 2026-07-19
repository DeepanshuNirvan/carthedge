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
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg py-14 text-center', className)}>
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-mid">{icon}</div>
      )}
      <div>
        <p className="font-medium text-hi">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-mid">{message}</p>}
      </div>
      {action}
    </div>
  );
}
