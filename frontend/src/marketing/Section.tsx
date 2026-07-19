import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Section({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 md:py-32', className)} {...rest} />;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'center' | 'left';
}) {
  return (
    <Reveal className={cn('mb-14 flex flex-col gap-4', align === 'center' ? 'items-center text-center' : 'items-start')}>
      <span className="rounded-full bg-jade-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-jade-500">
        {eyebrow}
      </span>
      <h2 className="max-w-2xl font-display text-d2 font-semibold text-hi">{title}</h2>
      {sub && <p className="max-w-xl text-base text-mid sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

/** Enters when scrolled into view; respects reduced motion via framer. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.64, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
