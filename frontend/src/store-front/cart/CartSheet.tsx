import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { StoreBusiness } from '@/api/types';
import { cartTotal, useCart } from '@/store/cart';
import { Sheet } from '@/ui/Modal';
import { Button, IconButton } from '@/ui/Button';
import { MoneyText } from '@/ui/MoneyText';
import { EmptyState } from '@/ui/EmptyState';
import { CheckoutFlow } from '../checkout/CheckoutFlow';

export function CartSheet({
  open,
  onClose,
  businessCode,
  business,
}: {
  open: boolean;
  onClose: () => void;
  businessCode: string;
  business: StoreBusiness;
}) {
  const { items, setQty, remove, clear } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const subtotal = cartTotal(items);

  const close = () => {
    setCheckingOut(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={checkingOut ? 'Checkout' : 'Your cart'} side="bottom">
      {checkingOut ? (
        <CheckoutFlow
          ctx={{
            businessCode,
            businessName: business.name,
            items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
            subtotal,
            shippingFee: business.shippingFee,
            codEnabled: business.codEnabled,
          }}
          onDone={clear}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-5" />}
          title="Your cart is empty"
          message="Add something you love — checkout takes under a minute."
          action={
            <Link to={`/s/${businessCode}`} onClick={close} className="text-sm font-medium text-jade-500 hover:underline">
              Browse products →
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="divide-y">
            {items.map((item) => (
              <li key={`${item.productId}:${item.variantId ?? ''}`} className="flex gap-3 py-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  {item.image && <img src={item.image} alt="" className="size-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-hi">{item.name}</p>
                  {item.variantName && <p className="text-xs text-low">{item.variantName}</p>}
                  <MoneyText paise={item.price} className="text-sm text-mid" />
                </div>
                <div className="flex flex-col items-end justify-between">
                  <IconButton label="Remove item" onClick={() => remove(item.productId, item.variantId)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                  <div className="flex items-center rounded-md bg-surface-2 hairline">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQty(item.productId, item.variantId, item.qty - 1)}
                      className="flex size-8 items-center justify-center text-mid transition-colors hover:text-hi"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono text-sm tnum">{item.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQty(item.productId, item.variantId, item.qty + 1)}
                      className="flex size-8 items-center justify-center text-mid transition-colors hover:text-hi"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-1.5 rounded-lg bg-surface-2 p-4 text-sm">
            <div className="flex justify-between text-mid">
              <dt>Subtotal</dt>
              <dd><MoneyText paise={subtotal} /></dd>
            </div>
            <div className="flex justify-between text-mid">
              <dt>Shipping</dt>
              <dd>{business.shippingFee > 0 ? <MoneyText paise={business.shippingFee} /> : 'Free'}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-hi">
              <dt>Total</dt>
              <dd><MoneyText paise={subtotal + business.shippingFee} /></dd>
            </div>
          </dl>

          <Button size="lg" onClick={() => setCheckingOut(true)}>
            Checkout
          </Button>
        </div>
      )}
    </Sheet>
  );
}
