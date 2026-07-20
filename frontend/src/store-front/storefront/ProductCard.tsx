import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ImageOff, Plus } from 'lucide-react';
import type { PublicProduct } from '@/api/types';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { MoneyText } from '@/ui/MoneyText';
import { Badge } from '@/ui/Badge';

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
      className="group overflow-hidden rounded-lg bg-surface shadow-soft hairline"
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
            {product.trending && (
              <Badge tone="gold">
                <Flame className="size-3" /> Trending
              </Badge>
            )}
            {discount > 0 && <Badge tone="jade">{discount}% off</Badge>}
          </div>
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
                className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-hi transition-colors hover:bg-jade-500 hover:text-white"
              >
                <Plus className="size-4" />
              </Link>
            ) : (
              <button
                aria-label={`Add ${product.name} to cart`}
                onClick={() => {
                  add(businessCode, product);
                  toast('success', 'Added to cart', product.name);
                }}
                className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-hi transition-colors hover:bg-jade-500 hover:text-white active:scale-95"
              >
                <Plus className="size-4" />
              </button>
            ))}
        </div>
      </div>
    </motion.article>
  );
}
