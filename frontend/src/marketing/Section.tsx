import type { HTMLAttributes, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Section({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20', className)}
      {...rest}
    />
  );
}

/** A section's one message: the heading, and a short line under it when it earns one. */
export function SectionHead({
  title,
  sub,
  align = 'left',
  className,
}: {
  title: string;
  sub?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        'mb-10 flex flex-col gap-4 sm:mb-14',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <h2 className="max-w-[18ch] text-d2 font-semibold text-hi">{title}</h2>
      {sub && <p className="max-w-[52ch] text-base leading-relaxed text-mid sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

/**
 * Scroll reveal: rises and settles. Transform + opacity only, so it stays on
 * the compositor; used for section heads and key blocks, not every element.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
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
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-72px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container: children cascade instead of arriving together. */
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
      viewport={{ once: true, margin: '-72px' }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}
