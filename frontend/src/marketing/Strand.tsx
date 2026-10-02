import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { strand } from '@/strings/marketing';
import { cn } from '@/lib/cn';

/**
 * The page's strand of lights, hung down the left margin on wide screens.
 * One bulb per stop of the story; a bulb lights once you have reached its
 * section and the current one carries the warm light. The wire fills with
 * scroll. It is navigation, not decoration: every bulb is a link.
 */
export function Strand() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const [reached, setReached] = useState(-1);

  useEffect(() => {
    const els = strand.map((s) => document.getElementById(s.id));
    // a section counts as reached once its top crosses the upper third
    const io = new IntersectionObserver(
      () => {
        let last = -1;
        els.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.36) last = i;
        });
        setReached(last);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px 0px -40% 0px' },
    );
    els.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 xl:block 2xl:left-6"
    >
      <div className="relative flex flex-col items-start gap-7 py-1">
        {/* the wire: a dim strand, and the lit length riding on top of it */}
        <span aria-hidden className="absolute bottom-2 left-[4.5px] top-2 w-px bg-wire/15" />
        <motion.span
          aria-hidden
          style={{ scaleY: reduced ? 1 : fill }}
          className="absolute bottom-2 left-[4.5px] top-2 w-px origin-top bg-bulb/60"
        />
        {strand.map((s, i) => {
          const lit = i <= reached;
          const now = i === reached;
          return (
            <a key={s.id} href={`#${s.id}`} className="group relative flex items-center gap-3" aria-current={now ? 'location' : undefined}>
              <span
                className={cn('bulb relative size-2.5', now && 'scale-125')}
                data-lit={lit}
                style={{ transition: 'transform 300ms var(--ease-spring), background-color 520ms, box-shadow 520ms' }}
              />
              <span
                className={cn(
                  'whitespace-nowrap text-[12px] font-medium transition-[opacity,transform,color] duration-std ease-enter',
                  'glass-nav rounded-full px-2.5 py-1',
                  now ? 'text-hi opacity-0 2xl:opacity-100' : 'text-low opacity-0 -translate-x-1',
                  'group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                )}
              >
                {s.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
