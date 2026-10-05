import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, Check, Minus, PackageX, Plus, Ruler, ShieldCheck, Store, Truck } from 'lucide-react';
import type { ProductDetail, ProductLegal } from '@/api/types';
import { joinWaitlist, useStore, useStoreProduct } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { cn } from '@/lib/cn';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { phoneSchema } from '@/lib/validators';
import { galleryFor, isPlainList, missingGroup, settledPicks, variantFor, type Picks } from '@/lib/options';
import { OptionPicker } from './OptionPicker';
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

function SizeChart({ src, name, className }: { src: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex items-center gap-1.5 text-sm font-medium text-jade-ink hover:underline', className)}
      >
        <Ruler className="size-4" aria-hidden /> Size chart
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Size chart" wide>
        <img src={src} alt={`Size chart for ${name}`} className="w-full rounded-lg" />
      </Modal>
    </>
  );
}

/** Details the seller wrote, then what the law asks a listing to state (origin, maker). */
function ProductFacts({
  details,
  legal,
  sizeChart,
  name,
}: {
  details: ProductDetail[];
  legal: ProductLegal;
  sizeChart?: string;
  name: string;
}) {
  const facts = [
    ...details,
    ...(legal.originCountry ? [{ label: 'Country of origin', value: legal.originCountry }] : []),
    ...(legal.manufacturer ? [{ label: 'Made or packed by', value: legal.manufacturer }] : []),
  ];
  if (facts.length === 0 && !sizeChart) return null;
  return (
    <div className="mt-5">
      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
          {facts.map((d, i) => (
            <div key={i} className="contents">
              <dt className="text-low">{d.label}</dt>
              <dd className="whitespace-pre-line text-hi">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {sizeChart && <SizeChart src={sizeChart} name={name} className="mt-3" />}
    </div>
  );
}

const isSizeGroup = (name: string) => /size|fit|length|waist/i.test(name);

export default function ProductPage() {
  const { businessCode = '', productId = '' } = useParams();
  const { data: store, isError: storeMissing } = useStore(businessCode);
  const { data: product, isLoading, isError } = useStoreProduct(businessCode, productId);
  const add = useCart((s) => s.add);

  const [imageIndex, setImageIndex] = useState(0);
  const [chosen, setChosen] = useState<Picks>([]);
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
  const picks = settledPicks(product.options, chosen);
  const variant = variantFor(product.options, product.variants, picks);
  const photos = galleryFor(product.images, product.options, picks);
  const activePrice = variant && variant.price > 0 ? variant.price : product.price;
  const available = needsVariant ? (variant ? variant.inStock : product.inStock) : product.inStock;
  // the MRP is the legal reference price; a compare-at price shows only without one
  const listPrice = product.mrp > 0 ? product.mrp : product.comparePrice;
  const discount = listPrice > activePrice ? Math.round(((listPrice - activePrice) / listPrice) * 100) : 0;
  // the size chart sits beside the size choices when there are some
  const sizeGroup = product.sizeChart ? product.options.find((o) => isSizeGroup(o.name)) : undefined;

  const choose = (next: Picks) => {
    setChosen(next);
    setImageIndex(0);
  };

  const addToCart = () => {
    if (needsVariant && !variant) {
      const missing = missingGroup(product.options, picks);
      const title = missing && !isPlainList(product.options) ? `Choose a ${missing.name.toLowerCase()} first` : 'Pick an option first';
      toast('info', title, 'Then add it to your cart.');
      return;
    }
    add(businessCode, product, variant, qty, photos[0]);
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
          ...(product.originCountry ? { countryOfOrigin: product.originCountry } : {}),
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
          {/* keyed by the photo set, so picking a colour starts its photos from the first */}
          <Gallery key={photos.join('|')} images={photos} name={product.name} index={imageIndex} onIndex={setImageIndex} />

          {/* details */}
          <div>
            {product.category && <p className="text-[13px] font-medium text-low">{product.category}</p>}
            <h1 className="mt-1 text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-hi sm:text-[2rem]">{product.name}</h1>
            <p className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <MoneyText paise={activePrice} className="text-2xl font-semibold text-hi" />
              {discount > 0 && (
                <>
                  <span className="text-sm text-low">
                    {product.mrp > 0 && 'MRP '}
                    <MoneyText paise={listPrice} strike className="text-sm" />
                  </span>
                  <span className="text-sm font-semibold text-jade-ink">{discount}% off</span>
                </>
              )}
            </p>
            {product.mrp > 0 && (
              <p className="mt-1 text-xs text-low">
                {discount > 0 ? (
                  'Inclusive of all taxes'
                ) : (
                  <>
                    MRP <MoneyText paise={product.mrp} className="text-xs" />, inclusive of all taxes
                  </>
                )}
              </p>
            )}

            {product.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-mid">{product.description}</p>
            )}

            {needsVariant && (
              <div className="mt-5">
                <OptionPicker
                  options={product.options}
                  variants={product.variants}
                  picks={picks}
                  onPicks={choose}
                  aside={(o) => o === sizeGroup && product.sizeChart && <SizeChart src={product.sizeChart} name={product.name} />}
                />
              </div>
            )}

            <ProductFacts
              details={product.details ?? []}
              legal={product}
              sizeChart={sizeGroup ? undefined : product.sizeChart}
              name={product.name}
            />

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
                    Shipping <MoneyText paise={store.business.shippingFee} />
                    {store.business.freeShippingAbove > 0 ? (
                      <>
                        , free above <MoneyText paise={store.business.freeShippingAbove} />
                      </>
                    ) : (
                      ', delivered by courier'
                    )}
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
          The shop will message you on WhatsApp when <span className="font-medium text-hi">{product.name}</span> is
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
