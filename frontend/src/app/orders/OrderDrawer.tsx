import { useState } from 'react';
import { MapPin, Phone, Truck } from 'lucide-react';
import type { OrderStatus } from '@/api/types';
import { orderStatuses } from '@/api/types';
import { useOrder, useOrderMutations } from '@/api/orders';
import { useCreateInvoice } from '@/api/invoices';
import { toast } from '@/store/ui';
import { formatDateTime } from '@/lib/date';
import { Sheet } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { SkeletonRows } from '@/ui/Skeleton';

export function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(orderId ?? undefined);
  const { setStatus, ship } = useOrderMutations();
  const createInvoice = useCreateInvoice();
  const [courierName, setCourierName] = useState('Shiprocket');
  const [trackingId, setTrackingId] = useState('');
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');

  const doShip = () => {
    if (!order) return;
    ship.mutate(
      { id: order.id, courierName, trackingId },
      {
        onSuccess: () => toast('success', 'Handed to courier', `${courierName} · ${trackingId || 'tracking pending'}`),
        onError: (e) => toast('error', 'Ship failed', e.message),
      },
    );
  };

  const doStatus = () => {
    if (!order || !nextStatus) return;
    setStatus.mutate(
      { id: order.id, status: nextStatus },
      {
        onSuccess: () => {
          toast('success', 'Status updated');
          setNextStatus('');
        },
        onError: (e) => toast('error', 'Update failed', e.message),
      },
    );
  };

  return (
    <Sheet open={!!orderId} onClose={onClose} title={order ? `Order #${order.code}` : 'Order'}>
      {isLoading || !order ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={order.status} />
            <StatusChip status={order.paymentStatus || (order.paymentMethod === 'cod' ? 'pending' : 'paid')} />
            {order.riskFlagged && <StatusChip status="rto" />}
            <span className="ml-auto text-xs text-low">{formatDateTime(order.createdAt)}</span>
          </div>

          {/* buyer */}
          <section className="rounded-lg bg-surface-2 p-4">
            <p className="text-sm font-semibold text-hi">{order.customerName}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-mid">
              <Phone className="size-3.5" /> {order.customerPhone}
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-mid">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {order.address.line}, {order.address.city}, {order.address.state} — {order.address.pincode}
            </p>
          </section>

          {/* items & money */}
          <section>
            <ul className="divide-y">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-hi">
                    {item.qty}× {item.name}
                    {item.variant && <span className="text-low"> · {item.variant}</span>}
                  </span>
                  <MoneyText paise={item.price * item.qty} />
                </li>
              ))}
            </ul>
            <dl className="mt-2 flex flex-col gap-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between text-mid">
                <dt>Subtotal</dt>
                <dd><MoneyText paise={order.subtotal} /></dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-jade-500">
                  <dt>Discount {order.offerCode && `(${order.offerCode})`}</dt>
                  <dd>-<MoneyText paise={order.discount} /></dd>
                </div>
              )}
              <div className="flex justify-between text-mid">
                <dt>Shipping</dt>
                <dd><MoneyText paise={order.shipping} /></dd>
              </div>
              <div className="flex justify-between font-semibold text-hi">
                <dt>Total</dt>
                <dd><MoneyText paise={order.total} /></dd>
              </div>
              {order.tokenAmount > 0 && (
                <div className="flex justify-between text-gold-500">
                  <dt>COD token collected</dt>
                  <dd><MoneyText paise={order.tokenAmount} /></dd>
                </div>
              )}
            </dl>
          </section>

          {/* actions */}
          <section className="grid gap-4 rounded-lg bg-surface-2 p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Change status">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)}>
                  <option value="">Choose…</option>
                  {orderStatuses
                    .filter((s) => s !== order.status)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button variant="secondary" onClick={doStatus} disabled={!nextStatus} loading={setStatus.isPending}>
                Apply
              </Button>
            </div>

            {['confirmed', 'packed'].includes(order.status) && (
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Courier">
                  <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} />
                </Field>
                <Field label="Tracking ID" optional>
                  <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
                </Field>
                <Button onClick={doShip} loading={ship.isPending} icon={<Truck className="size-4" />}>
                  Ship
                </Button>
              </div>
            )}

            {order.status === 'delivered' && (
              <Button
                variant="secondary"
                loading={createInvoice.isPending}
                onClick={() =>
                  createInvoice.mutate(
                    { orderId: order.id, gstRate: 0 },
                    {
                      onSuccess: () => toast('success', 'Invoice created', 'Find it under Invoices.'),
                      onError: (e) => toast('error', 'Invoice failed', e.message),
                    },
                  )
                }
              >
                Generate invoice
              </Button>
            )}
          </section>

          {/* timeline */}
          {order.events && order.events.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-low">Timeline</h3>
              <ol className="relative flex flex-col gap-4 border-l pl-5">
                {order.events.map((ev, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-jade-500 ring-4 ring-surface"
                    />
                    <p className="text-sm font-medium capitalize text-hi">{ev.status}</p>
                    {ev.note && <p className="text-xs text-mid">{ev.note}</p>}
                    <p className="mt-0.5 text-xs text-low">{formatDateTime(ev.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
