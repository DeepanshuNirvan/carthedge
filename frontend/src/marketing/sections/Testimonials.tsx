import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { seededQuotes, testimonials } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { cn } from '@/lib/cn';
import { Reveal } from '../Section';

/** One voice at a time, large; the bulbs are the pager. */
export function Testimonials() {
  // assistant and order-capture stories lead; refusal-rate stories follow, so the page is not about RTO
  // seeded placeholder quotes are never shown as real customers
  const raw = (useSite().data?.testimonials ?? []).filter((t) => !seededQuotes.includes(t.quote.trim()));
  const items = [...raw].sort((a, b) => Number(/RTO|COD|refus/i.test(a.quote)) - Number(/RTO|COD|refus/i.test(b.quote)));
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const t = items[Math.min(i, count - 1)];

  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const id = setTimeout(() => setI((n) => (n + 1) % count), 7000);
    return () => clearTimeout(id);
  }, [i, reduced, paused, count]);

  if (!t) return null;

  return (
    <section
      id="stories"
      aria-label={testimonials.title}
      className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <Reveal>
        <div className="relative min-h-[15rem] sm:min-h-[13rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={t.name}
              initial={reduced ? false : { opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <blockquote className="max-w-[30ch] text-quote font-medium text-hi">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-title font-semibold text-hi">{t.name}</span>
                <span className="text-sm text-low">{t.business}</span>
                <span className="rounded-full bg-jade-500/12 px-3 py-1 text-note font-semibold tnum text-jade-ink">
                  {t.metric}
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
        {count > 1 && (
          <div className="mt-8 flex items-center gap-1" role="tablist" aria-label="Choose a story">
            {items.map((item, n) => (
              <button
                key={item.name}
                role="tab"
                aria-selected={n === i}
                aria-label={`Story from ${item.name}`}
                onClick={() => setI(n)}
                className="flex size-10 items-center justify-center rounded-full"
              >
                <span className={cn('bulb', n === i ? 'size-3' : 'size-2')} data-lit={n === i} />
              </button>
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}
