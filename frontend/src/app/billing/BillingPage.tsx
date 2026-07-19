import { useState } from 'react';
import { Check, MessageSquarePlus, Wallet } from 'lucide-react';
import { subscriptionCheckout, subscriptionVerify, useCancelSubscription, usePlans, useSubscription, requestCustomPlan } from '@/api/plans';
import { useQueryClient } from '@tanstack/react-query';
import { useRazorpay } from '@/hooks/useRazorpay';
import { toast } from '@/store/ui';
import { formatPaise } from '@/lib/money';
import { formatDate, daysLeft } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Badge, StatusChip } from '@/ui/Badge';
import { Field, Input, Textarea } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { SkeletonRows } from '@/ui/Skeleton';
import { cn } from '@/lib/cn';

export default function BillingPage() {
  const { data: sub, isLoading } = useSubscription();
  const { data: plans } = usePlans();
  const cancel = useCancelSubscription();
  const openRazorpay = useRazorpay();
  const qc = useQueryClient();
  const [paying, setPaying] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [expectedOrders, setExpectedOrders] = useState('');

  const buy = async (planCode: string) => {
    setPaying(planCode);
    try {
      const info = await subscriptionCheckout(planCode);
      const res = await openRazorpay(info);
      await subscriptionVerify({
        razorpayOrderId: res.razorpay_order_id,
        razorpayPaymentId: res.razorpay_payment_id,
        signature: res.razorpay_signature,
      });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      toast('success', 'Subscription active', 'Welcome aboard — everything is unlocked.');
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
      <PageHeader title="Billing" subtitle="Plan, renewal and invoices for your CartHedge subscription" />

      <div className="max-w-3xl">
        <Card>
          <CardHeader title="Current plan" />
          <div className="p-5 pt-4">
            {isLoading ? (
              <SkeletonRows rows={2} />
            ) : sub ? (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="flex items-center gap-2 font-display text-xl font-semibold text-hi">
                    {sub.planName} <StatusChip status={sub.status} />
                  </p>
                  <p className="mt-1 text-sm text-mid">
                    <MoneyText paise={sub.priceMonthly} />/month · {sub.orderQuota} orders included ·{' '}
                    <MoneyText paise={sub.perOrderFee} />/order after
                  </p>
                  <p className="mt-1 text-xs text-low">
                    {sub.status === 'trial' ? 'Trial ends' : sub.status === 'cancelled' ? 'Access till' : 'Renews by'}{' '}
                    {formatDate(sub.endsAt)} ({daysLeft(sub.endsAt)} days)
                  </p>
                </div>
                {sub.status === 'active' && (
                  <Button
                    variant="ghost"
                    className="ml-auto text-danger"
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
            ) : (
              <p className="text-sm text-mid">No subscription found — pick a plan below.</p>
            )}
          </div>
        </Card>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {plans
            ?.filter((p) => !p.isCustom)
            .map((plan) => {
              const current = sub?.planCode === plan.code;
              return (
                <Card key={plan.code} className={cn('flex flex-col p-5', current && 'ring-1 ring-jade-500/60')}>
                  <p className="flex items-center justify-between font-display text-base font-semibold text-hi">
                    {plan.name}
                    {current && <Badge tone="jade">Current</Badge>}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-hi tnum">
                    {formatPaise(plan.priceMonthly)}
                    <span className="text-xs font-normal text-low">/mo</span>
                  </p>
                  <p className="mt-1 text-xs text-low">
                    {plan.orderQuota} orders · {formatPaise(plan.perOrderFee)}/extra
                  </p>
                  <ul className="mt-3 flex flex-1 flex-col gap-1.5">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-mid">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-jade-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4"
                    variant={current ? 'secondary' : 'primary'}
                    loading={paying === plan.code}
                    icon={<Wallet className="size-4" />}
                    onClick={() => buy(plan.code)}
                  >
                    {current ? 'Renew' : sub?.status === 'trial' ? 'Subscribe' : 'Switch'}
                  </Button>
                </Card>
              );
            })}
        </div>

        <button
          onClick={() => setCustomOpen(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-dashed border-gold-400/40 p-4 text-left transition-colors hover:bg-gold-400/5"
        >
          <MessageSquarePlus className="size-5 text-gold-400" />
          <span>
            <span className="block text-sm font-medium text-hi">Need a custom plan?</span>
            <span className="text-xs text-mid">High volume, special quotas, negotiated pricing — tell us your numbers.</span>
          </span>
        </button>
      </div>

      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="Request a custom plan">
        <div className="flex flex-col gap-4">
          <Field label="Expected orders / month">
            <Input inputMode="numeric" placeholder="2000" value={expectedOrders} onChange={(e) => setExpectedOrders(e.target.value)} />
          </Field>
          <Field label="What do you need?">
            <Textarea
              rows={4}
              placeholder="We do ~2000 orders/month across two Instagram pages and need multi-page support…"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </Field>
          <Button onClick={sendCustomRequest} disabled={customMsg.length < 10}>
            Send request
          </Button>
        </div>
      </Modal>
    </>
  );
}
