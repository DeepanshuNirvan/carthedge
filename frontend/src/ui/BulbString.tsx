import { cn } from '@/lib/cn';

/**
 * A short length of the strand: a sagging wire with bulbs hung along it. Unlit
 * it means "nothing here yet" (an empty lane, an empty list); it never reads as
 * a typing indicator because the wire is drawn and the bulbs hang from it.
 */
export function BulbString({
  count = 5,
  lit = -1,
  className,
}: {
  count?: number;
  /** index of the bulb that is on, if any */
  lit?: number;
  className?: string;
}) {
  const w = count * 16;
  return (
    <span aria-hidden className={cn('relative block h-5', className)} style={{ width: w }}>
      <svg className="absolute inset-0 overflow-visible" width={w} height={20} viewBox={`0 0 ${w} 20`}>
        <path
          d={`M0 3 Q ${w / 2} 16 ${w} 3`}
          fill="none"
          stroke="rgb(var(--wire) / var(--wire-a))"
          strokeWidth="1"
        />
      </svg>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const y = 3 + 13 * 4 * t * (1 - t) * 0.5;
        return (
          <span
            key={i}
            className="bulb absolute size-[7px] -translate-x-1/2"
            data-lit={i === lit}
            style={{ left: t * w, top: y + 1 }}
          />
        );
      })}
    </span>
  );
}
