import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { journey } from '@/strings/marketing';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { StatusChip } from '@/ui/Badge';
import { MoneyText } from '@/ui/MoneyText';
import { BulbString } from '@/ui/BulbString';
import { Reveal, SectionHead } from '../Section';

const cols = journey.columns;
const c = journey.card;

function OrderCard({ status, className }: { status: string; className?: string }) {
  return (
    <div className={cn('glass-nav sheen rounded-lg p-3.5 shadow-float', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-low">
          <Instagram className="size-3.5" aria-hidden /> {c.source}
        </span>
        <span className="font-mono text-[11px] text-low">#{c.code}</span>
      </div>
      <p className="mt-2.5 text-[14px] font-semibold tracking-snug text-hi">{c.buyer}</p>
      <p className="mt-0.5 truncate text-[12.5px] text-mid">{c.item}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusChip status={status} />
        <MoneyText paise={c.total} className="text-[13px] font-semibold text-hi" />
      </div>
    </div>
  );
}

/** Stacked journey for phones and reduced motion: the same story as a vertical strand. */
function JourneyList() {
  return (
    <ol className="relative flex flex-col gap-6 pl-8">
      <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-wire/15" />
      {cols.map((col, i) => (
        <Reveal key={col.status} delay={i * 0.04}>
          <li className="relative">
            <span className="bulb absolute -left-8 top-1 size-3" data-state="done" />
            <div className="flex items-center gap-2">
              <StatusChip status={col.status} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mid">{col.note}</p>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

export function OrderJourney() {
  const reducedMotion = useReducedMotion();
  const mobile = useIsMobile();
  const flat = reducedMotion || mobile;
  const root = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end end'] });
  // hold at each column, travel between them
  const col = useTransform(
    scrollYProgress,
    [0, 0.1, 0.2, 0.32, 0.42, 0.54, 0.64, 0.76, 0.86, 1],
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  const smooth = useSpring(col, { stiffness: 160, damping: 28, mass: 0.6 });
  const x = useTransform(smooth, (v) => `calc(${v} * (100% + 0.75rem))`);
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(col, 'change', (v) => setIdx(Math.round(v)));

  if (flat) {
    return (
      <section id="journey" ref={root} className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
        <SectionHead title={journey.title} sub={journey.sub} />
        <OrderCard status="delivered" className="mb-10 max-w-sm" />
        <JourneyList />
      </section>
    );
  }

  return (
    <section id="journey" ref={root} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-8">
          <SectionHead title={journey.title} sub={journey.sub} className="mb-10 sm:mb-12" />

          <div className="grid grid-cols-5 gap-3">
            {cols.map((column, i) => (
              <div key={column.status} className="flex items-center gap-2 px-1">
                <span className="bulb size-2.5" data-lit={i === idx} data-state={i < idx ? 'done' : undefined} />
                <span className={cn('text-[13px] font-semibold transition-colors duration-std', i <= idx ? 'text-hi' : 'text-low')}>
                  {column.label}
                </span>
              </div>
            ))}
          </div>

          {/* lanes, with the one order riding across them */}
          <div className="relative mt-3">
            <div className="grid grid-cols-5 gap-3">
              {cols.map((column, i) => (
                <div
                  key={column.status}
                  className={cn(
                    'relative flex h-[13.5rem] flex-col justify-end gap-2 rounded-lg p-2.5 transition-[background-color,box-shadow] duration-expr',
                    i === idx
                      ? 'bg-[rgb(var(--bulb)/0.07)] shadow-[inset_0_0_0_1px_rgb(var(--bulb)/0.28)]'
                      : 'bg-[rgb(var(--field)/0.035)] shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]',
                  )}
                >
                  {/* the lane at rest: unlit until the order reaches it */}
                  <span className="flex justify-center pb-2">
                    <BulbString count={5} lit={i === idx ? 2 : -1} />
                  </span>
                </div>
              ))}
            </div>
            <motion.div style={{ x }} className="absolute left-0 top-3 w-[calc((100%-3rem)/5)] px-2.5">
              <OrderCard status={cols[idx].status} />
            </motion.div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-3">
            {cols.map((column, i) => (
              <p
                key={column.status}
                className={cn(
                  'px-1 text-[12.5px] leading-snug transition-[color,opacity] duration-std',
                  i === idx ? 'text-hi' : i < idx ? 'text-mid' : 'text-low opacity-60',
                )}
              >
                {column.note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
