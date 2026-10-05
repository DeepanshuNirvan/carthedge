import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, FileText, IndianRupee, Lock, MapPin, MessageCircle, Pencil, Phone, Printer, Truck } from 'lucide-react';
import type { Address, Order, OrderStatus } from '@/api/types';
import { orderStatuses } from '@/api/types';
import { useOrder, useOrderMutations } from '@/api/orders';
import { useCan } from '@/api/plans';
import { useBusiness } from '@/api/business';
import { InvoiceDialog } from '../invoices/InvoiceDialog';
import { AfterSalePanel } from './AfterSalePanel';
import { toast } from '@/store/ui';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { Sheet } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { SkeletonRows } from '@/ui/Skeleton';
import { whatsappHref } from '@/lib/validators';
import { formatPaise } from '@/lib/money';
import { appUrl } from '../shell/ShareActions';

/** The update a seller sends the buyer for where the order stands, typed in
    and ready to send from their own WhatsApp. */
function buyerUpdate(order: Order, store: string) {
  const first = order.customerName.trim().split(/\s+/)[0];
  const yours = `your order ${order.code} from ${store}`;
  const courier = order.courierName
    ? ` Courier: ${order.courierName}${order.courierTrackingId ? `, tracking id ${order.courierTrackingId}` : ''}.`
    : '';
  const news: Record<OrderStatus, string> = {
    new: `thanks for ${yours}. Total ${formatPaise(order.total)}${order.paymentMethod === 'cod' ? ', cash on delivery' : ''}.`,
    confirmed: `${yours} is confirmed. We will pack it soon.`,
    packed: `${yours} is packed and ready to ship.`,
    shipped: `${yours} is on the way!${courier}`,
    delivered: `${yours} was delivered. Thank you for shopping with us!`,
    rto: `${yours} came back to us. Reply here and we will sort it out.`,
    cancelled: `${yours} has been cancelled.`,
  };
  return `Hi${first ? ` ${first}` : ''}, ${news[order.status]}
Track it: ${appUrl(`/o/${order.code}`)}`;
}

