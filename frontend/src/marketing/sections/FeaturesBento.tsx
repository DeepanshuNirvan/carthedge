import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { features } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { Tilt } from '@/ui/Tilt';
import { Reveal, RevealGroup, RevealItem, SectionHead, revealItem } from '../Section';
import { deskPreviews } from './DeskPreviews';

const ease = [0.16, 1, 0.3, 1] as const;
const desks = features.desks;

/**
 * Everything behind the chat, one desk at a time. The index is a length of the
 * strand (the open desk's bulb is lit), and each desk opens on a sample of its
 * real screen above the list of what it does. Only the open desk renders.
 */
export function FeaturesBento() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const desk = desks[active];
  const Preview = deskPreviews[desk.key];
  const nextIdx = (active + 1) % desks.length;

  // the last thing on a desk is the way to the next one: back up to the stage, and on
  // phones slide the capsule rail so the new desk's chip is in view
  const openNext = () => {
    const behavior = reduced ? 'auto' : 'smooth';
    setActive(nextIdx);
    top.current?.scrollIntoView({ block: 'start', behavior });
    const chip = tabs.current[nextIdx];
    if (chip && rail.current) rail.current.scrollTo({ left: chip.offsetLeft - 20, behavior });
  };

  // arrow keys walk the desks (both axes, since the index is a row on phones and a column on desktop)
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = desks.length - 1;
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? (active + 1) % desks.length
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? (active - 1 + desks.length) % desks.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="features" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={features.title} sub={features.sub} />

      <Reveal>
        <div ref={top} className="grid scroll-mt-24 gap-4 lg:grid-cols-[14rem_1fr] lg:gap-10">
          {/* the index: a capsule rail on phones, a strand down the side on desktop */}
          <div
            ref={rail}
            role="tablist"
            aria-label="Desks"
            className="rail relative -mx-5 flex snap-x gap-2 scroll-px-5 px-5 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:sticky lg:top-28 lg:mx-0 lg:flex-col lg:gap-0 lg:self-start lg:overflow-visible lg:px-0 lg:pb-0 lg:pt-1"
          >
            <span aria-hidden className="absolute bottom-5 left-[4.5px] top-5 hidden w-px bg-wire/15 lg:block" />
            {desks.map((d, i) => {
              const on = i === active;
              return (
                <button
                  key={d.key}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`desk-tab-${d.key}`}
                  aria-selected={on}
                  aria-controls="desk-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={onKey}
                  className={cn(
                    'group relative flex min-h-11 shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-ui font-medium transition-colors duration-std',
                    'lg:min-h-0 lg:rounded-none lg:px-0 lg:py-3 lg:text-title',
                    on ? 'bg-surface-2 text-hi shadow-soft lg:bg-transparent lg:shadow-none' : 'text-low hover:text-hi',
                  )}
                >
                  <span
                    className={cn('bulb relative size-2.5 shrink-0 transition-transform duration-std ease-spring', on && 'lg:scale-125')}
                    data-lit={on}
                  />
                  <span className={cn('transition-transform duration-std ease-enter', on ? 'lg:translate-x-1 lg:font-semibold' : '[@media(hover:hover)]:lg:group-hover:translate-x-0.5')}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* the open desk */}
          <div id="desk-panel" role="tabpanel" aria-labelledby={`desk-tab-${desk.key}`} className="panel overflow-hidden rounded-2xl">
            <div className="stage-lit relative flex h-96 items-center justify-center border-b px-4 py-8 sm:px-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={desk.key}
                  initial={reduced ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={reduced ? undefined : { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.18 } }}
                  transition={{ duration: 0.45, ease }}
                  className="flex w-full justify-center"
                >
                  {/* a picked desk pulls proud of the shelf: the sample leans toward the pointer */}
                  <Tilt max={5} shine={false} className="w-full max-w-sm">
                    <Preview />
                  </Tilt>
                </motion.div>
              </AnimatePresence>
              <span className="absolute bottom-2.5 right-4 text-caption text-low">{features.sample}</span>
            </div>

            <div className="p-5 sm:p-8">
              <h3 className="max-w-[34ch] text-d4 font-semibold text-hi">{desk.lede}</h3>
              <motion.dl
                key={desk.key}
                initial={reduced ? false : 'hidden'}
                animate="shown"
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
                className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2"
              >
                {desk.items.map((item) => (
                  <motion.div key={item.title} variants={revealItem}>
                    <dt className="text-title font-semibold tracking-snug text-hi">{item.title}</dt>
                    <dd className="mt-1 max-w-[44ch] text-copy leading-relaxed text-mid">{item.copy}</dd>
                  </motion.div>
                ))}
              </motion.dl>
              <button
                type="button"
                onClick={openNext}
                className="group mt-8 inline-flex min-h-11 items-center gap-2 rounded-full text-copy font-medium text-mid transition-colors duration-std hover:text-hi"
              >
                Next: {desks[nextIdx].label}
                <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* what is being built next: bulbs hung but not yet lit */}
      <div className="mt-14 border-t pt-8">
        <h3 className="text-base font-semibold tracking-snug text-hi">{features.roadmapTitle}</h3>
        <RevealGroup className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {features.roadmap.map((r) => (
            <RevealItem key={r.title}>
              <div className="flex items-center gap-2.5">
                <span className="bulb size-2 shrink-0" aria-hidden />
                <h4 className="text-copy font-medium tracking-snug text-mid">{r.title}</h4>
              </div>
              <p className="mt-1 max-w-[36ch] text-ui leading-relaxed text-low">{r.copy}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
