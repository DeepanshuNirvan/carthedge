import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wordmark } from '@/marketing/Wordmark';
import { AuthOrb } from './AuthOrb';

/** Split-screen auth: ambient brand panel + form. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grain grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block" data-theme="dark">
        {/* Material ground: real chikankari, the craft our sellers actually sell.
            Barely-there and desaturated — it gives the panel a woven texture
            instead of flat colour, without competing with the orb or the copy. */}
        <img
          src="/demo/chikankari.webp"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full scale-105 object-cover opacity-[0.18] saturate-[0.7] [mask-image:radial-gradient(120%_100%_at_50%_40%,black,transparent_78%)]"
        />
        {/* faint structure grid: the order board the chat resolves into */}
        <div aria-hidden className="absolute inset-0 opacity-[0.55]">
          <div className="cart-grid" />
        </div>
        <AuthOrb />
        {/* legibility scrim — the copy sits over the orb's lower bloom */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--bg))_2%,transparent_38%,transparent_64%,rgb(var(--bg)/0.7)_100%)]"
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Link to="/" aria-label="CartHedge home">
            <Wordmark />
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {aside}
          </motion.div>
          <p className="text-xs text-[#6E6B65]">Payments secured by Razorpay · Made in India</p>
        </div>
      </div>

      <div className="flex flex-col px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] sm:px-12 sm:pb-10 sm:pt-10">
        <Link to="/" className="mb-8 lg:hidden" aria-label="CartHedge home">
          <Wordmark />
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="my-auto w-full max-w-md self-center"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
