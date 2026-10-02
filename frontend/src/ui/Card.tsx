import { useRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** frosted glass instead of the opaque panel; for panes that float over imagery */
  glass?: boolean;
  /** pointer-lit edge plus a small lift: only for cards that are themselves a target */
  interactive?: boolean;
  /** kept for call sites that opted out of the old default lift; cards are still by default now */
  flat?: boolean;
};

export function Card({ glass, interactive, className, ...props }: CardProps) {
  const rest = { ...props };
  delete rest.flat;
  // .spotlight reads --mx/--my. The rect is measured once on enter so the move
  // handler stays a pure style write rather than forcing layout per frame.
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
        'rounded-lg',
        glass ? 'glass' : 'panel',
        interactive &&
          'spotlight transition-[transform,box-shadow] duration-std ease-enter [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-raised',
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
        <h3 className="text-[15px] font-semibold tracking-snug text-hi">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-low">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
