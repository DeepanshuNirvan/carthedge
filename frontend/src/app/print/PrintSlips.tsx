import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { get } from '@/api/http';
import { useBusiness } from '@/api/business';
import type { BusinessProfile, Order } from '@/api/types';
import { formatDate } from '@/lib/date';
import { formatPaise } from '@/lib/money';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 0, width: 160 }).then(setSrc, () => setSrc(''));
  }, [text]);
  return src ? <img src={src} alt="" className="size-24" /> : <span className="size-24" />;
}

/** One parcel's slip: where it goes, what is inside, and whether to collect cash. */
function Slip({ order, business }: { order: Order; business?: BusinessProfile }) {
  const cod = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded';
  const collect = cod ? order.total - (order.paymentStatus === 'token_paid' ? order.tokenAmount : 0) : 0;
  const from = [business?.address, business?.city, business?.state, business?.pincode].filter(Boolean).join(', ');
  return (
    <article data-theme="light" className="print-page flex flex-col gap-4 rounded-lg bg-surface p-6 text-hi shadow-raised">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-low">Ship to</p>
          <p className="mt-0.5 text-xl font-semibold">{order.customerName}</p>
          <p className="mt-1 max-w-[42ch] text-[15px] leading-snug">
            {[order.address.line, order.address.city, order.address.state].filter(Boolean).join(', ')}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wide">{order.address.pincode}</p>
          <p className="mt-1 font-mono text-sm">{order.customerPhone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Qr text={`${window.location.origin}/o/${order.code}`} />
          <span className="font-mono text-xs font-semibold">#{order.code}</span>
        </div>
      </div>

      <div className="rounded-md border-2 border-current p-3 text-center">
        {cod ? (
          <p className="text-lg font-semibold">Cash on delivery: collect {formatPaise(collect)}</p>
        ) : (
          <p className="text-lg font-semibold">Prepaid: do not collect money</p>
        )}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] text-low">
            <th className="py-1.5 pr-2 font-medium">Qty</th>
            <th className="py-1.5 font-medium">Item</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-2 align-top font-semibold tnum">{it.qty}</td>
              <td className="py-2">
                {it.name}
                {it.variant && <span className="text-mid">, {it.variant}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.notes && <p className="text-xs text-mid">Note: {order.notes}</p>}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t pt-3 text-xs text-mid">
        <div className="max-w-[40ch]">
          <p className="font-semibold text-hi">From: {business?.name}</p>
          {from && <p>{from}</p>}
          {(business?.whatsapp || business?.phone) && <p>{business?.whatsapp || business?.phone}</p>}
        </div>
        <div className="text-right">
          <p>Ordered {formatDate(order.createdAt)}</p>
          {order.courierName && (
            <p>
              {order.courierName} {order.courierTrackingId}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Everything to pull from the shelf for these orders, one line per item and option. */
function PickList({ orders }: { orders: Order[] }) {
  const rows = useMemo(() => {
    const m = new Map<string, { name: string; variant: string; qty: number; orders: number }>();
    for (const o of orders)
      for (const it of o.items) {
        const key = `${it.name}|${it.variant ?? ''}`;
        const row = m.get(key) ?? { name: it.name, variant: it.variant ?? '', qty: 0, orders: 0 };
        row.qty += it.qty;
        row.orders += 1;
        m.set(key, row);
      }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant));
  }, [orders]);
  return (
    <article data-theme="light" className="print-page rounded-lg bg-surface p-6 text-hi shadow-raised">
      <p className="text-xl font-semibold">Pick list</p>
      <p className="mt-0.5 text-xs text-mid">
        {orders.length} {orders.length === 1 ? 'order' : 'orders'}, {formatDate(new Date().toISOString())}
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] text-low">
            <th className="w-8 py-1.5" aria-label="Picked" />
            <th className="py-1.5 pr-2 font-medium">Item</th>
            <th className="py-1.5 pr-2 font-medium">Option</th>
            <th className="py-1.5 pr-2 text-right font-medium">Qty</th>
            <th className="py-1.5 text-right font-medium">Orders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.name}|${r.variant}`} className="border-b last:border-0">
              <td className="py-2">
                <span className="block size-4 rounded-xs border border-current" />
              </td>
              <td className="py-2 pr-2">{r.name}</td>
              <td className="py-2 pr-2 text-mid">{r.variant || '-'}</td>
              <td className="py-2 pr-2 text-right font-semibold tnum">{r.qty}</td>
              <td className="py-2 text-right tnum text-mid">{r.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function PrintSlips() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 100);
  const picklist = params.get('picklist') === '1';
  const { data: business } = useBusiness();
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['print', ids.join(',')],
    queryFn: () => Promise.all(ids.map((id) => get<Order>(`/api/v1/orders/${id}`))),
    enabled: ids.length > 0,
  });
  const sheets = orders && (
    <div className="flex flex-col gap-6">
      {picklist ? <PickList orders={orders} /> : orders.map((o) => <Slip key={o.id} order={o} business={business} />)}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-hi">{picklist ? 'Pick list' : ids.length === 1 ? 'Packing slip' : `${ids.length} packing slips`}</h1>
          <p className="text-xs text-low">{picklist ? 'Everything to pull from the shelf for these orders.' : 'Each slip prints on its own page.'}</p>
        </div>
        <Button icon={<Printer className="size-4" />} disabled={!orders} onClick={() => window.print()}>
          Print
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <p className="text-sm text-danger-ink">Could not load these orders. Close this tab and try again from the order list.</p>
      ) : (
        sheets
      )}
      {sheets && createPortal(<div data-print className="hidden print:block">{sheets}</div>, document.body)}
    </div>
  );
}
