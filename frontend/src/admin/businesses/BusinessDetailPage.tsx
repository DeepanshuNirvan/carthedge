import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2 } from 'lucide-react';
import { useAdminBusiness, useAdminBusinessMutations, useAdminPlans } from '@/api/admin';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { StatusChip } from '@/ui/Badge';
import { MoneyText } from '@/ui/MoneyText';
import { SkeletonRows } from '@/ui/Skeleton';
import { Modal } from '@/ui/Modal';

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdminBusiness(id);
  const plans = useAdminPlans().data?.plans;
  const { setStatus, assignPlan } = useAdminBusinessMutations();
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [planCode, setPlanCode] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [extendDays, setExtendDays] = useState('30');

  if (isLoading || !data) {
    return <SkeletonRows rows={6} />;
  }
  const { business, subscription, usage } = data;
  const suspended = business.status === 'suspended';

  const doAssign = () => {
    if (!planCode || !id) {
      toast('error', 'Pick a plan');
      return;
    }
    assignPlan.mutate(
      {
        id,
        planCode,
        customPrice: customPrice ? (rupeesToPaise(customPrice) ?? undefined) : undefined,
        extendDays: Number(extendDays) || 30,
      },
      {
        onSuccess: () => toast('success', 'Plan assigned', `${planCode} for ${extendDays} days.`),
        onError: (e) => toast('error', 'Assign failed', e.message),
      },
    );
  };

  return (
    <>
      <Link to="/admin/businesses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mid hover:text-hi">
        <ArrowLeft className="size-4" /> All businesses
      </Link>
      <PageHeader
        title={business.name}
        subtitle={`/${business.code} · joined ${formatDate(business.createdAt)}`}
        actions={
          suspended ? (
            <Button
              icon={<CheckCircle2 className="size-4" />}
              loading={setStatus.isPending}
              onClick={() =>
                id &&
                setStatus.mutate(
                  { id, status: 'active' },
                  { onSuccess: () => toast('success', 'Business reactivated', 'Their store is live again.') },
                )
              }
            >
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setConfirmSuspend(true)}>
              Suspend
            </Button>
          )
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center justify-between font-display text-base font-semibold text-hi">
            Profile <StatusChip status={business.status} />
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            {[
              ['Owner', business.ownerName],
              ['Email', business.email],
              ['Phone', business.phone],
              ['WhatsApp', business.whatsapp],
              ['Instagram', business.instagram],
              ['City', [business.city, business.state].filter(Boolean).join(', ')],
              ['GSTIN', business.gstin],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-low">{label}</dt>
                <dd className="truncate text-right text-mid">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-hi">Usage</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-low">Total orders</dt>
              <dd className="font-display text-xl font-semibold tnum text-hi">{usage.ordersTotal}</dd>
            </div>
            <div>
              <dt className="text-xs text-low">GMV</dt>
              <dd className="font-display text-xl font-semibold text-hi">
                <MoneyText paise={usage.gmv} compact />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-low">Orders (30d)</dt>
              <dd className="font-display text-xl font-semibold tnum text-hi">{usage.ordersLast30Days}</dd>
            </div>
            <div>
              <dt className="text-xs text-low">Products</dt>
              <dd className="font-display text-xl font-semibold tnum text-hi">{usage.products}</dd>
            </div>
            <div>
              <dt className="text-xs text-low">Customers</dt>
              <dd className="font-display text-xl font-semibold tnum text-hi">{usage.customers}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Subscription" />
          <div className="flex flex-col gap-4 p-5 pt-3">
            {subscription ? (
              <p className="text-sm text-mid">
                <span className="font-medium text-hi">{subscription.planName}</span>{' '}
                <StatusChip status={subscription.status} className="ml-1" /> · ends {formatDate(subscription.endsAt)}
                {subscription.customPrice !== undefined && (
                  <>
                    {' '}
                    · custom <MoneyText paise={subscription.customPrice} />
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-low">No subscription.</p>
            )}
            <div className="grid gap-3 border-t pt-4">
              <Field label="Assign plan">
                <Select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                  <option value="">Choose plan…</option>
                  {plans?.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Custom ₹/mo" optional>
                  <Input inputMode="decimal" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
                </Field>
                <Field label="Extend days">
                  <Input inputMode="numeric" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
                </Field>
              </div>
              <Button onClick={doAssign} loading={assignPlan.isPending}>
                Assign plan
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={confirmSuspend} onClose={() => setConfirmSuspend(false)} title="Suspend business">
        <p className="text-sm leading-relaxed text-mid">
          Suspending <span className="font-medium text-hi">{business.name}</span> pauses their storefront and
          seller APIs immediately. Buyers will see the store as unavailable.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="danger"
            loading={setStatus.isPending}
            onClick={() =>
              id &&
              setStatus.mutate(
                { id, status: 'suspended' },
                {
                  onSuccess: () => {
                    toast('info', 'Business suspended');
                    setConfirmSuspend(false);
                  },
                  onError: (e) => toast('error', 'Failed', e.message),
                },
              )
            }
          >
            Suspend now
          </Button>
          <Button variant="ghost" onClick={() => setConfirmSuspend(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
