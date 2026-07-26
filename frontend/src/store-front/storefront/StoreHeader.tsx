import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, MessageCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { StoreBusiness } from '@/api/types';
import { cartCount, useCart } from '@/store/cart';
import { Avatar } from '@/ui/Avatar';
import { ThemeToggle } from '@/ui/ThemeToggle';

export function StoreHeader({ business, onCart }: { business: StoreBusiness; onCart?: () => void }) {
  const items = useCart((s) => s.items);
  const count = cartCount(items);

  return (
    <header className="glass-nav sticky top-0 z-30">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link to={`/s/${business.code}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar name={business.name} src={business.logoUrl || undefined} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-semibold text-hi">{business.name}</span>
            {(business.city || business.state) && (
              <span className="block truncate text-xs text-low">
                {[business.city, business.state].filter(Boolean).join(', ')}
              </span>
            )}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {business.instagram && (
            <a
              href={`https://instagram.com/${business.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex size-11 items-center justify-center rounded-md text-mid transition-colors hover:bg-surface-2 hover:text-hi sm:size-10"
            >
              <Instagram className="size-4.5" />
            </a>
          )}
          {business.whatsapp && (
            <a
              href={`https://wa.me/91${business.whatsapp.replace(/\D/g, '').slice(-10)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="flex size-11 items-center justify-center rounded-md text-mid transition-colors hover:bg-surface-2 hover:text-hi sm:size-10"
            >
              <MessageCircle className="size-4.5" />
            </a>
          )}
          <ThemeToggle />
          {onCart && (
            <button
              onClick={onCart}
              aria-label={`Cart, ${count} items`}
              className="relative flex size-11 items-center justify-center rounded-md text-hi transition-colors hover:bg-surface-2"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-gradient-to-b from-jade-400 to-jade-500 px-1 font-mono text-[10px] font-bold text-[rgb(var(--text-on-accent))] tnum shadow-[0_2px_6px_-1px_rgb(var(--jade-700)/0.6)]"
                >
                  {count}
                </motion.span>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 border-t bg-surface-2/40 py-1.5 text-[11px] font-medium text-mid">
        <ShieldCheck className="size-3.5 text-jade-400" />
        Payments secured by Razorpay · Seller verified
      </p>
    </header>
  );
}
