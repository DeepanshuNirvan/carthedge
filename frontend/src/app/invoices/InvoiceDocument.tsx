import type { BusinessProfile, Invoice, Order } from '@/api/types';
import { formatDate } from '@/lib/date';
import { LogoMark } from '@/marketing/Wordmark';
import { MoneyText } from '@/ui/MoneyText';
import { Skeleton } from '@/ui/Skeleton';

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number) {
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
}
function belowThousand(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ones[h]} Hundred` : '', r ? belowHundred(r) : ''].filter(Boolean).join(' ');
}

/** Paise to words on the Indian scale (crore, lakh, thousand), the way an Indian invoice states it. */
export function rupeesInWords(paise: number) {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const p = Math.abs(paise) % 100;
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  const words = parts.length ? parts.join(' ') : 'Zero';
  return `Rupees ${words}${p ? ` and ${belowHundred(p)} Paise` : ''} only`;
}

/**
 * The invoice as a document: white paper in both themes (it is printed and
 * shared as a file), the seller's identity at the head, every line from the
 * order, totals that add up, and the amount in words.
 */
export function InvoiceDocument({
  invoice,
  business,
  order,
  orderLoading,
}: {
  invoice: Invoice;
  business?: BusinessProfile;
  order?: Order;
  orderLoading?: boolean;
}) {
  const sellerAddress = [business?.address, business?.city, business?.state, business?.pincode].filter(Boolean).join(', ');
  const buyerAddress = order
    ? [order.address.line, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')
    : '';

  return (
    <article data-theme="light" className="rounded-lg bg-surface p-5 text-hi shadow-raised sm:p-9">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {business?.logoUrl ? (
            <img src={business.logoUrl} alt="" className="size-12 rounded-md object-cover" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-md bg-jade-500/12 text-lg font-semibold text-jade-ink">
              {business?.name?.[0] ?? '?'}
            </span>
          )}
          <div>
            <p className="text-lg font-semibold tracking-snug">{business?.name}</p>
            {sellerAddress && <p className="mt-0.5 max-w-[34ch] text-xs leading-relaxed text-mid">{sellerAddress}</p>}
            {business?.gstin && <p className="mt-1 font-mono text-[11px] text-mid">GSTIN {business.gstin}</p>}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold text-low">{invoice.gstRate > 0 ? 'Tax invoice' : 'Invoice'}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-jade-ink">{invoice.invoiceNumber}</p>
        </div>
      </header>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-low">Invoice date</dt>
          <dd className="mt-0.5 font-medium">{formatDate(invoice.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-low">Order</dt>
          <dd className="mt-0.5 font-mono font-medium">#{invoice.orderCode}</dd>
        </div>
        <div>
          <dt className="text-low">Payment</dt>
          <dd className="mt-0.5 font-medium">
            {order ? (order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online') : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-low">Contact</dt>
          <dd className="mt-0.5 truncate font-medium">{business?.phone || business?.email || '-'}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs text-low">Billed to</p>
        <p className="mt-0.5 text-sm font-semibold">{invoice.customerName}</p>
        {order && (
          <p className="mt-0.5 max-w-[46ch] text-xs leading-relaxed text-mid">
            {order.customerPhone}
            {buyerAddress && <span className="block">{buyerAddress}</span>}
          </p>
        )}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] text-low">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 text-right font-medium">Qty</th>
            <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {orderLoading ? (
            <tr>
              <td colSpan={4} className="py-3">
                <Skeleton className="h-4 w-full rounded-full" />
              </td>
            </tr>
          ) : order ? (
            order.items.map((it, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 pr-3 align-top">
                  <span className="font-medium">{it.name}</span>
                  {it.variant && <span className="block text-xs text-low">{it.variant}</span>}
                </td>
                <td className="py-3 pr-3 text-right align-top tnum">{it.qty}</td>
                <td className="hidden py-3 pr-3 text-right align-top sm:table-cell">
                  <MoneyText paise={it.price} />
                </td>
                <td className="py-3 text-right align-top font-medium">
                  <MoneyText paise={it.price * it.qty} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-3 text-xs text-low">
                Order lines are not available for this invoice.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col gap-6 border-t pt-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-[36ch] text-xs italic leading-relaxed text-mid">{rupeesInWords(invoice.total)}</p>
        <dl className="flex w-full flex-col gap-1.5 text-sm sm:w-64">
          <div className="flex justify-between text-mid">
            <dt>Subtotal</dt>
            <dd><MoneyText paise={invoice.subtotal} /></dd>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-mid">
              <dt>Discount</dt>
              <dd>-<MoneyText paise={invoice.discount} /></dd>
            </div>
          )}
          <div className="flex justify-between text-mid">
            <dt>Shipping</dt>
            <dd>{invoice.shipping > 0 ? <MoneyText paise={invoice.shipping} /> : 'Free'}</dd>
          </div>
          {invoice.gstRate > 0 && (
            <div className="flex justify-between text-mid">
              <dt>GST at {invoice.gstRate}%</dt>
              <dd><MoneyText paise={invoice.gstAmount} /></dd>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t pt-2.5">
            <dt className="text-sm font-semibold">Total</dt>
            <dd className="text-xl font-semibold tracking-tight">
              <MoneyText paise={invoice.total} />
            </dd>
          </div>
        </dl>
      </div>

      <footer className="mt-9 flex flex-col items-center gap-1.5 border-t pt-5 text-center">
        <p className="text-xs text-mid">Thank you for shopping with {business?.name ?? 'us'}.</p>
        <p className="flex items-center gap-1.5 text-[11px] text-low">
          <LogoMark size={13} /> Generated with CartHedge
        </p>
      </footer>
    </article>
  );
}
