import type { Pricing, Sells } from '@/api/types';
import { formatPaise } from './money';

/**
 * A price in a buyer's words, split so the amount can be set in the money style:
 * "₹1,499", "From ₹2,500 per person", or no amount at all for "Price on request".
 * Mirrors product.PriceLabel in Go, which the assistant quotes.
 */
export function priceParts(p: Pricing & { price: number }) {
  if (p.priceKind === 'quote') return { prefix: 'Price on request', amount: '', unit: '' };
  return { prefix: p.priceKind === 'from' ? 'From' : '', amount: formatPaise(p.price), unit: p.priceUnit };
}

export const priceText = (p: Pricing & { price: number }) => {
  const { prefix, amount, unit } = priceParts(p);
  return [prefix, amount, unit].filter(Boolean).join(' ');
};

/** What the seller app calls the catalog and what is in it, by what the business sells. */
export function catalogWords(sells: Sells | undefined) {
  if (sells === 'services') return { title: 'Services', one: 'service', many: 'services' };
  if (sells === 'both') return { title: 'Catalog', one: 'item', many: 'items' };
  return { title: 'Products', one: 'product', many: 'products' };
}

/** Whether enquiries are part of this seller's day. */
export const takesEnquiries = (sells: Sells | undefined) => sells === 'services' || sells === 'both';

/**
 * Opens the buyer's chat with the business, the message already typed. WhatsApp
 * first (the text is prefilled); Instagram cannot prefill, so it only opens the DM.
 */
export function chatLinks(business: { whatsapp: string; instagram: string }, text: string) {
  return {
    whatsapp: business.whatsapp ? `https://wa.me/91${business.whatsapp}?text=${encodeURIComponent(text)}` : '',
    instagram: business.instagram ? `https://ig.me/m/${encodeURIComponent(business.instagram)}` : '',
  };
}