/** Where the parcel goes, editable until it ships. */
function AddressEditor({ orderId, address, onDone }: { orderId: string; address: Address; onDone: () => void }) {
  const { changeAddress } = useOrderMutations();
  const [a, setA] = useState(address);
  return (
    <div className="mt-3 grid gap-2 border-t pt-3">
      <Field label="Address">
        <Input value={a.line} maxLength={300} onChange={(e) => setA({ ...a, line: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="City">
          <Input value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} />
        </Field>
        <Field label="State">
          <Input value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })} />
        </Field>
        <Field label="Pincode">
          <Input inputMode="numeric" maxLength={6} value={a.pincode} onChange={(e) => setA({ ...a, pincode: e.target.value.replace(/\D/g, '') })} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={changeAddress.isPending}
          onClick={() =>
            changeAddress.mutate(
              { id: orderId, address: a },
              {
                onSuccess: () => {
                  toast('success', 'Address updated', 'The buyer has been told.');
                  onDone();
                },
                onError: (e) => toast('error', 'Address not changed', e.message),
              },
            )
          }
        >
          Save address
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order, isLoading } = useOrder(orderId ?? undefined);
  const { data: business } = useBusiness();
  const { setStatus, ship, resendCodConfirmation, confirmPayment } = useOrderMutations();
  const canInvoice = useCan('invoices').allowed;
  const [courierName, setCourierName] = useState('Shiprocket');
  const [trackingId, setTrackingId] = useState('');
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  // a half-done edit belongs to the order it was started on
  useEffect(() => {
    setEditingAddress(false);
    setInvoicing(false);
  }, [orderId]);

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

  // a pick left over from another order is ignored, not applied here
  const pendingStatus = order && nextStatus && order.nextStatuses?.includes(nextStatus) ? nextStatus : '';

  const doStatus = () => {
    if (!order || !pendingStatus) return;
    setStatus.mutate(
      { id: order.id, status: pendingStatus },
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
            {order.replacementOf && (
              <span className="rounded-full bg-jade-500/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-jade-ink">
                Exchange for #{order.replacementOf}
              </span>
            )}
            <span className="ml-auto text-xs text-low">{formatDateTime(order.createdAt)}</span>
          </div>

          {/* buyer */}
          <section className="rounded-xl bg-[rgb(var(--field)/0.045)] p-4 hairline">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-hi">{order.customerName}</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-mid">
                  <Phone className="size-3.5" /> {order.customerPhone}
                </p>
              </div>
              {/* the seller's next move is usually a message: one tap to the buyer's chat or phone */}
              <div className="flex shrink-0 gap-1">
                <a
                  href={whatsappHref(order.customerPhone, buyerUpdate(order, business?.name ?? 'us'))}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp ${order.customerName} an update on this order`}
                  className="flex size-10 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink transition-colors hover:bg-jade-500/20"
                >
                  <MessageCircle className="size-4" />
                </a>
                <a
                  href={`tel:${order.customerPhone}`}
                  aria-label={`Call ${order.customerName}`}
                  className="flex size-10 items-center justify-center rounded-full bg-[rgb(var(--field)/0.08)] text-mid transition-colors hover:text-hi"
                >
                  <Phone className="size-4" />
                </a>
              </div>
            </div>
            <div className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-mid">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span className="flex-1">
                {[order.address.line, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')}
              </span>
              {['new', 'confirmed', 'packed'].includes(order.status) && !editingAddress && (
                <button
                  type="button"
                  onClick={() => setEditingAddress(true)}
                  className="-my-2 inline-flex items-center gap-1 py-2 font-medium text-jade-ink hover:underline"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              )}
            </div>
            {(order.buyerGstin || order.buyerCompany) && (
              <p className="mt-1.5 text-xs text-mid">
                {order.buyerCompany}
                {order.buyerGstin && <span className="font-mono"> GSTIN {order.buyerGstin}</span>}
              </p>
            )}
            {editingAddress && <AddressEditor orderId={order.id} address={order.address} onDone={() => setEditingAddress(false)} />}
          </section>

          {/* items & money */}
          <section>
            <ul className="divide-y">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-hi">
                    {item.qty}× {item.name}
                    {item.variant && <span className="text-low">, {item.variant}</span>}
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
                <div className="flex justify-between text-jade-ink">
                  <dt>Discount {order.offerCode && `(${order.offerCode})`}</dt>
                  <dd>-<MoneyText paise={order.discount} /></dd>
                </div>
              )}
              {order.prepaidDiscount > 0 && (
                <div className="flex justify-between text-jade-ink">
                  <dt>Online payment discount</dt>
                  <dd>-<MoneyText paise={order.prepaidDiscount} /></dd>
                </div>
              )}
              <div className="flex justify-between text-mid">
                <dt>Shipping</dt>
                <dd>{order.shipping > 0 ? <MoneyText paise={order.shipping} /> : 'Free'}</dd>
              </div>
              {order.codFee > 0 && (
                <div className="flex justify-between text-mid">
                  <dt>COD charge</dt>
                  <dd><MoneyText paise={order.codFee} /></dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-hi">
                <dt>Total</dt>
                <dd><MoneyText paise={order.total} /></dd>
              </div>
              {order.tokenAmount > 0 && (
                // never claim the token is in hand until the payment says so —
                // a seller reads this before dispatching
                <div className={cn('flex justify-between', order.paymentStatus === 'paid' ? 'text-gold-ink' : 'text-mid')}>
                  <dt>{order.paymentStatus === 'paid' ? 'COD token collected' : 'COD token pending'}</dt>
                  <dd><MoneyText paise={order.tokenAmount} /></dd>
                </div>
              )}
            </dl>
          </section>

          {/* A buyer who paid the seller's UPI ID directly reports the UTR here.
              Only the seller can see their own bank alert, so only they can
              settle it — CartHedge deliberately cannot. */}
          {order.paymentStatus === 'claimed' && (
            <section className="rounded-xl bg-gold-400/10 p-4 shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.22)]">
              <p className="flex items-center gap-2 text-sm font-medium text-gold-ink">
                <IndianRupee className="size-4" aria-hidden /> Buyer reported a UPI payment
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-mid">
                Reference <span className="font-mono text-hi">{order.paymentRef}</span> for{' '}
                <MoneyText paise={order.total} className="text-xs" />. Check your bank or UPI app before you confirm.
                Confirming marks the order paid and messages the buyer.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={confirmPayment.isPending}
                  onClick={() =>
                    confirmPayment.mutate(
                      { id: order.id, approved: true },
                      {
                        onSuccess: () => toast('success', 'Payment confirmed', 'The buyer has been notified.'),
                        onError: (e) => toast('error', 'Could not confirm', e.message),
                      },
                    )
                  }
                >
                  Money received
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={confirmPayment.isPending}
                  onClick={() =>
                    confirmPayment.mutate(
                      { id: order.id, approved: false },
                      {
                        onSuccess: () => toast('info', 'Marked unpaid', 'The buyer can try the payment again.'),
                        onError: (e) => toast('error', 'Could not update', e.message),
                      },
                    )
                  }
                >
                  Not received
                </Button>
              </div>
            </section>
          )}

          {/* actions */}
          <section className="grid gap-4 rounded-xl bg-[rgb(var(--field)/0.045)] p-4 hairline">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Status">
                <Select
                  value={pendingStatus || order.status}
                  disabled={!order.nextStatuses?.length}
                  onChange={(e) => setNextStatus(e.target.value === order.status ? '' : (e.target.value as OrderStatus))}
                >
                  <option value={order.status}>
                    {order.status} {order.nextStatuses?.length ? '(current)' : '(final)'}
                  </option>
                  {(order.nextStatuses ?? orderStatuses.filter((s) => s !== order.status)).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="secondary" onClick={doStatus} disabled={!pendingStatus} loading={setStatus.isPending}>
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

            {/* the RTO defence: nudge the buyer again before anyone dispatches */}
            {order.paymentMethod === 'cod' && !['delivered', 'cancelled', 'rto'].includes(order.status) && (
              <Button
                variant="secondary"
                icon={<BellRing className="size-4" />}
                loading={resendCodConfirmation.isPending}
                onClick={() =>
                  resendCodConfirmation.mutate(order.id, {
                    onSuccess: () => toast('success', 'Confirmation resent', 'The buyer got the COD confirm link again.'),
                    onError: (e) => toast('error', 'Could not resend', e.message),
                  })
                }
              >
                {order.codConfirmedAt ? 'Resend COD confirmation' : 'Send COD confirmation'}
              </Button>
            )}

            <div className="flex flex-wrap gap-2">
              <a
                href={`/app/print/slips?ids=${order.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-hi neu"
              >
                <Printer className="size-4" /> Packing slip
              </a>
              {order.invoiceId ? (
                <Link
                  to={`/app/invoices?open=${order.invoiceId}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-hi neu"
                >
                  <FileText className="size-4" /> Open invoice
                </Link>
              ) : (
                order.status !== 'cancelled' &&
                (canInvoice ? (
                  <Button size="sm" variant="secondary" icon={<FileText className="size-4" />} onClick={() => setInvoicing(true)}>
                    Create invoice
                  </Button>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-low">
                    <Lock className="size-3.5" /> Invoices need a higher plan.
                  </p>
                ))
              )}
            </div>
          </section>

          <AfterSalePanel order={order} />

          {/* timeline */}
          {order.events && order.events.length > 0 && (
            <section>
              <h3 className="mb-3 text-[13px] font-semibold text-mid">Timeline</h3>
              <ol className="relative flex flex-col gap-4 border-l pl-5">
                {order.events.map((ev, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-jade-500 ring-4 ring-surface"
                    />
                    <p className="text-sm font-medium first-letter:uppercase text-hi">{ev.status.replace(/_/g, ' ')}</p>
                    {ev.note && <p className="text-xs text-mid">{ev.note}</p>}
                    <p className="mt-0.5 text-xs text-low">{formatDateTime(ev.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {invoicing && <InvoiceDialog order={order} open onClose={() => setInvoicing(false)} />}
        </div>
      )}
    </Sheet>
  );
}
