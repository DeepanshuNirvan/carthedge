import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BellRing, Check, ImageOff, ShieldCheck, Truck } from 'lucide-react';
import type { PublicVariant } from '@/api/types';
import { joinWaitlist, useStore, useStoreProduct } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { phoneSchema } from '@/lib/validators';
import { StoreHeader } from '../storefront/StoreHeader';
import { CartSheet } from '../cart/CartSheet';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Field, Input } from '@/ui/Input';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';

export default function ProductPage() {
  const { businessCode = '', productId = '' } = useParams();
  const { data: store } = useStore(businessCode);
  const { data: product, isLoading, isError } = useStoreProduct(businessCode, productId);
  const add = useCart((s) => s.add);

  const [imageIndex, setImageIndex] = useState(0);
  const [variant, setVariant] = useState<PublicVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitPhone, setWaitPhone] = useState('');

  if (isLoading || !store) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-2 h-6 w-1/3" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        className="min-h-dvh"
        title="Product unavailable"
        message="This item may have been removed by the seller."
        action={
          <Link to={`/s/${businessCode}`} className="text-sm font-medium text-jade-500 hover:underline">
            Back to store →
          </Link>
        }
      />
    );
  }

  const needsVariant = product.variants.length > 0;
  const activePrice = variant && variant.price > 0 ? variant.price : product.price;
  const available = needsVariant ? (variant ? variant.inStock : product.inStock) : product.inStock;
  const discount =
    product.comparePrice > activePrice
      ? Math.round(((product.comparePrice - activePrice) / product.comparePrice) * 100)
      : 0;

  const addToCart = () => {
    if (needsVariant && !variant) {
      toast('info', 'Pick an option first', 'Choose a size or colour to continue.');
      return;
    }
    add(businessCode, product, variant ?? undefined, qty);
    setCartOpen(true);
  };

  const submitWaitlist = async () => {
    const parsed = phoneSchema.safeParse(waitPhone);
    if (!parsed.success) {
      toast('error', 'Enter a valid mobile number');
      return;
    }
    try {
      await joinWaitlist(businessCode, product.id, parsed.data);
      toast('success', "You're on the list", 'We will message you the moment it is back.');
      setWaitlistOpen(false);
      setWaitPhone('');
    } catch (e) {
      toast('error', 'Could not join waitlist', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <Seo
        title={`${product.name} — ${store.business.name}`}
        description={product.description || `Buy ${product.name} from ${store.business.name}. Secure checkout, no signup.`}
        path={`/s/${businessCode}/p/${product.id}`}
        image={product.images[0]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          image: product.images,
          description: product.description,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: (activePrice / 100).toFixed(2),
            availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        }}
      />
      <StoreHeader business={store.business} onCart={() => setCartOpen(true)} />

      <main className="mx-auto w-full max-w-3xl px-4 pt-4">
        <Link
          to={`/s/${businessCode}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-mid transition-colors hover:text-hi"
        >
          <ArrowLeft className="size-4" /> Back to store
        </Link>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 hairline">
              <AnimatePresence mode="wait">
                {product.images[imageIndex] ? (
                  <motion.img
                    key={imageIndex}
                    src={product.images[imageIndex]}
                    alt={`${product.name} — view ${imageIndex + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-low">
                    <ImageOff className="size-8" aria-hidden />
                  </span>
                )}
              </AnimatePresence>
              {discount > 0 && <Badge tone="jade" className="absolute left-3 top-3">{discount}% off</Badge>}
            </div>
            {product.images.length > 1 && (
              <div className="rail mt-3 flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setImageIndex(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cn(
                      'size-16 shrink-0 overflow-hidden rounded-md transition-shadow',
                      i === imageIndex ? 'shadow-[0_0_0_2px_rgb(var(--jade-500))]' : 'hairline',
                    )}
                  >
                    <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* details */}
          <div>
            {product.category && <p className="text-xs uppercase tracking-wider text-low">{product.category}</p>}
            <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-hi sm:text-2xl">{product.name}</h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <MoneyText paise={activePrice} className="font-display text-2xl font-semibold text-hi" />
              {discount > 0 && <MoneyText paise={product.comparePrice} strike className="text-sm" />}
            </p>

            {product.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-mid">{product.description}</p>
            )}

            {needsVariant && (
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-medium text-hi">Choose an option</legend>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      disabled={!v.inStock}
                      onClick={() => setVariant(v)}
                      className={cn(
                        'min-h-11 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-micro active:scale-95',
                        variant?.id === v.id
                          ? 'bg-jade-500 text-white'
                          : 'bg-surface-2 text-hi hairline hover:bg-surface-3',
                        !v.inStock && 'cursor-not-allowed text-low line-through opacity-50',
                      )}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {available && (
              <div className="mt-5 flex items-center gap-3">
                <span className="text-sm font-medium text-hi">Quantity</span>
                <div className="flex items-center rounded-md bg-surface-2 hairline">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    aria-label="Decrease quantity"
                    className="size-10 text-lg text-mid transition-colors hover:text-hi"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-sm tnum">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    aria-label="Increase quantity"
                    className="size-10 text-lg text-mid transition-colors hover:text-hi"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <ul className="mt-6 flex flex-col gap-2 border-t pt-5 text-xs text-mid">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-jade-500" aria-hidden /> Secure payment via Razorpay
              </li>
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-jade-500" aria-hidden />
                {store.business.shippingFee > 0 ? (
                  <>
                    Shipping <MoneyText paise={store.business.shippingFee} className="text-xs" /> · delivered by courier
                  </>
                ) : (
                  'Free shipping on this store'
                )}
              </li>
              {store.business.codEnabled && (
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-jade-500" aria-hidden /> Cash on delivery available
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* sticky buy bar — clears the iOS home indicator */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-bg/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-low">{variant?.name ?? product.name}</p>
            <MoneyText paise={activePrice * qty} className="text-lg font-semibold text-hi" />
          </div>
          {available ? (
            <Button size="lg" className="flex-1" onClick={addToCart}>
              Add to cart
            </Button>
          ) : (
            <Button size="lg" variant="gold" className="flex-1" icon={<BellRing className="size-4" />} onClick={() => setWaitlistOpen(true)}>
              Notify me
            </Button>
          )}
        </div>
      </div>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} businessCode={businessCode} business={store.business} />

      <Modal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} title="Back-in-stock alert">
        <p className="text-sm text-mid">
          We&apos;ll message you on WhatsApp the moment <span className="font-medium text-hi">{product.name}</span> is
          back.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Your mobile number">
            <Input type="tel" inputMode="numeric" placeholder="98xxxxxxx0" value={waitPhone} onChange={(e) => setWaitPhone(e.target.value)} />
          </Field>
          <Button onClick={submitWaitlist}>Notify me</Button>
        </div>
      </Modal>
    </div>
  );
}
