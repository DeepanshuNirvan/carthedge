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
    tone === 'gold' ? 'text-gold-500' : tone === 'danger' ? 'text-danger' : 'text-jade-400';
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

/** Heavy, expensive scroll reveal — rises and de-blurs into place. Respects reduced motion. */
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
      initial={reduced ? false : { opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
