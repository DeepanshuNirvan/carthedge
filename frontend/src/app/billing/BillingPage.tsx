import { useState } from 'react';
import { ArrowUpRight, Check, MessageSquarePlus, Wallet } from 'lucide-react';
import { subscriptionCheckout, subscriptionVerify, useCancelSubscription, usePlans, useSubscriptionInfo, requestCustomPlan } from '@/api/plans';
import { useQueryClient } from '@tanstack/react-query';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useBusiness } from '@/api/business';
import { toast } from '@/store/ui';
import { formatPaise } from '@/lib/money';
import { formatDate, daysLeft } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Card } from '@/ui/Card';
import { Progress } from '@/ui/Progress';
import { Button } from '@/ui/Button';
import { Badge, StatusChip } from '@/ui/Badge';
import { Field, Input, Textarea } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { SkeletonRows } from '@/ui/Skeleton';
import { cn } from '@/lib/cn';

export default function BillingPage() {
  const { data: info, isLoading } = useSubscriptionInfo();
  const sub = info?.subscription;
  const { data: plans } = usePlans();
  const cancel = useCancelSubscription();
  const openRazorpay = useRazorpay();
  const { data: business } = useBusiness();
  const qc = useQueryClient();
  const [paying, setPaying] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [expectedOrders, setExpectedOrders] = useState('');

  const buy = async (planCode: string) => {
    setPaying(planCode);
    try {
      const info = await subscriptionCheckout(planCode);
      const res = await openRazorpay(
        info,
        business && { name: business.ownerName, contact: business.phone, email: business.email },
      );
      await subscriptionVerify({
        razorpayOrderId: res.razorpay_order_id,
        razorpayPaymentId: res.razorpay_payment_id,
        signature: res.razorpay_signature,
      });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      toast('success', 'Subscription active', 'Welcome aboard. Everything is unlocked.');
    } catch (e) {
      toast('error', 'Payment not completed', e instanceof Error ? e.message : undefined);
    } finally {
      setPaying(null);
    }
  };

  const sendCustomRequest = async () => {
    try {
      await requestCustomPlan(customMsg, Number(expectedOrders) || 0);
      toast('success', 'Request sent', 'Our team will reach out within a day.');
      setCustomOpen(false);
      setCustomMsg('');
      setExpectedOrders('');
    } catch (e) {
      toast('error', 'Could not send request', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <>
      <PageHeader title="Billing" subtitle="Your CartHedge plan, renewal and usage" />

      <div>
        {/* the current plan, with the period's usage as the one bar on the page */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <SkeletonRows rows={2} />
            </div>
          ) : sub ? (
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="text-[13px] font-medium text-mid">Current plan</p>
                <p className="mt-1 flex flex-wrap items-center gap-2.5 text-d3 font-semibold text-hi">
                  {sub.planName} <StatusChip status={sub.status} />
                </p>
                <p className="mt-2 text-sm text-mid">
                  <MoneyText paise={sub.priceMonthly} className="font-semibold text-hi" /> a month, {sub.orderQuota} orders
                  included, then <MoneyText paise={sub.perOrderFee} /> an order
                </p>
                <p className="mt-1 text-[13px] text-low">
                  {sub.status === 'trial' ? 'Trial ends' : sub.status === 'cancelled' ? 'Access till' : 'Renews by'}{' '}
                  {formatDate(sub.endsAt)}, {daysLeft(sub.endsAt)} {daysLeft(sub.endsAt) === 1 ? 'day' : 'days'} left
                </p>
              </div>
              <div className="rounded-xl bg-[rgb(var(--field)/0.04)] p-4 hairline">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-mid">Orders this period</span>
                  <span className="font-semibold tnum text-hi">
                    {sub.ordersUsed} <span className="font-normal text-low">of {sub.orderQuota}</span>
                  </span>
                </div>
                <Progress
                  className="mt-3"
                  value={sub.ordersUsed}
                  max={sub.orderQuota}
                  tone={sub.ordersUsed > sub.orderQuota ? 'gold' : 'jade'}
                />
                {/* the per-order fee is charged at renewal, so it has to be visible before the seller is asked to pay it */}
                {!!info?.overageOrders && (
                  <p className="mt-3 text-xs text-gold-ink">
                    {info.overageOrders} order{info.overageOrders === 1 ? '' : 's'} above your quota.{' '}
                    <MoneyText paise={info.overageFee} className="font-semibold" /> will be added to your next renewal.
                  </p>
                )}
                {sub.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 mt-3 text-danger-ink"
                    loading={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(undefined, {
                        onSuccess: () => toast('info', 'Auto-renew cancelled', 'You keep access until the period ends.'),
                      })
                    }
                  >
                    Cancel auto-renew
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="p-6 text-sm text-mid">No subscription found. Pick a plan below.</p>
          )}
        </Card>

        <h2 className="mb-3 mt-8 text-[15px] font-semibold text-hi">Plans</h2>
        <div className="panel grid overflow-hidden rounded-xl md:grid-cols-3">
          {plans
            ?.filter((p) => !p.isCustom)
            .map((plan) => {
              const current = sub?.planCode === plan.code;
              return (
                <div key={plan.code} className={cn('relative flex flex-col p-5 shadow-[inset_-1px_-1px_0_rgb(var(--line)/var(--line-a))] sm:p-6', current && 'bg-jade-500/6')}>
                  {current && (
                    <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-jade-500" />
                  )}
                  <p className="flex items-center justify-between text-[15px] font-semibold tracking-snug text-hi">
                    {plan.name}
                    {current && <Badge tone="jade">Current</Badge>}
                  </p>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="text-[2rem] font-semibold leading-none tracking-tightest tnum text-hi">
                      {formatPaise(plan.priceMonthly)}
                    </span>
                    <span className="text-sm text-low">/month</span>
                  </p>
                  <p className="mt-1.5 text-xs text-low">
                    {plan.orderQuota} orders, then {formatPaise(plan.perOrderFee)} each
                  </p>
                  <ul className="mt-4 flex flex-1 flex-col gap-2 border-t pt-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-mid">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-jade-ink" strokeWidth={2.5} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full xl:w-auto xl:self-start xl:px-8"
                    variant={current ? 'secondary' : 'primary'}
                    loading={paying === plan.code}
                    icon={<Wallet className="size-4" />}
                    onClick={() => buy(plan.code)}
                  >
                    {current ? 'Renew' : sub?.status === 'trial' ? 'Subscribe' : 'Switch'}
                  </Button>
                </div>
              );
            })}
        </div>

        <button
          onClick={() => setCustomOpen(true)}
          className="mt-4 flex w-full items-center gap-3.5 rounded-xl bg-gold-400/[0.07] p-4 text-left shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.25)] transition-colors hover:bg-gold-400/10"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-gold-ink">
            <MessageSquarePlus className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-hi">Need a custom plan?</span>
            <span className="text-[13px] text-mid">High volume, special quotas or negotiated pricing. Tell us your numbers.</span>
          </span>
          <ArrowUpRight className="size-4 text-gold-ink" aria-hidden />
        </button>
      </div>

      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="Request a custom plan">
        <div className="flex flex-col gap-4">
          <Field label="Expected orders a month">
            <Input inputMode="numeric" placeholder="2000" value={expectedOrders} onChange={(e) => setExpectedOrders(e.target.value)} />
          </Field>
          <Field label="What do you need?">
            <Textarea
              rows={4}
              placeholder="We do about 2000 orders a month across two Instagram pages and need multi-page support"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </Field>
          <Button size="lg" onClick={sendCustomRequest} disabled={customMsg.length < 10}>
            Send request
          </Button>
        </div>
      </Modal>
    </>
  );
}
