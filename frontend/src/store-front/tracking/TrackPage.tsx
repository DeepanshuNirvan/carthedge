import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Truck } from 'lucide-react';
import type { CheckoutInfo, TrackedOrder } from '@/api/types';
import { buyerPay, buyerVerifyPayment, trackOrder } from '@/api/storefront';
import { UpiPayPanel } from '../checkout/UpiPayPanel';
import { SelfService } from './SelfService';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useCopy } from '@/hooks/useCopy';
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
import { LaneGround } from '@/ui/LaneGround';
import { StatusChip } from '@/ui/Badge';

const journey = ['confirmed', 'packed', 'shipped', 'delivered'] as const;
const journeyLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Out for delivery',
  delivered: 'Delivered',
};

// orders nobody can pay for any more; the API refuses them too
const closedStatuses = ['cancelled', 'rto', 'delivered'];

// keyed by the order code, so following a link to another order (an exchange's
// replacement) starts fresh instead of keeping the previous order on screen
export default function TrackPage() {
  const { orderCode } = useParams();
  return <TrackView key={orderCode ?? ''} />;
}

function TrackView() {
  const { orderCode: codeFromUrl } = useParams();
  const [code, setCode] = useState(codeFromUrl ?? '');
  // checkout hands the number over in router state, so a buyer who just ordered
  // does not retype it (state stays out of the URL)
  const { state } = useLocation();
  const [phone, setPhone] = useState<string>((state as { phone?: string } | null)?.phone ?? '');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [upiInfo, setUpiInfo] = useState<CheckoutInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const openRazorpay = useRazorpay();
  const { copied, copy } = useCopy();

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
      if (info.mode === 'upi') {
        setUpiInfo(info);
        return;
      }
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
  // when did each stage happen: the latest event carrying that status
  const stageTime = (stage: string) => {
    const hits = order?.events.filter((e) => e.status === stage) ?? [];
    return hits[hits.length - 1]?.createdAt;
  };

  return (
    <div className="grain min-h-dvh">
      <Seo title="Track your order | CartHedge" description="Check the live status of your order." path="/track" noIndex />
      <LaneGround />

      <header className="glass-bar scroll-edge sticky top-0 z-30 shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))]">
          <Wordmark />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 sm:pt-10">
        <AnimatePresence mode="wait">
          {!order ? (
            <motion.form
              key="lookup"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={lookup}
              className="panel mx-auto max-w-md rounded-xl p-6 sm:p-8"
            >
              {/* four unlit bulbs: the journey this order will light up */}
              <div aria-hidden className="flex items-center gap-2">
                {journey.map((s, i) => (
                  <span key={s} className="flex flex-1 items-center gap-2 last:flex-none">
                    <span className="bulb size-2.5" data-lit={i === 0 && busy} />
                    {i < journey.length - 1 && <span className="h-px flex-1 bg-wire/15" />}
                  </span>
                ))}
              </div>
              <h1 className="mt-6 text-d3 font-semibold text-hi">Track your order</h1>
              <p className="mt-1.5 text-[15px] text-mid">Enter your order code and the number you ordered with.</p>
              <div className="mt-6 flex flex-col gap-4">
                <Field label="Order code">
                  <Input
                    placeholder="CH-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-wide"
                    autoCapitalize="characters"
                  />
                </Field>
                <Field label="Mobile number">
                  <Input type="tel" inputMode="numeric" autoComplete="tel" placeholder="98xxxxxxx0" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Button type="submit" size="lg" loading={busy} className="mt-1">
                  Track order
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              {/* where the parcel is, said plainly, with the strand of stages under it */}
              <section className="panel overflow-hidden rounded-xl">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-low">
                        {order.businessName} <span aria-hidden>·</span> <span className="font-mono">{order.orderCode}</span>
                      </p>
                      <h1 className="mt-1.5 text-d3 font-semibold text-hi">
                        {derailed
                          ? order.status === 'rto'
                            ? 'Returned to the seller'
                            : 'Order cancelled'
                          : currentStage >= 0
                            ? journeyLabels[journey[currentStage]]
                            : 'Order received'}
                      </h1>
                      <p className="mt-1 text-sm text-low">Placed {formatDateTime(order.createdAt)}</p>
                    </div>
                    <StatusChip status={order.status} className="mt-1 shrink-0" />
                  </div>
                </div>

                {derailed ? (
                  <p className="mx-5 mb-5 rounded-lg bg-danger/10 p-4 text-sm text-danger-ink sm:mx-6 sm:mb-6">
                    This order was {order.status === 'rto' ? 'returned to the seller' : 'cancelled'}. Contact the seller if you
                    think this is a mistake.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-0 border-t px-5 py-5 sm:flex-row sm:px-6 sm:py-6">
                    {journey.map((stage, i) => {
                      // delivered is an end, not a step in progress: its bulb settles to done
                      const finished = journey[currentStage] === 'delivered';
                      const done = currentStage > i || (finished && currentStage === i);
                      const now = currentStage === i && !finished;
                      const at = stageTime(stage);
                      return (
                        <li key={stage} className="relative flex gap-3.5 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:gap-3 sm:pb-0">
                          {/* the wire to the next bulb: down on phones, across on wider screens */}
                          {i < journey.length - 1 && (
                            <span aria-hidden className="absolute left-[6px] top-4 h-[calc(100%-0.5rem)] w-px bg-wire/15 sm:left-4 sm:top-[6px] sm:h-px sm:w-[calc(100%-0.5rem)]">
                              <motion.span
                                className="absolute inset-0 origin-top bg-jade-500 sm:origin-left"
                                initial={{ scaleY: 0, scaleX: 0 }}
                                animate={{ scaleY: done ? 1 : 0, scaleX: done ? 1 : 0 }}
                                transition={{ delay: 0.25 + i * 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </span>
                          )}
                          <motion.span
                            className={cn('bulb relative z-10 mt-0.5 size-3.5 shrink-0', now && 'animate-breathe')}
                            data-lit={now}
                            data-state={done ? 'done' : undefined}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15 + i * 0.25, type: 'spring', stiffness: 420, damping: 20 }}
                          />
                          <div className="min-w-0 sm:pr-3">
                            <p className={cn('text-sm', done || now ? 'font-semibold text-hi' : 'text-low')}>{journeyLabels[stage]}</p>
                            <p className="mt-0.5 text-xs text-low">
                              {at ? formatDateTime(at) : now ? 'In progress' : done ? 'Done' : 'Up next'}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {order.courierTrackingId && (
                  <div className="flex items-center gap-3 border-t px-5 py-4 sm:px-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink">
                      <Truck className="size-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-hi">{order.courierName || 'Courier'}</p>
                      <p className="truncate font-mono text-xs text-low">{order.courierTrackingId}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      onClick={() => copy(order.courierTrackingId ?? '')}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}
              </section>

              <section className="panel rounded-xl p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold text-hi">Your order</h2>
                <ul className="mt-3 divide-y">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--field)/0.07)] text-xs font-semibold tnum text-mid">
                          {item.qty}x
                        </span>
                        <span className="min-w-0 text-hi">
                          {item.name}
                          {item.variant && <span className="block text-xs text-low">{item.variant}</span>}
                        </span>
                      </span>
                      <MoneyText paise={item.price * item.qty} className="font-medium" />
                    </li>
                  ))}
                </ul>
                <dl className="mt-2 flex flex-col gap-1.5 border-t pt-3 text-sm">
                  {order.discount > 0 && (
                    <div className="flex justify-between text-mid">
                      <dt>Discount</dt>
                      <dd>
                        −<MoneyText paise={order.discount} />
                      </dd>
                    </div>
                  )}
                  {order.prepaidDiscount > 0 && (
                    <div className="flex justify-between text-mid">
                      <dt>Online payment discount</dt>
                      <dd>
                        −<MoneyText paise={order.prepaidDiscount} />
                      </dd>
                    </div>
                  )}
                  {order.codFee > 0 && (
                    <div className="flex justify-between text-mid">
                      <dt>Cash on delivery charge</dt>
                      <dd>
                        <MoneyText paise={order.codFee} />
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between text-mid">
                    <dt>Shipping</dt>
                    <dd>{order.shipping > 0 ? <MoneyText paise={order.shipping} /> : 'Free'}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-hi">
                    <dt>
                      Total ({order.paymentMethod === 'cod' ? 'pay on delivery' : order.paymentStatus === 'paid' ? 'paid online' : 'pay online'})
                    </dt>
                    <dd><MoneyText paise={order.total} /></dd>
                  </div>
                </dl>
                {order.paymentMethod === 'prepaid' && order.paymentStatus === 'claimed' && !upiInfo && (
                  <p className="mt-4 rounded-lg bg-gold-400/10 p-3.5 text-xs leading-relaxed text-mid">
                    {order.businessName} is verifying your UPI payment
                    {order.paymentRef && <> (reference <span className="font-mono text-hi">{order.paymentRef}</span>)</>}.
                    Your order moves on as soon as it is matched.
                  </p>
                )}
                {order.paymentMethod === 'prepaid' && order.paymentStatus !== 'paid' && !upiInfo && !closedStatuses.includes(order.status) && (
                  <Button className="mt-4 w-full" size="lg" loading={busy} onClick={payNow}>
                    {order.paymentStatus === 'claimed' ? 'Pay again' : 'Complete payment'}
                  </Button>
                )}
                {upiInfo && (
                  <div className="mt-4">
                    <UpiPayPanel info={upiInfo} onClaimed={async () => setOrder(await trackOrder(order.orderCode, phone))} />
                  </div>
                )}
              </section>

              <SelfService
                order={order}
                phone={phoneSchema.safeParse(phone).data ?? phone}
                onChanged={() => trackOrder(order.orderCode, phone).then(setOrder, () => undefined)}
              />

              {order.events.length > 0 && (
                <section className="panel rounded-xl p-5 sm:p-6">
                  <h2 className="text-[15px] font-semibold text-hi">Updates</h2>
                  <ol className="mt-4 flex flex-col gap-4">
                    {[...order.events].reverse().map((ev, i) => (
                      <li key={i} className="relative flex gap-3.5">
                        <span className="bulb mt-1.5 size-2 shrink-0" data-lit={i === 0} data-state={i > 0 ? 'done' : undefined} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium capitalize text-hi">{ev.status.replace(/_/g, ' ')}</p>
                          {ev.note && <p className="text-[13px] text-mid">{ev.note}</p>}
                          <p className="text-xs text-low">{formatDateTime(ev.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setOrder(null)}>
                  Track another order
                </Button>
                {order.businessCode && (
                  <Link to={`/s/${order.businessCode}/policies`} className="px-3 text-[13px] text-mid underline-offset-2 hover:text-hi hover:underline">
                    Returns and policies
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
