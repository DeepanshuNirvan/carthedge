import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

/** A confirmation that draws itself: the ring closes, then the tick is written, then the bulbs light. */
export function SuccessMark({ tone = 'jade', className }: { tone?: 'jade' | 'gold'; className?: string }) {
  const reduced = useReducedMotion();
  const color = tone === 'gold' ? 'rgb(var(--gold-ink))' : 'rgb(var(--jade-ink))';
  const draw = (delay: number, duration: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { delay, duration, ease: [0.65, 0, 0.35, 1] as const }, opacity: { delay, duration: 0.01 } },
        };
  return (
    <span className={cn('flex flex-col items-center gap-3', className)} aria-hidden>
      <span
        className={cn(
          'flex size-[4.5rem] items-center justify-center rounded-full',
          tone === 'gold' ? 'bg-gold-400/14' : 'bg-jade-500/14',
        )}
      >
        <svg viewBox="0 0 52 52" className="size-12" fill="none">
          <motion.circle cx="26" cy="26" r="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" {...draw(0.05, 0.5)} />
          <motion.path d="M16 27 l7 7 l14 -16" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...draw(0.45, 0.35)} />
        </svg>
      </span>
      <span className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="bulb size-1.5"
            data-lit="true"
            initial={reduced ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.07, type: 'spring', stiffness: 500, damping: 18 }}
          />
        ))}
      </span>
    </span>
  );
}
