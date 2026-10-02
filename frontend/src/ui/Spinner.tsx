import { cn } from '@/lib/cn';

/** Three bulbs taking turns: the strand's chase, used wherever a wait is short. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-5', className)} viewBox="0 0 24 24" aria-hidden>
      {[5, 12, 19].map((cx, i) => (
        <circle
          key={cx}
          cx={cx}
          cy="12"
          r="2.6"
          fill="currentColor"
          className="typing-dot"
          style={{ animationDelay: `${i * 0.16}s`, transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
    </svg>
  );
}
