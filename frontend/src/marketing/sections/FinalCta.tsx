import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { finalCta } from '@/strings/marketing';
import { buttonLink } from '@/ui/buttonLink';
import { Tilt } from '@/ui/Tilt';
import { cn } from '@/lib/cn';

const BULBS = 23;

/** The close: the whole strand lights at once over a seller still selling at night. */
export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const lit = useInView(ref, { once: true, margin: '-30%' });
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative px-3 py-16 sm:px-5 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-ink-950 shadow-float" data-theme="dark">
        <motion.img
          src="/demo/auth-seller.webp"
          alt="A seller replying to buyers on her phone at night, next to folded kurtis and a tray of rings"
          loading="lazy"
          decoding="async"
          style={reduced ? undefined : { y: imgY }}
          className="absolute inset-0 size-full scale-[1.18] object-cover object-[60%_40%] opacity-80"
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--ink-950))_8%,rgb(var(--ink-950)/0.72)_48%,rgb(var(--ink-950)/0.15)_100%)]" />

        {/* the strand, lit end to end */}
        <div aria-hidden className="absolute inset-x-6 top-0 h-12">
          <svg className="absolute inset-x-0 top-0 h-8 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
            <path d="M0 2 Q 25 22 50 10 Q 75 22 100 2" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          {Array.from({ length: BULBS }, (_, i) => {
            const t = (i + 0.5) / BULBS;
            // follow the two sags of the wire
            const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
            const sag = 4 * local * (1 - local);
            return (
              <span
                key={i}
                className={cn('bulb absolute size-1.5 -translate-x-1/2')}
                data-lit={lit}
                style={{
                  left: `${t * 100}%`,
                  top: `${2 + sag * 18}px`,
                  transitionDelay: `${i * 45}ms`,
                }}
              />
            );
          })}
        </div>

        <div className="relative flex min-h-[26rem] flex-col justify-end gap-6 px-6 pb-10 pt-24 sm:min-h-[30rem] sm:px-12 sm:pb-14">
          <h2 className="max-w-[14ch] text-d1 font-semibold text-[rgb(var(--text-hi))]">{finalCta.title}</h2>
          <p className="max-w-[40ch] text-lg text-[rgb(var(--text-mid))]">{finalCta.sub}</p>
          <div>
            <Tilt>
              <Link to="/app/register" className={buttonLink('primary', 'lg')}>
                {finalCta.cta}
                <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" />
              </Link>
            </Tilt>
          </div>
        </div>
      </div>
    </section>
  );
}
