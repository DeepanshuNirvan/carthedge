import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ImageOff, Plus } from 'lucide-react';
import type { PublicProduct } from '@/api/types';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { MoneyText } from '@/ui/MoneyText';
import { Badge } from '@/ui/Badge';

// The add control is identical whether it opens variants or adds straight to the
// cart; only the element differs. Kept in one place so the two can never drift.
const addBtn =
  'flex size-10 shrink-0 items-center justify-center rounded-md neu text-jade-ink sm:size-9 ' +
  'transition-all duration-micro ease-spring hover:bg-gradient-to-b hover:from-jade-400 ' +
  'hover:to-jade-500 hover:text-[rgb(var(--text-on-accent))] active:scale-90';

export function ProductCard({
  product,
  businessCode,
  index = 0,
}: {
  product: PublicProduct;
  businessCode: string;
  index?: number;
}) {
  const add = useCart((s) => s.add);
  const discount =
    product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;
  const hasVariants = product.variants.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: Math.min(index, 8) * 0.035, ease: [0.16, 1, 0.3, 1] }}
      className="panel group overflow-hidden rounded-lg transition-transform duration-std ease-enter hover:-translate-y-1 hover:shadow-raised"
    >
      <Link to={`/s/${businessCode}/p/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              className="size-full object-cover transition-transform duration-expr ease-enter group-hover:scale-105"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-low">
              <ImageOff className="size-7" aria-hidden />
            </span>
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {product.trending && <Badge tone="gold">Trending</Badge>}
            {discount > 0 && <Badge tone="jade">{discount}% off</Badge>}
          </div>
          {/* keeps badges legible over pale product photos without dimming the whole image */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent"
          />
          {!product.inStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
              Sold out
            </span>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link to={`/s/${businessCode}/p/${product.id}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-hi">{product.name}</h3>
        </Link>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="flex flex-wrap items-baseline gap-1.5">
            <MoneyText paise={product.price} className="text-sm font-semibold text-hi" />
            {discount > 0 && <MoneyText paise={product.comparePrice} strike className="text-xs" />}
          </p>
          {product.inStock &&
            (hasVariants ? (
              <Link
                to={`/s/${businessCode}/p/${product.id}`}
                aria-label={`Choose options for ${product.name}`}
                className={addBtn}
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </Link>
            ) : (
              <button
                aria-label={`Add ${product.name} to cart`}
                onClick={() => {
                  add(businessCode, product);
                  toast('success', 'Added to cart', product.name);
                }}
                className={addBtn}
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </button>
            ))}
        </div>
      </div>
    </motion.article>
  );
}
