import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { PublicProduct } from '@/api/types';
import { useCart } from '@/store/cart';
import { toast } from '@/store/ui';
import { MoneyText } from '@/ui/MoneyText';
import { NoPhoto } from '@/ui/NoPhoto';

// The add control is identical whether it opens variants or adds straight to the
// cart; only the element differs. Kept in one place so the two can never drift.
const addBtn =
  'glass-nav absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full text-hi shadow-raised ' +
  'transition-[transform,background-color,color] duration-micro ease-spring hover:bg-jade-500 hover:text-[rgb(var(--text-on-accent))] active:scale-90';

/** A product on the shelf: photo first, price under it. Picking it up lifts it proud of the grid. */
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
  const reduced = useReducedMotion();
  const discount =
    product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;
  const hasVariants = product.variants.length > 0;
  const href = `/s/${businessCode}/p/${product.id}`;

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.035, ease: [0.16, 1, 0.3, 1] }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      className="group [perspective:900px]"
    >
      <div className="relative transition-transform duration-std ease-enter [@media(hover:hover)]:group-hover:[transform:translateZ(18px)_rotateX(3deg)]">
        <Link to={href} className="block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-2 shadow-soft transition-shadow duration-std [@media(hover:hover)]:group-hover:shadow-float">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                loading={index < 4 ? 'eager' : 'lazy'}
                decoding="async"
                className="size-full object-cover transition-transform duration-expr ease-enter [@media(hover:hover)]:group-hover:scale-[1.04]"
              />
            ) : (
              <NoPhoto name={product.name} />
            )}
            {!product.inStock && (
              <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink-950/70 py-1.5 text-center text-xs font-semibold text-white backdrop-blur-md">
                Sold out
              </span>
            )}
          </div>
        </Link>

        {product.inStock &&
          (hasVariants ? (
            <Link to={href} aria-label={`Choose options for ${product.name}`} className={addBtn}>
              <Plus className="size-[18px]" strokeWidth={2.5} />
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
              <Plus className="size-[18px]" strokeWidth={2.5} />
            </button>
          ))}
      </div>

      <Link to={href} className="mt-2.5 block px-0.5">
        <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug text-hi">{product.name}</h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <MoneyText paise={product.price} className="text-[14px] font-semibold text-hi" />
          {discount > 0 && (
            <>
              <MoneyText paise={product.comparePrice} strike className="text-xs" />
              <span className="text-xs font-semibold text-jade-ink">{discount}% off</span>
            </>
          )}
        </p>
      </Link>
    </motion.article>
  );
}
