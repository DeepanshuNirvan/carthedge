import { lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { hero } from '@/strings/marketing';
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
  const show3d = !reduced && !mobile && WEBGL_OK; // 3D depth on capable devices only

  return (
    <section id="product" className="relative flex min-h-[100dvh] items-center overflow-hidden pb-16 pt-[calc(7rem+env(safe-area-inset-top))]">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* left — the message */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-jade-400">
            <Sparkles className="size-3.5" />
            {hero.eyebrow}
          </span>

          <h1 className="mt-6 font-display text-d1 font-semibold text-hi">
            {hero.title}
            <br />
            <span className="text-brand-grad">{hero.titleAccent}</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-mid">{hero.sub}</p>

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

          <dl className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-t pt-6 sm:gap-x-8">
            {proof.map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-2xl font-semibold tracking-tight tnum text-hi">{v}</dt>
                <dd className="mt-0.5 text-xs text-low">{l}</dd>
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
    </section>
  );
}
