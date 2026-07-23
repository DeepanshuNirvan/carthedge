import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PackageSearch, Search, SlidersHorizontal, Store, Ticket } from 'lucide-react';
import { useStore, useStoreProducts } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { formatPaise } from '@/lib/money';
import { cn } from '@/lib/cn';
import { StoreHeader } from './StoreHeader';
import { ProductCard } from './ProductCard';
import { CartSheet } from '../cart/CartSheet';
import { StoreFooter } from './StoreFooter';
import { Input, Select } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Sheet } from '@/ui/Modal';

type SortKey = 'featured' | 'priceLow' | 'priceHigh';

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'priceLow', label: 'Price: low to high' },
  { value: 'priceHigh', label: 'Price: high to low' },
];

export default function StorePage() {
  const { businessCode = '' } = useParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortKey>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { data: store, isLoading, isError } = useStore(businessCode);
  const { data: products, isLoading: productsLoading } = useStoreProducts(businessCode, { search, category });

  const priceCeiling = useMemo(
    () => Math.max(100000, ...(products ?? []).map((p) => p.price)),
    [products],
  );

  const visible = useMemo(() => {
    let list = [...(products ?? [])];
    if (inStockOnly) list = list.filter((p) => p.inStock);
    if (maxPrice !== null) list = list.filter((p) => p.price <= maxPrice);
    if (sort === 'priceLow') list.sort((a, b) => a.price - b.price);
    if (sort === 'priceHigh') list.sort((a, b) => b.price - a.price);
    if (sort === 'featured') list.sort((a, b) => Number(b.trending) - Number(a.trending));
    return list;
  }, [products, inStockOnly, maxPrice, sort]);

  const activeFilters = (inStockOnly ? 1 : 0) + (maxPrice !== null ? 1 : 0) + (category ? 1 : 0);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Skeleton className="h-16 w-full" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !store) {
    return (
      <EmptyState
        className="min-h-dvh"
        icon={<Store className="size-5" />}
        title="Store not found"
        message="This link may have expired, or the seller changed their store address."
      />
    );
  }

  if (store.paused) {
    return (
      <>
        <StoreHeader business={store.business} />
        <EmptyState
          className="min-h-[60dvh]"
          icon={<Store className="size-5" />}
          title="This store is taking a short break"
          message={`${store.business.name} is temporarily not accepting orders. Check back soon.`}
        />
      </>
    );
  }

  const productJsonLd = visible.slice(0, 10).map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: p.images[0],
    description: p.description,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (p.price / 100).toFixed(2),
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }));

  return (
    <div className="min-h-dvh">
      <Seo
        title={`${store.business.name} — Shop online`}
        description={`Shop ${store.business.name}${store.business.city ? ` from ${store.business.city}` : ''}. Secure checkout with UPI, cards${store.business.codEnabled ? ' and cash on delivery' : ''}. No signup needed.`}
        path={`/s/${businessCode}`}
        jsonLd={productJsonLd}
      />
      <StoreHeader business={store.business} onCart={() => setCartOpen(true)} />

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        {store.offers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex gap-2 overflow-x-auto pb-1"
          >
            {store.offers.map((o) => (
              <span
                key={o.id}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-gold-400/10 px-3.5 py-2.5 text-xs text-gold-500"
              >
                <Ticket className="size-4" aria-hidden />
                <span>
                  <span className="font-mono font-semibold">{o.code}</span> ·{' '}
                  {o.kind === 'percent' ? `${o.value}% off` : `${formatPaise(o.value)} off`}
                  {o.minAmount > 0 && ` above ${formatPaise(o.minAmount)}`}
                </span>
              </span>
            ))}
          </motion.div>
        )}

        {/* search + filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
            icon={<SlidersHorizontal className="size-4" />}
            className="shrink-0"
          >
            Filters
            {activeFilters > 0 && (
              <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-jade-500 font-mono text-[10px] text-white">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {store.categories.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory('')}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-micro ease-spring active:scale-95',
                category === ''
                  ? 'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay'
                  : 'neu text-mid hover:text-hi',
              )}
            >
              All
            </button>
            {store.categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c === category ? '' : c)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-micro ease-spring active:scale-95',
                  category === c
                    ? 'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay'
                    : 'neu text-mid hover:text-hi',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* trending row — only on the unfiltered view */}
        {!search && !category && store.trending.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-hi">Trending now</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
              {store.trending.map((p, i) => (
                <div key={p.id} className="w-40 shrink-0">
                  <ProductCard product={p} businessCode={businessCode} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-hi">
              {category || (search ? 'Results' : 'All products')}
            </h2>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="h-9 w-auto text-xs"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/5]" />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} businessCode={businessCode} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PackageSearch className="size-5" />}
              title="Nothing here yet"
              message={
                search || activeFilters
                  ? 'Try a different search or clear your filters.'
                  : 'This seller is still adding products — check back soon.'
              }
              action={
                (search || activeFilters) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setCategory('');
                      setInStockOnly(false);
                      setMaxPrice(null);
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          )}
        </section>
      </main>

      <StoreFooter business={store.business} />

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" side="bottom">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-hi">Maximum price</p>
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={10000}
              value={maxPrice ?? priceCeiling}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Maximum price"
              className="slider w-full cursor-pointer"
              style={{
                background: `linear-gradient(90deg, rgb(var(--jade-500)) ${
                  priceCeiling > 0 ? ((maxPrice ?? priceCeiling) / priceCeiling) * 100 : 100
                }%, rgb(var(--surface-3)) ${priceCeiling > 0 ? ((maxPrice ?? priceCeiling) / priceCeiling) * 100 : 100}%)`,
              }}
            />
            <p className="mt-2 font-mono text-sm text-jade-500 tnum">
              Up to {formatPaise(maxPrice ?? priceCeiling)}
            </p>
          </div>

          <label className="flex items-center justify-between text-sm text-hi">
            In stock only
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="size-5 accent-jade-500"
            />
          </label>

          {store.categories.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-hi">Category</p>
              <div className="flex flex-wrap gap-2">
                {store.categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c === category ? '' : c)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                      category === c
                    ? 'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay'
                    : 'neu text-mid hover:text-hi',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} product{visible.length !== 1 && 's'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCategory('');
                setInStockOnly(false);
                setMaxPrice(null);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Sheet>

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        businessCode={businessCode}
        business={store.business}
      />
    </div>
  );
}
