import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Lock, Plus } from 'lucide-react';
import { useOfferMutations, useOffers } from '@/api/products';
import { useCan } from '@/api/plans';
import { capabilityLabels } from '@/strings/capabilities';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { Card, CardHeader } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { Switch } from '@/ui/Switch';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { EmptyState } from '@/ui/EmptyState';
import { SkeletonRows } from '@/ui/Skeleton';

export function OffersPanel() {
  const canOffers = useCan('offers');
  if (!canOffers.isLoading && !canOffers.allowed) {
    return (
      <Card>
        <CardHeader title="Offers" subtitle={capabilityLabels.offers.blurb} />
        <div className="flex flex-wrap items-center gap-3 p-5 pt-4">
          <Lock className="size-4 shrink-0 text-gold-ink" aria-hidden />
          <p className="flex-1 text-sm text-mid">Discount codes and reseller pricing are not on your plan.</p>
          <Link to="/app/billing" className="text-sm font-medium text-jade-ink hover:underline">
            See plans
          </Link>
        </div>
      </Card>
    );
  }
  return <OffersList />;
}

function OffersList() {
  const { data: offers, isLoading } = useOffers();
  const { create, setActive } = useOfferMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', kind: 'percent' as 'percent' | 'flat', value: '', minAmount: '', expiresAt: '' });

  const submit = () => {
    const value = form.kind === 'percent' ? Number(form.value) : (rupeesToPaise(form.value) ?? 0);
    if (!form.code || !value) {
      toast('error', 'Offer needs a code and a value');
      return;
    }
    create.mutate(
      {
        code: form.code.toUpperCase(),
        kind: form.kind,
        value,
        minAmount: rupeesToPaise(form.minAmount) ?? 0,
        active: true,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast('success', 'Offer live', `Buyers can use ${form.code.toUpperCase()} at checkout.`);
          setOpen(false);
          setForm({ code: '', kind: 'percent', value: '', minAmount: '', expiresAt: '' });
        },
        onError: (e) => toast('error', 'Could not create offer', e.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader
        title="Offers"
        subtitle="Discount codes for checkout"
        action={
          <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New offer
          </Button>
        }
      />
      <div className="p-5 pt-4">
        {isLoading ? (
          <SkeletonRows rows={2} />
        ) : offers && offers.length > 0 ? (
          <ul className="divide-y">
            {offers.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-hi">{o.code}</p>
                  <p className="text-xs text-mid">
                    {o.kind === 'percent' ? `${o.value}% off` : <>flat <MoneyText paise={o.value} /> off</>}
                    {o.minAmount > 0 && <> · above <MoneyText paise={o.minAmount} /></>}
                    {o.expiresAt && <> · till {formatDate(o.expiresAt)}</>}
                  </p>
                </div>
                <Switch
                  checked={o.active}
                  label={`Toggle ${o.code}`}
                  onChange={(active) => setActive.mutate({ id: o.id, active })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<BadgePercent className="size-5" />}
            title="No offers yet"
            message="A first-order code like WELCOME10 nudges hesitant buyers."
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New offer">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'percent' | 'flat' })}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </Select>
          </Field>
          <Field label={form.kind === 'percent' ? 'Percent' : 'Amount ₹'}>
            <Input inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
          <Field label="Min order ₹" optional>
            <Input inputMode="decimal" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
          </Field>
          <Field label="Expires" optional>
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </Field>
        </div>
        <Button className="mt-5" onClick={submit} loading={create.isPending}>
          Create offer
        </Button>
      </Modal>
    </Card>
  );
}
