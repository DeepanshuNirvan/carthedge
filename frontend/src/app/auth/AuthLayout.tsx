import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Wordmark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';

const ease = [0.16, 1, 0.3, 1] as const;

/** The strand of lights over the photo: it lights end to end as the page opens. */
function PanelStrand() {
  const reduced = useReducedMotion();
  const n = 19;
  return (
    <div aria-hidden className="absolute inset-x-8 top-0 h-10">
      <svg className="absolute inset-x-0 top-0 h-7 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d="M0 2 Q 50 26 100 2" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        return (
          <motion.span
            key={i}
            className="bulb absolute size-1.5 -translate-x-1/2"
            data-lit="true"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.4 }}
            style={{ left: `${t * 100}%`, top: `${2 + 4 * t * (1 - t) * 20}px` }}
          />
        );
      })}
    </div>
  );
}

/** Split-screen auth: the seller's world at night on one side, the form on the other.
 *  On phones the photo becomes a short header and the form rises over it as a sheet. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="grain grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 lg:block" data-theme="dark">
        <img
          src="/demo/auth-seller.webp"
          alt="A seller answering buyers on her phone at night"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[45%_60%] opacity-90"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--ink-950))_6%,rgb(var(--ink-950)/0.55)_42%,rgb(var(--ink-950)/0.15)_70%,rgb(var(--ink-950)/0.55)_100%)]"
        />
        <PanelStrand />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          <Link to="/" aria-label="CartHedge home" className="w-fit">
            <Wordmark />
          </Link>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
          >
            {aside}
          </motion.div>
          <p className="flex items-center gap-1.5 text-xs text-low">
            <ShieldCheck className="size-3.5" aria-hidden /> Payments settle in your own Razorpay account
          </p>
        </div>
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        {/* phone header: the same photo, cropped short, with the form rising over it */}
        <div className="relative h-[30dvh] min-h-[11rem] overflow-hidden bg-ink-950 lg:hidden" data-theme="dark">
          <img
            src="/demo/auth-seller.webp"
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 size-full object-cover object-[50%_58%] opacity-85"
          />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(var(--ink-950)/0.65),rgb(var(--ink-950)/0.1)_60%)]" />
          <div className="relative flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
            <Link to="/" aria-label="CartHedge home">
              <Wordmark />
            </Link>
          </div>
        </div>

        <div className="relative z-10 -mt-7 flex flex-1 flex-col rounded-t-xl bg-bg px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-7 shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.4)] sm:px-10 lg:mt-0 lg:rounded-none lg:px-12 lg:pb-10 lg:pt-8 lg:shadow-none">
          <div className="absolute right-4 top-3 lg:right-6 lg:top-6">
            <ThemeToggle />
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="w-full max-w-md self-center lg:my-auto"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
