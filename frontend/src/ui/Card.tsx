import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg bg-surface hairline shadow-soft', className)} {...rest} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 p-5 pb-0', className)}>
      <div>
        <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-mid">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
