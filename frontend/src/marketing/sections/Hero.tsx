import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { hero } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { Tilt } from '@/ui/Tilt';
import { HeroCounter } from '../HeroCounter';

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section
      id="product"
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-5 pb-14 pt-[calc(8.5rem+env(safe-area-inset-top))] sm:px-8 lg:pt-32"
    >
      <h1 className="text-[clamp(2.4rem,1.3rem+3.7vw,4.35rem)] font-semibold leading-[1.02] tracking-tightest">
        {[hero.title, hero.titleAccent].map((line, i) => (
          <span key={line} className="block overflow-hidden pb-[0.06em]">
            <motion.span
              className={cn('block', i === 0 ? 'text-hi' : 'text-mid')}
              initial={reduced ? false : { y: '106%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.95, delay: 0.08 + i * 0.12, ease }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.32, ease }}
        className="mt-6 flex flex-col gap-7 lg:mt-7 lg:flex-row lg:items-end lg:justify-between"
      >
        <p className="max-w-[46ch] text-[17px] leading-relaxed text-mid sm:text-lg">{hero.sub}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tilt className="w-full sm:w-auto">
            <Link to="/app/register" className={cn(buttonLink('primary', 'lg'), 'w-full sm:w-auto')}>
              {hero.ctaPrimary}
              <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" />
            </Link>
          </Tilt>
          <a href="#autopilot" className={buttonLink('glass', 'lg')}>
            {hero.ctaSecondary}
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.42, ease }}
        className="mt-12 lg:mt-14"
      >
        <HeroCounter />
      </motion.div>
    </section>
  );
}
