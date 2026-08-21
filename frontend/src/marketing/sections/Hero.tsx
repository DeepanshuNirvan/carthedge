import { lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { hero } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { usePrefersReducedMotion, useIsMobile } from '@/hooks/useMediaQuery';
import { HeroLoopDemo } from '../HeroLoopDemo';
import { Safe3D } from '../three/Safe3D';

const HeroScene = lazy(() => import('../three/HeroScene'));

// one-time capability probe — never mount a WebGL canvas where it can't run
const WEBGL_OK = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();

const proof = [
  ['~65%', 'less RTO on COD'],
  ['0', 'buyer signups'],
  ['1 tap', 'to confirm'],
];

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  // three.js is ~820kB and this canvas is decorative depth sitting behind the
  // hero at -z-10. Waiting for idle keeps it off the critical path so it can
  // never delay the hero's first paint — it just fades in a moment later.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const ric = window.requestIdleCallback;
    if (!ric) {
      const t = setTimeout(() => setIdle(true), 1200);
      return () => clearTimeout(t);
    }
    const id = ric(() => setIdle(true), { timeout: 3000 });
    return () => window.cancelIdleCallback?.(id);
  }, []);
  const show3d = idle && !reduced && !mobile && WEBGL_OK; // 3D depth on capable devices only

  return (
    <section id="product" className="relative flex min-h-[100dvh] items-center overflow-hidden pb-16 pt-[calc(7rem+env(safe-area-inset-top))]">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        {/* left — the message */}
        <motion.div
          // the headline carries the entrance now (each line rises out of its own
          // mask) — a big parent slide on top of that reads as two moves at once
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-jade-ink">
            <Sparkles className="size-3.5" />
            {hero.eyebrow}
          </span>

          <h1 className="mt-6 font-display text-[clamp(2.25rem,1.2rem+3.1vw,3.75rem)] font-semibold leading-[1.12] tracking-[-0.032em] text-hi">
            {[hero.title, hero.titleAccent].map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className={cn('block', i === 1 && 'text-brand-grad')}
                  initial={reduced ? false : { y: '108%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-mid">{hero.sub}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/app/register" className={buttonLink('primary', 'lg')}>
              {hero.ctaPrimary}
              <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" />
            </Link>
            <a href="#loop" className={buttonLink('glass', 'lg')}>
              {hero.ctaSecondary}
            </a>
          </div>
          <p className="mt-4 text-sm text-low">{hero.noCard}</p>

          <dl className="mt-10 grid max-w-md grid-cols-3 border-t pt-6">
            {proof.map(([v, l], i) => (
              <div key={l} className={cn('px-4 first:pl-0 last:pr-0', i > 0 && 'border-l')}>
                <dt className="font-display text-[1.6rem] font-semibold leading-none tracking-tight tnum text-hi">
                  {v}
                </dt>
                <dd className="mt-1.5 text-[11px] leading-snug text-low">{l}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        {/* right — the product, alive */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          {show3d && (
            <div
              aria-hidden
              className="absolute -inset-x-16 -inset-y-10 -z-10 opacity-70 [mask-image:radial-gradient(70%_70%_at_50%_45%,black,transparent)]"
            >
              <Safe3D>
                <HeroScene />
              </Safe3D>
            </div>
          )}
          <HeroLoopDemo />
        </motion.div>
      </div>

      {/* soft floor fade into the page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />

      <a
        href="#problem"
        className="absolute inset-x-0 bottom-7 z-10 mx-auto hidden w-fit flex-col items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-dim transition-colors duration-std hover:text-mid lg:flex"
      >
        {hero.scrollCue}
        <ChevronDown className="size-4 animate-floaty text-jade-ink" aria-hidden />
      </a>
    </section>
  );
}
