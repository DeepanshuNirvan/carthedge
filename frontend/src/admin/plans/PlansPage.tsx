import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { Plan } from '@/api/types';
import { useAdminPlanMutations, useAdminPlans } from '@/api/admin';
import { toast } from '@/store/ui';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { PageHeader } from '@/app/shell/PageHeader';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Input';
import { Switch } from '@/ui/Switch';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';

type PlanFormState = {
  code: string;
  name: string;
  priceMonthly: string;
  orderQuota: string;
  perOrderFee: string;
  features: string;
  isCustom: boolean;
  active: boolean;
};

const empty: PlanFormState = {
  code: '',
  name: '',
  priceMonthly: '',
  orderQuota: '',
  perOrderFee: '',
  features: '',
  isCustom: false,
  active: true,
};

export default function PlansPage() {
  const { data: plans, isLoading } = useAdminPlans();
  const { create, update } = useAdminPlanMutations();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(empty);

  const openFor = (plan: Plan | null) => {
    setEditing(plan);
    setForm(
      plan
        ? {
            code: plan.code,
            name: plan.name,
            priceMonthly: paiseToRupees(plan.priceMonthly),
            orderQuota: String(plan.orderQuota),
            perOrderFee: paiseToRupees(plan.perOrderFee),
            features: plan.features.join('\n'),
            isCustom: plan.isCustom,
            active: plan.active ?? true,
          }
        : empty,
    );
    setOpen(true);
  };

  const submit = () => {
    const price = rupeesToPaise(form.priceMonthly);
    const fee = rupeesToPaise(form.perOrderFee) ?? 0;
    if (!form.code || !form.name || price === null) {
      toast('error', 'Code, name and price are required');
      return;
    }
    const input = {
      code: form.code,
      name: form.name,
      priceMonthly: price,
      orderQuota: Number(form.orderQuota) || 0,
      perOrderFee: fee,
      features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      isCustom: form.isCustom,
      active: form.active,
    };
    const done = () => {
      toast('success', editing ? 'Plan updated' : 'Plan created');
      setOpen(false);
    };
    if (editing) {
      update.mutate({ id: editing.id, input }, { onSuccess: done, onError: (e) => toast('error', 'Save failed', e.message) });
    } else {
      create.mutate(input, { onSuccess: done, onError: (e) => toast('error', 'Create failed', e.message) });
    }
  };

  return (
    <>
      <PageHeader
        title="Plans"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => openFor(null)}>
            New plan
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th className="text-right">Price / mo</Th>
              <Th className="text-right">Quota</Th>
              <Th className="text-right">Per-order fee</Th>
              <Th>Flags</Th>
              <Th className="text-right">Active subs</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {plans?.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <p className="font-medium text-hi">{p.name}</p>
                  <p className="font-mono text-xs text-low">{p.code}</p>
                </Td>
                <Td className="text-right">
                  <MoneyText paise={p.priceMonthly} />
                </Td>
                <Td className="text-right tnum">{p.orderQuota}</Td>
                <Td className="text-right">
                  <MoneyText paise={p.perOrderFee} />
                </Td>
                <Td>
                  <span className="flex gap-1.5">
                    {p.isCustom && <Badge tone="gold">custom</Badge>}
                    {p.active === false && <Badge tone="danger">inactive</Badge>}
                  </span>
                </Td>
                <Td className="text-right tnum">{p.activeSubscriptions ?? '—'}</Td>
                <Td className="text-right">
                  <IconButton label={`Edit ${p.name}`} onClick={() => openFor(p)}>
                    <Pencil className="size-4" />
                  </IconButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : 'New plan'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input value={form.code} disabled={!!editing} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Price ₹/month">
            <Input inputMode="decimal" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order quota">
              <Input inputMode="numeric" value={form.orderQuota} onChange={(e) => setForm({ ...form, orderQuota: e.target.value })} />
            </Field>
            <Field label="Fee ₹/extra">
              <Input inputMode="decimal" value={form.perOrderFee} onChange={(e) => setForm({ ...form, perOrderFee: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Features" hint="One per line — shown on the pricing page">
              <Textarea rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </Field>
          </div>
          <span className="flex items-center gap-2.5 text-sm text-hi">
            <Switch checked={form.isCustom} onChange={(isCustom) => setForm({ ...form, isCustom })} label="Custom plan" />
            Custom (hidden from pricing)
          </span>
          <span className="flex items-center gap-2.5 text-sm text-hi">
            <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Active" />
            Active
          </span>
        </div>
        <Button className="mt-5" onClick={submit} loading={create.isPending || update.isPending}>
          {editing ? 'Save plan' : 'Create plan'}
        </Button>
      </Modal>
    </>
  );
}
