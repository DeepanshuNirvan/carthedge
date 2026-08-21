import type { HTMLAttributes, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Section({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24 md:py-32', className)}
      {...rest}
    />
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'center',
  tone = 'jade',
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'center' | 'left';
  tone?: 'jade' | 'gold' | 'danger';
}) {
  const toneCls =
    tone === 'gold' ? 'text-gold-ink' : tone === 'danger' ? 'text-danger-ink' : 'text-jade-ink';
  return (
    <Reveal
      className={cn(
        'mb-10 flex flex-col gap-4 sm:mb-14',
        align === 'center' ? 'items-center text-center' : 'items-start',
      )}
    >
      <span
        className={cn(
          'glass inline-flex rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
          toneCls,
        )}
      >
        {eyebrow}
      </span>
      <h2 className="max-w-2xl font-display text-d2 font-semibold text-hi">{title}</h2>
      {sub && <p className="max-w-xl text-base leading-relaxed text-mid sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

/**
 * Scroll reveal: rises and settles into place.
 *
 * Deliberately transform + opacity only. This used to animate
 * `filter: blur(8px) → blur(0px)`, which forces the browser to re-rasterise the
 * whole section on every frame of every reveal — the single heaviest thing on
 * the page and the reason scrolling felt sticky on mid-range phones. A small
 * scale gives the same sense of weight for free on the compositor.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.66, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container: children cascade instead of all arriving together.
 * Wrap a list and give each child <RevealItem>. Mounting everything on one
 * frame is what makes a page read as generated rather than composed.
 */
export function RevealGroup({
  children,
  className,
  gap = 0.07,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 20, scale: 0.99 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}
