import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Eye } from 'lucide-react';
import { impersonate, useAdminBusiness, useAdminBusinessMutations, useAdminPlans } from '@/api/admin';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/date';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { StatusChip } from '@/ui/Badge';
import { MoneyText } from '@/ui/MoneyText';
import { SkeletonRows } from '@/ui/Skeleton';
import { Modal } from '@/ui/Modal';

const auditLabels: Record<string, string> = {
  viewAsSeller: 'Opened a support view',
  setStatus: 'Changed account status',
  assignPlan: 'Assigned a plan',
};

/**
 * Opens the seller's app read-only in a new tab for 30 minutes. The tab is
 * opened on the click itself so pop-up blockers allow it, then pointed at the
 * session once the server has issued it.
 */
async function viewAsSeller(id: string) {
  const tab = window.open('', '_blank');
  if (!tab) {
    toast('error', 'Pop-up blocked', 'Allow pop-ups for this site to open the support view.');
    return;
  }
  tab.opener = null;
  try {
    const session = await impersonate(id);
    const bytes = new TextEncoder().encode(JSON.stringify(session));
    const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    tab.location.href = `/app#support=${encoded}`;
  } catch (e) {
    tab.close();
    toast('error', 'Could not open the support view', e instanceof Error ? e.message : undefined);
  }
}

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
  const { business, subscription, usage, aiUsage, audit } = data;
  // a deleted account in its 30-day grace can be restored the same way as a suspended one
  const suspended = business.status === 'suspended' || business.status === 'deleted';
  const purged = business.status === 'purged';

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
      <Link to="/admin/businesses" className="-mt-3 mb-1 inline-flex items-center gap-1.5 py-3 text-sm text-mid hover:text-hi">
        <ArrowLeft className="size-4" /> All businesses
      </Link>
      <PageHeader
        title={business.name}
        subtitle={`/${business.code} · joined ${formatDate(business.createdAt)}`}
        actions={
          purged ? null : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Eye className="size-4" />} onClick={() => id && viewAsSeller(id)}>
                View as seller
              </Button>
              {suspended ? (
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
                  {business.status === 'deleted' ? 'Restore account' : 'Reactivate'}
                </Button>
              ) : (
                <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setConfirmSuspend(true)}>
                  Suspend
                </Button>
              )}
            </div>
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

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-hi">AI use, last 30 days</h2>
          {aiUsage && aiUsage.totals.calls > 0 ? (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-low">Model calls</dt>
                <dd className="font-display text-xl font-semibold tnum text-hi">{aiUsage.totals.calls}</dd>
              </div>
              <div>
                <dt className="text-xs text-low">Estimated cost</dt>
                <dd className="font-display text-xl font-semibold text-hi">
                  <MoneyText paise={aiUsage.totals.cost} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-low">Tokens in / out</dt>
                <dd className="text-sm tnum text-mid">
                  {aiUsage.totals.inputTokens.toLocaleString('en-IN')} / {aiUsage.totals.outputTokens.toLocaleString('en-IN')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-low">No AI use in the last 30 days.</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold text-hi">Staff actions</h2>
          {audit && audit.length > 0 ? (
            <ul className="flex flex-col divide-y text-sm">
              {audit.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
                  <span className="text-hi">
                    {auditLabels[a.action] ?? a.action}
                    {typeof a.detail?.status === 'string' && <span className="text-mid">: {a.detail.status}</span>}
                    {typeof a.detail?.planCode === 'string' && <span className="text-mid">: {a.detail.planCode}</span>}
                  </span>
                  <span className="text-xs text-low">
                    {[a.adminEmail, formatDateTime(a.createdAt)].filter(Boolean).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-low">No staff actions on this account yet.</p>
          )}
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
