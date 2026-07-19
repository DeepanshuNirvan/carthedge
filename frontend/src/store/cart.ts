import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicProduct, PublicVariant } from '@/api/types';

export type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  image?: string;
  qty: number;
};

type CartState = {
  businessCode: string | null;
  items: CartItem[];
  add: (businessCode: string, product: PublicProduct, variant?: PublicVariant, qty?: number) => void;
  setQty: (productId: string, variantId: string | undefined, qty: number) => void;
  remove: (productId: string, variantId?: string) => void;
  clear: () => void;
};

const keyOf = (i: { productId: string; variantId?: string }) => `${i.productId}:${i.variantId ?? ''}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      businessCode: null,
      items: [],
      add: (businessCode, product, variant, qty = 1) => {
        // one cart per store — switching stores starts fresh
        const items = get().businessCode === businessCode ? [...get().items] : [];
        const entry: CartItem = {
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          variantName: variant?.name,
          price: variant && variant.price > 0 ? variant.price : product.price,
          image: product.images[0],
          qty,
        };
        const existing = items.find((i) => keyOf(i) === keyOf(entry));
        if (existing) existing.qty += qty;
        else items.push(entry);
        set({ businessCode, items });
      },
      setQty: (productId, variantId, qty) =>
        set({
          items: get()
            .items.map((i) => (keyOf(i) === keyOf({ productId, variantId }) ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        }),
      remove: (productId, variantId) =>
        set({ items: get().items.filter((i) => keyOf(i) !== keyOf({ productId, variantId })) }),
      clear: () => set({ items: [], businessCode: null }),
    }),
    { name: 'carthedge-cart' },
  ),
);

export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.qty, 0);
