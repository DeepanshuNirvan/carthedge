import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Offer } from '@/api/types';
import { useOfferMutations, useOffers } from '@/api/products';
import { useCan } from '@/api/plans';
import { capabilityLabels } from '@/strings/capabilities';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { Card, CardHeader } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
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

type OfferForm = {
  code: string;
  kind: 'percent' | 'flat';
  value: string;
  minAmount: string;
  maxDiscount: string;
  maxUses: string;
  maxPerCustomer: string;
  firstOrderOnly: boolean;
  expiresAt: string;
  active: boolean;
};

const blankForm: OfferForm = {
  code: '',
  kind: 'percent',
  value: '',
  minAmount: '',
  maxDiscount: '',
  maxUses: '',
  maxPerCustomer: '',
  firstOrderOnly: false,
  expiresAt: '',
  active: true,
};

const rupeeText = (paise?: number) => (paise ? String(paise / 100) : '');

function formOf(o: Offer): OfferForm {
  return {
    code: o.code,
    kind: o.kind,
    value: o.kind === 'percent' ? String(o.value) : rupeeText(o.value),
    minAmount: rupeeText(o.minAmount),
    maxDiscount: rupeeText(o.maxDiscount),
    maxUses: o.maxUses ? String(o.maxUses) : '',
    maxPerCustomer: o.maxPerCustomer ? String(o.maxPerCustomer) : '',
    firstOrderOnly: !!o.firstOrderOnly,
    expiresAt: o.expiresAt ? o.expiresAt.slice(0, 10) : '',
    active: o.active,
  };
}

/** How the offer reads to a seller scanning the list. */
function terms(o: Offer) {
  const parts: ReactNode[] = [o.kind === 'percent' ? `${o.value}% off` : <>Flat <MoneyText paise={o.value} /> off</>];
  if (o.kind === 'percent' && o.maxDiscount) parts.push(<>up to <MoneyText paise={o.maxDiscount} /></>);
  if (o.minAmount > 0) parts.push(<>above <MoneyText paise={o.minAmount} /></>);
  if (o.firstOrderOnly) parts.push('first order only');
  if (o.maxPerCustomer) parts.push(`${o.maxPerCustomer} per buyer`);
  if (o.expiresAt) parts.push(`till ${formatDate(o.expiresAt)}`);
  return parts.map((p, i) => (
    <span key={i}>
      {i > 0 && ', '}
      {p}
    </span>
  ));
}

function OffersList() {
  const { data: offers, isLoading } = useOffers();
  const { create, update, remove, setActive } = useOfferMutations();
  const [editing, setEditing] = useState<Offer | 'new' | null>(null);
  const [form, setForm] = useState<OfferForm>(blankForm);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const set = (patch: Partial<OfferForm>) => setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setForm(blankForm);
    setEditing('new');
  };
  const openEdit = (o: Offer) => {
    setForm(formOf(o));
    setEditing(o);
  };

  const submit = () => {
    const value = form.kind === 'percent' ? Number(form.value) : (rupeesToPaise(form.value) ?? 0);
    if (!form.code.trim() || !value) {
      toast('error', 'Offer needs a code and a value');
      return;
    }
    const input = {
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      value,
      minAmount: rupeesToPaise(form.minAmount) ?? 0,
      maxDiscount: form.kind === 'percent' ? (rupeesToPaise(form.maxDiscount) ?? 0) : 0,
      maxUses: Number(form.maxUses) || 0,
      maxPerCustomer: Number(form.maxPerCustomer) || 0,
      firstOrderOnly: form.firstOrderOnly,
      active: form.active,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined,
    };
    const done = {
      onSuccess: () => {
        toast('success', editing === 'new' ? 'Offer live' : 'Offer updated', `Buyers can use ${input.code} at checkout.`);
        setEditing(null);
      },
      onError: (e: Error) => toast('error', 'Could not save offer', e.message),
    };
    if (editing === 'new') create.mutate(input, done);
    else if (editing) update.mutate({ id: editing.id, input }, done);
  };

  return (
    <Card>
      <CardHeader
        title="Offers"
        subtitle="Coupon codes buyers enter at checkout"
        action={
          <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={openNew}>
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
                  <p className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-hi">{o.code}</span>
                    <span className="text-xs text-low tnum">
                      {o.maxUses ? `${o.uses ?? 0} of ${o.maxUses} used` : `${o.uses ?? 0} used`}
                    </span>
                  </p>
                  <p className="text-xs text-mid">{terms(o)}</p>
                </div>
                <IconButton label={`Edit ${o.code}`} onClick={() => openEdit(o)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton label={`Delete ${o.code}`} onClick={() => setDeleting(o)}>
                  <Trash2 className="size-4" />
                </IconButton>
                <Switch checked={o.active} label={`Toggle ${o.code}`} onChange={(active) => setActive.mutate({ id: o.id, active })} />
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New offer' : `Edit ${form.code}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input placeholder="WELCOME10" maxLength={30} value={form.code} onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => set({ kind: e.target.value as OfferForm['kind'] })}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </Select>
          </Field>
          <Field label={form.kind === 'percent' ? 'Percent' : 'Amount ₹'}>
            <Input inputMode="decimal" value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
          {form.kind === 'percent' ? (
            <Field label="Up to ₹" optional hint="Largest discount one order can get">
              <Input inputMode="decimal" value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
            </Field>
          ) : (
            <div className="max-sm:hidden" />
          )}
          <Field label="Min order ₹" optional>
            <Input inputMode="decimal" value={form.minAmount} onChange={(e) => set({ minAmount: e.target.value })} />
          </Field>
          <Field label="Expires" optional>
            <Input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
          </Field>
          <Field label="Total uses" optional hint="Stops after this many orders">
            <Input inputMode="numeric" value={form.maxUses} onChange={(e) => set({ maxUses: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Uses per buyer" optional>
            <Input inputMode="numeric" value={form.maxPerCustomer} onChange={(e) => set({ maxPerCustomer: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <span className="flex items-center gap-2.5 text-sm text-hi sm:col-span-2">
            <Switch checked={form.firstOrderOnly} onChange={(firstOrderOnly) => set({ firstOrderOnly })} label="First order only" />
            Only for a buyer&apos;s first order
          </span>
        </div>
        <p className="mt-3 text-xs text-low">A cancelled order gives its use back.</p>
        <Button className="mt-5" onClick={submit} loading={create.isPending || update.isPending}>
          {editing === 'new' ? 'Create offer' : 'Save offer'}
        </Button>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete offer">
        <p className="text-sm text-mid">
          Delete <span className="font-mono font-semibold text-hi">{deleting?.code}</span>? Orders that used it keep their discount.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  toast('success', 'Offer deleted');
                  setDeleting(null);
                },
                onError: (e) => toast('error', 'Could not delete', e.message),
              })
            }
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
