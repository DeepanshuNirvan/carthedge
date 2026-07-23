import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** frosted glass instead of the solid panel surface */
  glass?: boolean;
  /** cursor-follow luminous edge on hover */
  interactive?: boolean;
};

export function Card({ glass, interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        glass ? 'glass' : 'panel',
        interactive &&
          'spotlight transition-transform duration-std ease-enter hover:-translate-y-0.5 hover:shadow-raised',
        className,
      )}
      {...rest}
    />
  );
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
        <h3 className="font-display text-base font-semibold tracking-tight text-hi">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-mid">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
