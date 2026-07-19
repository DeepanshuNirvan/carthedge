import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wordmark } from '@/marketing/Wordmark';

/** Split-screen auth: ambient brand panel + form. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block" data-theme="dark">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute left-1/4 top-1/4 size-[420px] rounded-full bg-jade-500/25 blur-[130px]" />
          <div className="absolute bottom-1/4 right-1/5 size-[300px] rounded-full bg-gold-400/18 blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.05] [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
        </div>
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

      <div className="flex flex-col px-5 py-8 sm:px-12 sm:py-10">
        <Link to="/" className="mb-10 lg:hidden" aria-label="CartHedge home">
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
