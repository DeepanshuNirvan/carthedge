import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, PackageSearch, Truck } from 'lucide-react';
import type { TrackedOrder } from '@/api/types';
import { buyerPay, buyerVerifyPayment, trackOrder } from '@/api/storefront';
import { useRazorpay } from '@/hooks/useRazorpay';
import { Seo } from '@/lib/seo';
import { phoneSchema } from '@/lib/validators';
import { formatDateTime } from '@/lib/date';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { Field, Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';

const journey = ['confirmed', 'packed', 'shipped', 'delivered'] as const;
const journeyLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Out for delivery',
  delivered: 'Delivered',
};

export default function TrackPage() {
  const { orderCode: codeFromUrl } = useParams();
  const [code, setCode] = useState(codeFromUrl ?? '');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const openRazorpay = useRazorpay();

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) return toast('error', 'Enter a valid mobile number');
    if (!code.trim()) return toast('error', 'Enter your order code');
    setBusy(true);
    try {
      setOrder(await trackOrder(code.trim().toUpperCase(), parsed.data));
    } catch (err) {
      toast('error', 'Order not found', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const payNow = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const info = await buyerPay(order.orderCode, 'order');
      const res = await openRazorpay(info, { contact: phone });
      await buyerVerifyPayment({
        razorpayOrderId: res.razorpay_order_id,
        razorpayPaymentId: res.razorpay_payment_id,
        signature: res.razorpay_signature,
      });
      toast('success', 'Payment received', 'Your order is confirmed.');
      setOrder(await trackOrder(order.orderCode, phone));
    } catch (err) {
      toast('error', 'Payment failed', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const currentStage = order ? journey.indexOf(order.status as (typeof journey)[number]) : -1;
  const derailed = order?.status === 'rto' || order?.status === 'cancelled';

  return (
    <div className="min-h-dvh">
      <Seo title="Track your order — CartHedge" description="Check the live status of your order." path="/track" noIndex />

      <header className="border-b">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <Wordmark />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
        {!order ? (
          <motion.form
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={lookup}
            className="rounded-xl bg-surface p-6 shadow-soft hairline"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink">
              <PackageSearch className="size-6" />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-hi">Track your order</h1>
            <p className="mt-1 text-sm text-mid">Enter your order code and the number you ordered with.</p>
            <div className="mt-5 flex flex-col gap-4">
              <Field label="Order code">
                <Input
                  placeholder="CH-XXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </Field>
              <Field label="Mobile number">
                <Input type="tel" inputMode="numeric" placeholder="98xxxxxxx0" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Button type="submit" size="lg" loading={busy}>
                Track order
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="rounded-xl bg-surface p-5 shadow-soft hairline">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-low">{order.orderCode}</p>
                  <h1 className="mt-0.5 font-display text-lg font-semibold text-hi">{order.businessName}</h1>
                  <p className="mt-0.5 text-xs text-low">Placed {formatDateTime(order.createdAt)}</p>
                </div>
                <StatusChip status={order.status} />
              </div>

              {/* journey */}
              {derailed ? (
                <p className="mt-5 rounded-md bg-danger/10 p-4 text-sm text-danger-ink">
                  This order was {order.status === 'rto' ? 'returned to the seller' : 'cancelled'}. Contact the seller
                  if you think this is a mistake.
                </p>
              ) : (
                <ol className="mt-6 flex flex-col gap-0">
                  {journey.map((stage, i) => {
                    const done = currentStage >= i;
                    const active = currentStage === i;
                    return (
                      <li key={stage} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          {done ? (
                            <CheckCircle2 className={cn('size-5', active ? 'text-jade-ink' : 'text-jade-ink/70')} />
                          ) : (
                            <Circle className="size-5 text-surface-3" />
                          )}
                          {i < journey.length - 1 && (
                            <span className={cn('h-8 w-px', currentStage > i ? 'bg-jade-500/60' : 'bg-surface-3')} />
                          )}
                        </div>
                        <p className={cn('pb-2 text-sm', done ? 'font-medium text-hi' : 'text-low')}>
                          {journeyLabels[stage]}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}

              {order.courierTrackingId && (
                <p className="mt-4 flex items-center gap-2 rounded-md bg-surface-2 p-3 text-xs text-mid">
                  <Truck className="size-4 shrink-0 text-jade-ink" />
                  {order.courierName} · <span className="font-mono">{order.courierTrackingId}</span>
                </p>
              )}
            </div>

            <div className="rounded-xl bg-surface p-5 shadow-soft hairline">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-low">Items</h2>
              <ul className="mt-3 divide-y">
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
              <dl className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between text-mid">
                  <dt>Shipping</dt>
                  <dd>{order.shipping > 0 ? <MoneyText paise={order.shipping} /> : 'Free'}</dd>
                </div>
                <div className="flex justify-between font-semibold text-hi">
                  <dt>Total ({order.paymentMethod === 'cod' ? 'pay on delivery' : 'paid online'})</dt>
                  <dd><MoneyText paise={order.total} /></dd>
                </div>
              </dl>
              {order.paymentMethod === 'prepaid' && order.paymentStatus !== 'paid' && (
                <Button className="mt-4 w-full" loading={busy} onClick={payNow}>
                  Complete payment
                </Button>
              )}
            </div>

            {order.events.length > 0 && (
              <div className="rounded-xl bg-surface p-5 shadow-soft hairline">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-low">History</h2>
                <ol className="mt-3 flex flex-col gap-3 border-l pl-4">
                  {order.events.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-jade-500 ring-4 ring-surface" />
                      <p className="text-sm font-medium capitalize text-hi">{ev.status}</p>
                      {ev.note && <p className="text-xs text-mid">{ev.note}</p>}
                      <p className="text-xs text-low">{formatDateTime(ev.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <Button variant="ghost" onClick={() => setOrder(null)}>
              Track another order
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
