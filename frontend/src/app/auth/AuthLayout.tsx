import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wordmark } from '@/marketing/Wordmark';

/** Split-screen auth: ambient brand panel + form. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block" data-theme="dark">
        <img
          src="/demo/auth-seller.webp"
          alt="A boutique seller managing an order over chat"
          className="absolute inset-0 size-full object-cover object-center"
        />
        {/* legibility scrims — top for the wordmark, bottom for the copy */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-950/60 to-transparent" />
        <div aria-hidden className="absolute -bottom-10 left-0 h-64 w-72 rounded-full bg-jade-500/16 blur-[120px]" />
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
