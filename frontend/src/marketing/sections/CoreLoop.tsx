import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BadgeCheck, Bot, CreditCard, KanbanSquare, MessageCircle, PiggyBank } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);
import { coreLoop } from '@/strings/marketing';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

const icons = [MessageCircle, Bot, BadgeCheck, CreditCard, KanbanSquare, PiggyBank];

/** Signature pinned scene — the pipeline assembles horizontally as you scroll. */
export function CoreLoop() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !root.current || !track.current) return;
    const ctx = gsap.context(() => {
      const stages = gsap.utils.toArray<HTMLElement>('[data-stage]');
      const distance = () => track.current!.scrollWidth - window.innerWidth;

      gsap.to(track.current, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance() + window.innerHeight * 0.4}`,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      });

      stages.forEach((stage) => {
        gsap.fromTo(
          stage,
          { opacity: 0.35, scale: 0.92, y: 24 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: stage,
              containerAnimation: gsap.getTweensOf(track.current)[0],
              start: 'left 72%',
              end: 'left 40%',
              scrub: true,
            },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="loop" ref={root} className="relative overflow-hidden bg-surface/40">
      <div className="pt-24 text-center md:pt-32">
        <span className="glass inline-flex rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-jade-400">
          {coreLoop.eyebrow}
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl px-5 font-display text-d2 font-semibold text-hi">{coreLoop.title}</h2>
      </div>

      <div
        ref={track}
        className={cn(
          'flex gap-6 px-5 py-20 sm:px-[12vw]',
          reduced ? 'flex-col items-center sm:px-5' : 'w-max items-stretch',
        )}
      >
        {coreLoop.steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <div key={step.key} className={cn('flex items-center gap-6', reduced && 'w-full max-w-xl')}>
              <article
                data-stage
                className="glass sheen relative flex h-full w-[19rem] flex-col gap-4 rounded-2xl p-7 shadow-float sm:w-[22rem]"
              >
                <span
                  aria-hidden
                  className="absolute right-6 top-6 font-display text-4xl font-semibold text-hi/10"
                >
                  {i + 1}
                </span>
                <span className="flex size-12 items-center justify-center rounded-md neu text-jade-400">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-display text-xl font-semibold text-hi">{step.title}</h3>
                <p className="text-sm leading-relaxed text-mid">{step.copy}</p>
                {i === coreLoop.steps.length - 1 && (
                  <p className="mt-auto rounded-md bg-jade-500/12 px-3 py-2 font-mono text-sm font-semibold text-jade-400 tnum shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.25)]">
                    +₹31,240 saved
                  </p>
                )}
              </article>
              {i < coreLoop.steps.length - 1 && !reduced && (
                <svg width="40" height="12" viewBox="0 0 40 12" className="shrink-0 text-jade-500/60" aria-hidden>
                  <path d="M0 6h32m0 0-6-5m6 5-6 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
