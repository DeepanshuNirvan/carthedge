import { useState } from 'react';
import { AlertTriangle, FileUp, Flame, Package, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import type { Product } from '@/api/types';
import { useLowStock, useProductMutations, useProducts } from '@/api/products';
import { useBusiness } from '@/api/business';
import { toast } from '@/store/ui';
import { PageHeader } from '../shell/PageHeader';
import { ShareActions, productUrl } from '../shell/ShareActions';
import { ProductForm } from './ProductForm';
import { BulkImportModal } from './BulkImportModal';
import { OffersPanel } from './OffersPanel';
import { Button, IconButton } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { MoneyText } from '@/ui/MoneyText';
import { Switch } from '@/ui/Switch';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';
import { cn } from '@/lib/cn';

function ProductCard({
  product,
  businessCode,
  onEdit,
  onDelete,
}: {
  product: Product;
  businessCode?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setStock, setTrending } = useProductMutations();
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <article className="panel group overflow-hidden rounded-lg transition-transform duration-std ease-enter hover:-translate-y-0.5 hover:shadow-raised">
      <div className="relative aspect-[4/3] bg-surface-2">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-low">
            <Package className="size-8" aria-hidden />
          </div>
        )}
        {product.trending && (
          <Badge tone="gold" className="absolute left-2.5 top-2.5">
            <Flame className="size-3" /> Trending
          </Badge>
        )}
        {!product.inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            Out of stock
          </span>
        )}
        {/* always reachable on touch; reveals on hover only where a cursor exists */}
        <div className="absolute right-2 top-2 flex gap-1 transition-opacity duration-micro [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
          {businessCode && (
            <IconButton label={`Share ${product.name}`} className="glass" onClick={() => setShareOpen((v) => !v)}>
              <Share2 className="size-4" />
            </IconButton>
          )}
          <IconButton label="Edit product" className="glass" onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Delete product" className="glass" onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="p-3 sm:p-3.5">
        <p className="truncate text-sm font-medium text-hi">{product.name}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <MoneyText paise={product.price} className="font-semibold text-hi" />
          {product.comparePrice > product.price && <MoneyText paise={product.comparePrice} strike className="text-xs" />}
          {product.resellerPrice > 0 && (
            <span className="ml-auto text-xs text-low">
              reseller <MoneyText paise={product.resellerPrice} className="text-xs" />
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-low">
          {product.category}
          {product.variants.length > 0 && ` · ${product.variants.length} variants`}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="flex items-center gap-2 text-xs text-mid">
            <Switch
              checked={product.inStock}
              label={`Stock for ${product.name}`}
              onChange={(inStock) => setStock.mutate({ id: product.id, inStock })}
            />
            Stock
          </span>
          <span className="flex items-center gap-2 text-xs text-mid">
            <Switch
              checked={product.trending}
              label={`Trending for ${product.name}`}
              onChange={(trending) => setTrending.mutate({ id: product.id, trending })}
            />
            Trend
          </span>
        </div>
        {shareOpen && businessCode && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <p className="hidden min-w-0 flex-1 truncate font-mono text-[11px] text-low sm:block">
              {productUrl(businessCode, product.id)}
            </p>
            <ShareActions url={productUrl(businessCode, product.id)} title={product.name} />
          </div>
        )}
      </div>
    </article>
  );
}

/** Counted stock running out — the seller's cue to restock before the storefront
 *  starts turning buyers away. */
function LowStockStrip({ onEdit }: { onEdit: (product: Product) => void }) {
  const { data: low } = useLowStock();
  if (!low || low.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-gold-400/10 p-4">
      <span className="flex items-center gap-2 text-sm font-medium text-gold-500">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Running low
      </span>
      <ul className="flex min-w-0 flex-1 basis-48 flex-wrap gap-x-2 gap-y-1">
        {low.slice(0, 6).map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onEdit(p)}
              className="rounded-full bg-surface px-2.5 py-1 text-xs text-hi shadow-soft transition-colors hover:bg-surface-2"
            >
              {p.name} · <span className="tnum text-gold-500">{p.stockQty} left</span>
            </button>
          </li>
        ))}
        {low.length > 6 && <li className="self-center text-xs text-mid">+{low.length - 6} more</li>}
      </ul>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const { data: products, isLoading } = useProducts({ search, category, trending: trendingOnly });
  const { data: business } = useBusiness();
  const { remove } = useProductMutations();

  const categories = [...new Set((products ?? []).map((p) => p.category).filter(Boolean))];

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={products ? `${products.length} in catalog` : undefined}
        actions={
          <>
            <Button variant="secondary" icon={<FileUp className="size-4" />} onClick={() => setBulkOpen(true)}>
              Bulk import
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Add product
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative basis-full sm:basis-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9 sm:h-10 sm:w-56"
            aria-label="Search products"
          />
        </div>
        <button
          onClick={() => setCategory('')}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-micro',
            category === '' ? 'bg-jade-500 text-white' : 'bg-surface-2 text-mid hover:text-hi',
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? '' : c)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-micro',
              category === c ? 'bg-jade-500 text-white' : 'bg-surface-2 text-mid hover:text-hi',
            )}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2 text-xs text-mid">
          <Switch checked={trendingOnly} onChange={setTrendingOnly} label="Trending only" />
          Trending only
        </span>
      </div>

      <LowStockStrip onEdit={(p) => { setEditing(p); setFormOpen(true); }} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              businessCode={business?.code}
              onEdit={() => { setEditing(p); setFormOpen(true); }}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package className="size-5" />}
          title={search || category ? 'Nothing matches' : 'Your catalog is empty'}
          message={
            search || category
              ? 'Try a different search or category.'
              : 'Add your first product — it goes live on your storefront instantly.'
          }
          action={
            <Button icon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Add product
            </Button>
          }
        />
      )}

      <div className="mt-8 max-w-2xl">
        <OffersPanel />
      </div>

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete product">
        <p className="text-sm text-mid">
          Remove <span className="font-medium text-hi">{deleting?.name}</span> from your catalog? Buyers will
          no longer see it. Existing orders keep their snapshot.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast('success', 'Product removed');
                  setDeleting(null);
                },
                onError: (e) => toast('error', 'Delete failed', e.message),
              })
            }
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
        </div>
      </Modal>
    </>
  );
}
