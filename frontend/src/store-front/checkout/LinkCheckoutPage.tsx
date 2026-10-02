import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ImageOff, Link2Off, Minus, Plus, ShieldCheck } from 'lucide-react';
import type { OrderRef, Product, Variant } from '@/api/types';
import { useResolvedLink } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/cn';
import { CheckoutFlow } from './CheckoutFlow';
import { LogoMark } from '@/marketing/Wordmark';
import { Avatar } from '@/ui/Avatar';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { LaneGround } from '@/ui/LaneGround';
import { EmptyState } from '@/ui/EmptyState';

type Selection = { qty: number; variantId?: string };

/** A shared link resolves into a single focused checkout — the highest-intent screen we have. */
export default function LinkCheckoutPage() {
  const { businessCode = '', token = '' } = useParams();
  const { data: link, isLoading, isError } = useResolvedLink(businessCode, token);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [checkingOut, setCheckingOut] = useState(false);

  const products: Product[] = useMemo(() => link?.items ?? [], [link]);

  const selectionFor = (p: Product): Selection =>
    selections[p.id] ?? { qty: 1, variantId: p.variants[0]?.id };

  const priceOf = (p: Product, variantId?: string) => {
    const v = p.variants.find((x) => x.id === variantId);
    return v && v.price > 0 ? v.price : p.price;
  };

  const subtotal =
    link?.kind === 'custom'
      ? (link.amount ?? 0)
      : products.reduce((sum, p) => {
          const sel = selectionFor(p);
          return sum + priceOf(p, sel.variantId) * sel.qty;
        }, 0);

  const orderRefs: OrderRef[] = products.map((p) => {
    const sel = selectionFor(p);
    return { productId: p.id, variantId: sel.variantId, qty: sel.qty };
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-lg p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="mt-4 h-56 w-full" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <EmptyState
        className="min-h-dvh"
        icon={<Link2Off className="size-5" />}
        title="This link is no longer available"
        message="It may have expired or been turned off by the seller. Ask them for a fresh link."
      />
    );
  }

  if (link.paused) {
    return (
      <EmptyState
        className="min-h-dvh"
        icon={<Link2Off className="size-5" />}
        title="This store is paused"
        message={`${link.business.name} is temporarily not accepting orders.`}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Seo
        title={`${link.title || 'Checkout'} | ${link.business.name}`}
        description={`Complete your order with ${link.business.name}. Secure checkout, no signup needed.`}
        path={`/l/${businessCode}/${token}`}
        noIndex
      />

      <LaneGround />
      <header className="glass-bar scroll-edge sticky top-0 z-30 shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <Avatar name={link.business.name} src={link.business.logoUrl || undefined} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-snug text-hi">{link.business.name}</p>
            {link.business.verified && (
              <span className="flex items-center gap-1 text-xs text-jade-ink">
                <ShieldCheck className="size-3.5" /> Verified seller
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="panel rounded-xl p-5 sm:p-6"
        >
          {!checkingOut ? (
            <>
              <Badge tone="jade">{link.kind === 'custom' ? 'Custom order' : 'Reserved for you'}</Badge>
              <h1 className="mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.025em] text-hi">
                {link.title || 'Your order'}
              </h1>

              {link.kind === 'custom' ? (
                <p className="mt-4 text-[2.5rem] font-semibold leading-none tracking-tightest text-hi">
                  <MoneyText paise={link.amount ?? 0} />
                </p>
              ) : (
                <ul className="mt-4 flex flex-col divide-y">
                  {products.map((p) => {
                    const sel = selectionFor(p);
                    return (
                      <li key={p.id} className="flex gap-3 py-3.5">
                        <div className="size-20 shrink-0 overflow-hidden rounded-md bg-surface-2 shadow-soft">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="size-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-low">
                              <ImageOff className="size-5" aria-hidden />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-hi">{p.name}</p>
                          <MoneyText paise={priceOf(p, sel.variantId)} className="text-sm text-mid" />

                          {p.variants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {p.variants.map((v: Variant) => (
                                <button
                                  key={v.id}
                                  disabled={!v.inStock}
                                  onClick={() => setSelections({ ...selections, [p.id]: { ...sel, variantId: v.id } })}
                                  className={cn(
                                    'min-h-9 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors active:scale-95',
                                    sel.variantId === v.id ? 'bg-hi text-bg' : 'neu text-mid',
                                    !v.inStock && 'cursor-not-allowed line-through opacity-50',
                                  )}
                                >
                                  {v.name}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 flex w-fit items-center rounded-full neu">
                            <button
                              aria-label={`Decrease quantity of ${p.name}`}
                              onClick={() =>
                                setSelections({ ...selections, [p.id]: { ...sel, qty: Math.max(1, sel.qty - 1) } })
                              }
                              className="flex size-10 items-center justify-center rounded-full text-mid hover:text-hi active:scale-90"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-semibold tnum">{sel.qty}</span>
                            <button
                              aria-label={`Increase quantity of ${p.name}`}
                              onClick={() => setSelections({ ...selections, [p.id]: { ...sel, qty: sel.qty + 1 } })}
                              className="flex size-10 items-center justify-center rounded-full text-mid hover:text-hi active:scale-90"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <dl className="mt-4 flex flex-col gap-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between text-mid">
                  <dt>Subtotal</dt>
                  <dd><MoneyText paise={subtotal} /></dd>
                </div>
                <div className="flex justify-between text-mid">
                  <dt>Shipping</dt>
                  <dd>{link.business.shippingFee > 0 ? <MoneyText paise={link.business.shippingFee} /> : 'Free'}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold text-hi">
                  <dt>Total</dt>
                  <dd><MoneyText paise={subtotal + link.business.shippingFee} /></dd>
                </div>
              </dl>

              <Button size="lg" className="mt-5 w-full" onClick={() => setCheckingOut(true)}>
                Continue to checkout
              </Button>
            </>
          ) : (
            <CheckoutFlow
              ctx={{
                businessCode,
                businessName: link.business.name,
                linkToken: token,
                items: link.kind === 'custom' ? undefined : orderRefs,
                subtotal,
                shippingFee: link.business.shippingFee,
                codEnabled: link.business.codEnabled,
                onlinePayment: link.business.onlinePayment,
              }}
              onDone={() => {}}
            />
          )}
        </motion.div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-low">
          <ShieldCheck className="size-3.5 text-jade-ink" />
          {link.business.onlinePayment === 'gateway'
            ? 'Payments secured by Razorpay'
            : link.business.onlinePayment === 'upi'
              ? 'Pay by UPI direct to the seller'
              : 'Cash on delivery'}
          <span aria-hidden className="text-dim">|</span> Powered by
          <LogoMark size={13} className="-ml-0.5" />
          CartHedge
        </p>
      </main>
    </div>
  );
}
