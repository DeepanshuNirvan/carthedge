import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, Check, Minus, PackageX, Plus, ShieldCheck, Store, Truck } from 'lucide-react';
import type { PublicVariant } from '@/api/types';
import { joinWaitlist, useStore, useStoreProduct } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { phoneSchema } from '@/lib/validators';
import { StoreHeader, trustLine } from '../storefront/StoreHeader';
import { CartSheet } from '../cart/CartSheet';
import { BuyerNotice } from '../BuyerNotice';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Input';
import { Skeleton } from '@/ui/Skeleton';
import { NoPhoto } from '@/ui/NoPhoto';
import { buttonLink } from '@/ui/buttonLink';
import { LaneGround } from '@/ui/LaneGround';
import { Modal } from '@/ui/Modal';

/** Swipeable gallery. The track scrolls natively (snap), so a flick feels like the Instagram post it came from. */
function Gallery({
  images,
  name,
  index,
  onIndex,
}: {
  images: string[];
  name: string;
  index: number;
  onIndex: (i: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    onIndex(i);
  };
  return (
    <div className="-mx-4 sm:mx-0">
      <div className="relative">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) onIndex(i);
          }}
          className="rail flex aspect-[4/5] snap-x snap-mandatory bg-surface-2 sm:overflow-hidden sm:rounded-xl sm:shadow-raised"
        >
          {images.length > 0 ? (
            images.map((img, i) => (
              <img
                key={img}
                src={img}
                alt={`${name}, view ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="size-full shrink-0 snap-center object-cover"
              />
            ))
          ) : (
            <NoPhoto name={name} size="lg" />
          )}
        </div>
        {images.length > 1 && (
          <div className="glass-nav absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full px-2.5 py-1.5 sm:hidden" aria-hidden>
            {images.map((img, i) => (
              <span key={img} className={cn('size-1.5 rounded-full transition-colors', i === index ? 'bg-hi' : 'bg-hi/30')} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="rail mt-3 hidden gap-2 sm:flex">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => go(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-md transition-[box-shadow,opacity]',
                i === index ? 'shadow-[0_0_0_2px_rgb(var(--jade-500))]' : 'opacity-70 hairline hover:opacity-100',
              )}
            >
              <img src={img} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { businessCode = '', productId = '' } = useParams();
  const { data: store, isError: storeMissing } = useStore(businessCode);
  const { data: product, isLoading, isError } = useStoreProduct(businessCode, productId);
  const add = useCart((s) => s.add);

  const [imageIndex, setImageIndex] = useState(0);
  const [variant, setVariant] = useState<PublicVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitPhone, setWaitPhone] = useState('');

  if (storeMissing) {
    return (
      <BuyerNotice
        icon={<Store className="size-5" />}
        title="Store not found"
        message="This link may have expired, or the seller changed their store address."
      />
    );
  }

  if (isLoading || !store) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pt-[calc(4rem+env(safe-area-inset-top))] sm:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3 rounded-full" />
          <Skeleton className="h-6 w-1/3 rounded-full" />
          <Skeleton className="mt-6 h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-5/6 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <BuyerNotice
        business={store.business}
        icon={<PackageX className="size-5" />}
        title="Product unavailable"
        message={`This item may have been removed by ${store.business.name}.`}
        actions={
          <Link to={`/s/${businessCode}`} className={buttonLink('primary')}>
            <Store className="size-4" aria-hidden /> Back to the store
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
        title={`${product.name} | ${store.business.name}`}
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
      <LaneGround strand={false} />
      <StoreHeader business={store.business} onCart={() => setCartOpen(true)} />

      <main className="mx-auto w-full max-w-5xl px-4 pt-2 sm:pt-4">
        <Link
          to={`/s/${businessCode}`}
          className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm text-mid transition-colors hover:text-hi"
        >
          <ArrowLeft className="size-4" /> {store.business.name}
        </Link>

        <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
          {/* gallery: swipe on phones, thumbnails where there is room */}
          <Gallery images={product.images} name={product.name} index={imageIndex} onIndex={setImageIndex} />

          {/* details */}
          <div>
            {product.category && <p className="text-[13px] font-medium text-low">{product.category}</p>}
            <h1 className="mt-1 text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-hi sm:text-[2rem]">{product.name}</h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <MoneyText paise={activePrice} className="text-2xl font-semibold text-hi" />
              {discount > 0 && (
                <>
                  <MoneyText paise={product.comparePrice} strike className="text-sm" />
                  <span className="text-sm font-semibold text-jade-ink">{discount}% off</span>
                </>
              )}
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
                      type="button"
                      aria-pressed={variant?.id === v.id}
                      disabled={!v.inStock}
                      onClick={() => setVariant(v)}
                      className={cn(
                        'min-h-11 min-w-12 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-micro ease-spring active:scale-95',
                        variant?.id === v.id ? 'bg-hi text-bg shadow-raised' : 'neu text-hi hover:bg-surface-3',
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
                <div className="flex items-center rounded-full neu">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    aria-label="Decrease quantity"
                    className="flex size-11 items-center justify-center rounded-full text-mid transition-colors hover:text-hi active:scale-90"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-[15px] font-semibold tnum">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    aria-label="Increase quantity"
                    className="flex size-11 items-center justify-center rounded-full text-mid transition-colors hover:text-hi active:scale-90"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            )}

            <ul className="mt-6 flex flex-col gap-2.5 border-t pt-5 text-[13px] text-mid">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-jade-ink" aria-hidden /> {trustLine(store.business)}, no signup needed
              </li>
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-jade-ink" aria-hidden />
                {store.business.shippingFee > 0 ? (
                  <span>
                    Shipping <MoneyText paise={store.business.shippingFee} />, delivered by courier
                  </span>
                ) : (
                  'Free shipping on this store'
                )}
              </li>
              {store.business.codEnabled && (
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-jade-ink" aria-hidden /> Cash on delivery available
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* floating buy bar: a glass capsule clear of the iOS home indicator */}
      <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl">
        <div className="glass-nav sheen flex items-center gap-3 rounded-full p-1.5 pl-5 shadow-float">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] text-low">{variant?.name ?? product.name}</p>
            <MoneyText paise={activePrice * qty} className="text-[17px] font-semibold text-hi" />
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
