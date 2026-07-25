import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquareWarning, PackageX, Timer } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);
import { problem } from '@/strings/marketing';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useSite } from '@/api/site';

const icons = [PackageX, Timer, MessageSquareWarning];

/** Pinned scene: chaos cards scatter in, loss numbers count up with scroll. */
export function Problem() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const stats = useSite().data?.stats ?? problem.stats;

  useEffect(() => {
    if (reduced || !root.current) return;
    const ctx = gsap.context(() => {
      const counters = gsap.utils.toArray<HTMLElement>('[data-count]');
      const cards = gsap.utils.toArray<HTMLElement>('[data-chaos]');

      gsap.set(cards, {
        y: (i) => 140 + i * 40,
        rotate: (i) => (i % 2 ? 8 : -7),
        opacity: 0,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 0.6,
        },
      });

      tl.to(cards, { y: 0, rotate: 0, opacity: 1, stagger: 0.08, ease: 'power2.out' });
      counters.forEach((el) => {
        const target = Number(el.dataset.count);
        const state = { n: 0 };
        tl.to(
          state,
          {
            n: target,
            duration: 0.6,
            ease: 'power1.out',
            onUpdate: () => {
              el.textContent = String(Math.round(state.n));
            },
          },
          '<0.1',
        );
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="problem" ref={root} className="relative flex min-h-dvh items-center overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
        <div className="mb-14 text-center">
          <span className="glass inline-flex rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-danger">
            {problem.eyebrow}
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-d2 font-semibold text-hi">{problem.title}</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = icons[i] ?? icons[icons.length - 1];
            return (
              <div
                key={stat.label}
                data-chaos
                className="glass sheen relative overflow-hidden rounded-2xl p-7 shadow-float"
              >
                <div
                  aria-hidden
                  className="absolute -right-10 -top-10 size-28 rounded-full bg-danger/15 blur-2xl"
                />
                <span className="relative flex size-11 items-center justify-center rounded-md neu text-danger">
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="relative mt-5 font-display text-[3.25rem] font-semibold leading-none tracking-tight text-hi tnum">
                  <span data-count={stat.value}>{reduced ? stat.value : 0}</span>
                  <span className="text-danger">{stat.suffix}</span>
                </p>
                <p className="relative mt-3 text-sm leading-relaxed text-mid">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center text-lg leading-relaxed text-mid">{problem.copy}</p>
      </div>
    </section>
  );
}
