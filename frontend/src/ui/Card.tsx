import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** frosted glass instead of the solid panel surface */
  glass?: boolean;
  /** cursor-follow luminous edge on hover (adds to the default lift) */
  interactive?: boolean;
  /** opt out of the hover lift — for chart/table containers */
  flat?: boolean;
};

export function Card({ glass, interactive, flat, className, ...rest }: CardProps) {
  // .spotlight reads --mx/--my; without this the "luminous edge" never moved.
  // The rect is measured once on enter, so the move handler stays a pure style
  // write — reading getBoundingClientRect every pointermove would force layout
  // on each frame and is what makes hover effects feel heavy.
  const rect = useRef<DOMRect | null>(null);

  const onEnter = (e: PointerEvent<HTMLDivElement>) => {
    rect.current = e.currentTarget.getBoundingClientRect();
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = rect.current;
    if (!r) return;
    const el = e.currentTarget;
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      onPointerEnter={interactive ? onEnter : undefined}
      onPointerMove={interactive ? onMove : undefined}
      className={cn(
        'rounded-lg transition-[transform,box-shadow] duration-std ease-enter',
        glass ? 'glass' : 'panel',
        !flat && 'hover:-translate-y-0.5 hover:shadow-raised',
        interactive && 'spotlight',
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
    <div className={cn('flex flex-wrap items-start justify-between gap-3 p-5 pb-0', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold tracking-tight text-hi">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-mid">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
