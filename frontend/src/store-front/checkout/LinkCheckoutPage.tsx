import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Banknote,
  Link2Off,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from 'lucide-react';
import type { OrderRef, Product, ResolvedLink } from '@/api/types';
import { useResolvedLink, useStore } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { formatPaise } from '@/lib/money';
import { whatsappHref } from '@/lib/validators';
import { galleryFor, settledPicks, variantFor, type Picks } from '@/lib/options';
import { OptionPicker } from '../product/OptionPicker';
import { CheckoutFlow } from './CheckoutFlow';
import { BuyerNotice } from '../BuyerNotice';
import { LogoMark } from '@/marketing/Wordmark';
import { Avatar } from '@/ui/Avatar';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { LaneGround } from '@/ui/LaneGround';
import { NoPhoto } from '@/ui/NoPhoto';
import { buttonLink } from '@/ui/buttonLink';

type Selection = { qty: number; picks: Picks };

const paymentLine = (b: ResolvedLink['business']) =>
  b.onlinePayment === 'gateway'
    ? 'Pay online, secured by Razorpay'
    : b.onlinePayment === 'upi'
      ? `Pay by UPI straight to ${b.name}`
      : null;

/** Desktop only: what the buyer is ordering, large, with the facts that make paying a stranger feel safe. */
function LinkShowcase({ link, products }: { link: ResolvedLink; products: Product[] }) {
  const b = link.business;
  const shown = products.slice(0, 4);
  const pay = paymentLine(b);
  const facts: { icon: typeof ShieldCheck; text: string }[] = [
    ...(b.verified ? [{ icon: ShieldCheck, text: 'Verified seller on CartHedge' }] : []),
    ...(pay ? [{ icon: Wallet, text: pay }] : []),
    ...(b.codEnabled ? [{ icon: Banknote, text: 'Cash on delivery available' }] : []),
    { icon: Truck, text: b.shippingFee > 0 ? `Shipping ${formatPaise(b.shippingFee)}` : 'Free shipping' },
    { icon: Phone, text: 'No account needed, just your phone number' },
  ];

  return (
    <section aria-label="Your order" className="hidden lg:block">
      {shown.length === 1 ? (
        <div className="aspect-[4/5] max-h-[34rem] overflow-hidden rounded-xl bg-surface-2 shadow-float">
          {shown[0].images[0] ? (
            <img src={shown[0].images[0]} alt={shown[0].name} className="size-full object-cover" />
          ) : (
            <NoPhoto name={shown[0].name} size="lg" />
          )}
        </div>
      ) : shown.length > 1 ? (
        <ul className="grid grid-cols-2 gap-4">
          {shown.map((p) => (
            <li key={p.id}>
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-surface-2 shadow-soft">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="size-full object-cover" loading="lazy" />
                ) : (
                  <NoPhoto name={p.name} />
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium text-hi">{p.name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel flex items-center gap-4 rounded-xl p-6">
          <Avatar name={b.name} src={b.logoUrl || undefined} className="size-16" />
          <div className="min-w-0">
            <p className="truncate text-d4 font-semibold text-hi">{b.name}</p>
            <p className="mt-1 text-sm text-mid">A custom order, priced by the seller for you</p>
          </div>
        </div>
      )}
      {products.length > shown.length && (
        <p className="mt-3 text-sm text-low">and {products.length - shown.length} more in this order</p>
      )}
      <ul className="mt-7 grid gap-3.5">
        {facts.map((f) => (
          <li key={f.text} className="flex items-center gap-3 text-sm text-mid">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jade-500/10 text-jade-ink">
              <f.icon className="size-4" aria-hidden />
            </span>
            {f.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A shared link resolves into a single focused checkout — the highest-intent screen we have. */
export default function LinkCheckoutPage() {
  const { businessCode = '', token = '' } = useParams();
  const { data: link, isLoading, isError } = useResolvedLink(businessCode, token);
  // a dead link still knows the shop from its URL: find the seller so the buyer has somewhere to go
  const { data: store } = useStore(businessCode, isError);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [checkingOut, setCheckingOut] = useState(false);

  const products: Product[] = useMemo(() => link?.items ?? [], [link]);

  // opens on what the seller put in the link, else the first combination in stock
  const selectionFor = (p: Product): Selection => {
    if (selections[p.id]) return selections[p.id];
    const ref = link?.refs?.find((r) => r.productId === p.id);
    const start = p.variants.find((v) => v.id === ref?.variantId && v.inStock) ?? p.variants.find((v) => v.inStock);
    return { qty: Math.max(ref?.qty ?? 1, 1), picks: start?.options ?? [] };
  };
  const variantOf = (p: Product, sel: Selection) => variantFor(p.options, p.variants, settledPicks(p.options, sel.picks));
  const priceOf = (p: Product, sel: Selection) => {
    const v = variantOf(p, sel);
    return v && v.price > 0 ? v.price : p.price;
  };

  const subtotal =
    link?.kind === 'custom'
      ? (link.amount ?? 0)
      : products.reduce((sum, p) => {
          const sel = selectionFor(p);
          return sum + priceOf(p, sel) * sel.qty;
        }, 0);

  const orderRefs: OrderRef[] = products.map((p) => {
    const sel = selectionFor(p);
    return { productId: p.id, variantId: variantOf(p, sel)?.id, qty: sel.qty };
  });
  // every item with options needs a complete, in-stock choice before checkout
  const unchosen = products.find((p) => p.variants.length > 0 && !variantOf(p, selectionFor(p))?.inStock);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-lg p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="mt-4 h-56 w-full" />
      </div>
    );
  }

  if (isError || !link) {
    const seller = store?.business;
    return (
      <BuyerNotice
        business={seller}
        icon={<Link2Off className="size-5" />}
        title="This link is no longer available"
        message={`It may have expired or been turned off by ${seller ? seller.name : 'the seller'}. Ask them for a fresh link.`}
        actions={
          seller && (
            <>
              <a href={`/s/${seller.code}`} className={buttonLink('primary')}>
                <Store className="size-4" aria-hidden /> Visit the store
              </a>
              {seller.whatsapp && (
                <a
                  href={whatsappHref(seller.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonLink('secondary')}
                >
                  <MessageCircle className="size-4" aria-hidden /> Chat on WhatsApp
                </a>
              )}
            </>
          )
        }
      />
    );
  }

  if (link.paused) {
    return (
      <BuyerNotice
        business={link.business}
        icon={<Store className="size-5" />}
        title="This store is taking a short break"
        message={`${link.business.name} is temporarily not accepting orders. Check back soon.`}
        actions={
          link.business.whatsapp && (
            <a
              href={whatsappHref(link.business.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className={buttonLink('secondary')}
            >
              <MessageCircle className="size-4" aria-hidden /> Chat on WhatsApp
            </a>
          )
        }
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <Seo
        title={`${link.title || 'Checkout'} | ${link.business.name}`}
        description={`Complete your order with ${link.business.name}. Secure checkout, no signup needed.`}
        path={`/l/${businessCode}/${token}`}
        noIndex
      />

      <LaneGround />
      <header className="glass-bar scroll-edge sticky top-0 z-30 shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:max-w-5xl">
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

      <main className="mx-auto w-full max-w-lg px-4 py-5 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-12 lg:py-10">
        <LinkShowcase link={link} products={products} />
        <div className="lg:sticky lg:top-24">
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
                      const photo = galleryFor(p.images, p.options, settledPicks(p.options, sel.picks))[0];
                      return (
                        <li key={p.id} className="flex gap-3 py-3.5">
                          <div className="size-20 shrink-0 overflow-hidden rounded-md bg-surface-2 shadow-soft">
                            {photo ? (
                              <img
                                src={photo}
                                alt={p.name}
                                className="size-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <NoPhoto name={p.name} size="sm" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-hi">{p.name}</p>
                            <MoneyText paise={priceOf(p, sel)} className="text-sm text-mid" />

                            {p.variants.length > 0 && (
                              <div className="mt-2">
                                <OptionPicker
                                  compact
                                  options={p.options}
                                  variants={p.variants}
                                  picks={settledPicks(p.options, sel.picks)}
                                  onPicks={(picks) => setSelections({ ...selections, [p.id]: { ...sel, picks } })}
                                />
                              </div>
                            )}

                            <div className="mt-2 flex w-fit items-center rounded-full neu">
                              <button
                                aria-label={`Decrease quantity of ${p.name}`}
                                onClick={() =>
                                  setSelections({
                                    ...selections,
                                    [p.id]: { ...sel, qty: Math.max(1, sel.qty - 1) },
                                  })
                                }
                                className="flex size-10 items-center justify-center rounded-full text-mid hover:text-hi active:scale-90"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold tnum">{sel.qty}</span>
                              <button
                                aria-label={`Increase quantity of ${p.name}`}
                                onClick={() =>
                                  setSelections({ ...selections, [p.id]: { ...sel, qty: sel.qty + 1 } })
                                }
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
                    <dd>
                      <MoneyText paise={subtotal} />
                    </dd>
                  </div>
                  <div className="flex justify-between text-mid">
                    <dt>Shipping</dt>
                    <dd>
                      {link.business.shippingFee > 0 ? (
                        <MoneyText paise={link.business.shippingFee} />
                      ) : (
                        'Free'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-hi">
                    <dt>Total</dt>
                    <dd>
                      <MoneyText paise={subtotal + link.business.shippingFee} />
                    </dd>
                  </div>
                </dl>

                <Button size="lg" className="mt-5 w-full" disabled={!!unchosen} onClick={() => setCheckingOut(true)}>
                  Continue to checkout
                </Button>
                {unchosen && (
                  <p role="status" className="mt-2 text-center text-xs text-low">
                    Choose the options for {unchosen.name} to continue.
                  </p>
                )}
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
            <span aria-hidden className="text-dim">
              |
            </span>{' '}
            Powered by
            <LogoMark size={13} className="-ml-0.5" />
            CartHedge
          </p>
        </div>
      </main>
    </div>
  );
}
