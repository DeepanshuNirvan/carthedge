import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Instagram, MessageCircle, ShieldCheck, ShoppingBag, Share2 } from 'lucide-react';
import type { StoreBusiness } from '@/api/types';
import { cartCount, useCart } from '@/store/cart';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/Avatar';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { whatsappHref } from '@/lib/validators';

const iconBtn =
  'flex size-11 items-center justify-center rounded-full text-mid transition-colors hover:bg-[rgb(var(--field)/0.08)] hover:text-hi active:scale-95 sm:size-10';

export const trustLine = (b: StoreBusiness) =>
  b.onlinePayment === 'gateway'
    ? 'Payments secured by Razorpay'
    : b.onlinePayment === 'upi'
      ? 'Pay by UPI direct to the seller'
      : 'Cash on delivery';

/**
 * Sticky store bar. On the store's home it starts quiet (the profile block
 * below carries the name) and condenses into a frosted bar with the name once
 * the page moves; on product pages it is frosted from the start.
 */
export function StoreHeader({
  business,
  onCart,
  quietTop = false,
}: {
  business: StoreBusiness;
  onCart?: () => void;
  quietTop?: boolean;
}) {
  const items = useCart((s) => s.items);
  const count = cartCount(items);
  const [canShare] = useState(() => typeof navigator !== 'undefined' && !!navigator.share);
  const [scrolled, setScrolled] = useState(!quietTop);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => quietTop && setScrolled(v > 120));

  const share = async () => {
    try {
      await navigator.share({ title: document.title, url: window.location.href });
    } catch {
      // dismissing the sheet rejects too
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-[background-color,box-shadow] duration-std',
        scrolled ? 'glass-bar scroll-edge shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-4">
        <Link
          to={`/s/${business.code}`}
          className={cn(
            'flex min-w-0 items-center gap-2.5 transition-opacity duration-std',
            scrolled ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          tabIndex={scrolled ? 0 : -1}
        >
          <Avatar name={business.name} src={business.logoUrl || undefined} className="size-9" />
          <span className="truncate text-[15px] font-semibold tracking-snug text-hi">{business.name}</span>
        </Link>

        <div className="ml-auto flex items-center">
          {business.instagram && (
            <a
              href={`https://instagram.com/${business.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className={cn(iconBtn, 'hidden sm:flex')}
            >
              <Instagram className="size-[18px]" />
            </a>
          )}
          {business.whatsapp && (
            <a
              href={whatsappHref(business.whatsapp)}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className={cn(iconBtn, 'hidden sm:flex')}
            >
              <MessageCircle className="size-[18px]" />
            </a>
          )}
          {canShare && (
            <button onClick={share} aria-label="Share this page" className={iconBtn}>
              <Share2 className="size-[18px]" />
            </button>
          )}
          <ThemeToggle />
          {onCart && (
            <button
              onClick={onCart}
              aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
              className={cn(iconBtn, 'relative text-hi')}
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-jade-500 px-1 text-[10px] font-bold text-[rgb(var(--text-on-accent))] tnum shadow-[0_2px_6px_-1px_rgb(var(--jade-700)/0.6)]"
                >
                  {count}
                </motion.span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/** The store's own profile block, laid out like the Instagram profile the buyer just came from. */
export function StoreProfile({ business }: { business: StoreBusiness }) {
  const place = [business.city, business.state].filter(Boolean).join(', ');
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-2 pt-1">
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-[conic-gradient(from_200deg,rgb(var(--gold-400)),rgb(var(--jade-400)),rgb(var(--gold-400)))] p-[2.5px]">
          <span className="block rounded-full bg-bg p-[2.5px]">
            <Avatar name={business.name} src={business.logoUrl || undefined} className="size-[4.5rem] text-xl" />
          </span>
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[1.5rem] font-semibold leading-tight tracking-[-0.025em] text-hi">{business.name}</h1>
          {place && <p className="truncate text-sm text-low">{place}</p>}
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-jade-ink">
            <ShieldCheck className="size-3.5" aria-hidden /> Verified seller
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-mid">
        {trustLine(business)}
        {business.codEnabled && business.onlinePayment !== 'none' ? ', cash on delivery available' : ''}. No signup needed.
      </p>
      {(business.instagram || business.whatsapp) && (
        <div className="mt-3 flex gap-2">
          {business.instagram && (
            <a
              href={`https://instagram.com/${business.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="neu inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-hi sm:flex-none sm:px-5"
            >
              <Instagram className="size-4" aria-hidden /> Instagram
            </a>
          )}
          {business.whatsapp && (
            <a
              href={whatsappHref(business.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="neu inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-hi sm:flex-none sm:px-5"
            >
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
          )}
        </div>
      )}
    </section>
  );
}
