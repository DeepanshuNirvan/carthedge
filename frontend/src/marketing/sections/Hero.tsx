import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import { hero } from '@/strings/marketing';
import { buttonLink } from '@/ui/buttonLink';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const HeroScene = lazy(() => import('../three/HeroScene'));

/** Static jade/gold glow — poster for reduced-motion, low-end and while 3D loads. */
function Poster() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute right-[8%] top-1/3 size-[420px] rounded-full bg-jade-500/25 blur-[120px]" />
      <div className="absolute right-[22%] top-1/2 size-[260px] rounded-full bg-gold-400/20 blur-[100px]" />
    </div>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  return (
    <section id="product" className="relative flex min-h-dvh items-center overflow-hidden">
      {reduced ? (
        <Poster />
      ) : (
        <div className="absolute inset-0 opacity-90 [mask-image:radial-gradient(70%_70%_at_65%_45%,black,transparent)]">
          <Suspense fallback={<Poster />}>
            <HeroScene />
          </Suspense>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-28 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jade-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-jade-500">
            <Sparkles className="size-3.5" />
            {hero.eyebrow}
          </span>
          <h1 className="mt-6 font-display text-d1 font-semibold text-hi">
            {hero.title}
            <br />
            <span className="bg-gradient-to-r from-jade-500 to-gold-400 bg-clip-text text-transparent">
              {hero.titleAccent}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mid">{hero.sub}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/app/register" className={buttonLink('primary', 'lg')}>
              {hero.ctaPrimary}
            </Link>
            <a href="#loop" className={buttonLink('secondary', 'lg')}>
              {hero.ctaSecondary}
            </a>
          </div>
          <p className="mt-4 text-sm text-low">{hero.noCard}</p>
        </motion.div>
      </div>

      <motion.a
        href="#problem"
        aria-label="Scroll to next section"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-xs uppercase tracking-widest text-low transition-colors hover:text-hi"
        animate={reduced ? undefined : { y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        {hero.scrollCue}
        <ArrowDown className="size-4" />
      </motion.a>
    </section>
  );
}
