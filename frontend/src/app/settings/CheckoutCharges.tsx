import { Lock } from 'lucide-react';
import { useBusiness, useUpdateBusiness, useUpdateSettings } from '@/api/business';
import { useCan } from '@/api/plans';
import type { CheckoutRules } from '@/api/types';
import { toast } from '@/store/ui';
import { formatPaise } from '@/lib/money';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Select } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { NumberField, RupeeField, ToggleRow, useDraft } from './form';

type Draft = CheckoutRules & { freeShippingAbove: number; codMaxOrder: number };

/** One line, the way the buyer will read the charge. */
function describe(kind: string, value: number, max: number, floor: number, what: 'fee' | 'discount') {
  if (!kind || !value) return what === 'fee' ? 'No COD charge' : 'No online-payment discount';
  const amount = kind === 'percent' ? `${value}%${max ? ` (up to ${formatPaise(max)})` : ''}` : formatPaise(value);
  if (what === 'fee') return `${amount} extra on cash on delivery${floor ? `, free above ${formatPaise(floor)}` : ''}`;
  return `${amount} off when paying online${floor ? ` on orders above ${formatPaise(floor)}` : ''}`;
}

/**
 * The checkout levers: free delivery above an amount, a COD charge, a
 * prepaid discount, a COD ceiling and the abandoned-cart reminder. The
 * server prices every order with these; checkout shows the same numbers.
 */
export function CheckoutCharges() {
  const { data: business } = useBusiness();
  const saveRules = useUpdateSettings('checkout');
  const savePolicies = useUpdateSettings('policies');
  const saveBusiness = useUpdateBusiness();
  const canRecover = useCan('recovery');
  const source: Draft | undefined = business && {
    ...business.checkout,
    freeShippingAbove: business.freeShippingAbove,
    codMaxOrder: business.policies.codMaxOrder,
  };
  const { draft, update, saved } = useDraft<Draft>(source);
  if (!business || !draft) return null;
  const fee = draft.codFee;
  const disc = draft.prepaidDiscount;
  const busy = saveRules.isPending || savePolicies.isPending || saveBusiness.isPending;

  const onSave = async () => {
    try {
      const { freeShippingAbove, codMaxOrder, ...rules } = draft;
      await saveRules.mutateAsync(rules);
      if (codMaxOrder !== business.policies.codMaxOrder) await savePolicies.mutateAsync({ ...business.policies, codMaxOrder });
      if (freeShippingAbove !== business.freeShippingAbove) await saveBusiness.mutateAsync({ freeShippingAbove });
      saved();
      toast('success', 'Checkout charges saved', 'New orders are priced with them from now.');
    } catch (e) {
      toast('error', 'Could not save', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Card>
      <CardHeader title="Checkout charges and discounts" subtitle="Applied by the server to every order, shown to buyers before they pay" />
      <div className="flex flex-col gap-6 p-5 pt-4">
        <RupeeField
          label="Free delivery on orders above"
          hint="Leave empty to always charge the shipping fee"
          value={draft.freeShippingAbove}
          optional
          onChange={(freeShippingAbove) => update({ freeShippingAbove })}
        />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-[13px] font-medium text-hi">Cash on delivery charge</legend>
          <Field label="Charge">
            <Select value={fee.kind} onChange={(e) => update({ codFee: { ...fee, kind: e.target.value as Draft['codFee']['kind'] } })}>
              <option value="">No charge</option>
              <option value="flat">Fixed amount</option>
              <option value="percent">Percent of the order</option>
            </Select>
          </Field>
          {fee.kind === 'flat' && <RupeeField label="Amount" value={fee.value} onChange={(value) => update({ codFee: { ...fee, value } })} />}
          {fee.kind === 'percent' && (
            <NumberField label="Percent" value={fee.value} max={50} onChange={(value) => update({ codFee: { ...fee, value } })} />
          )}
          {fee.kind === 'percent' && (
            <RupeeField label="At most" optional value={fee.max} onChange={(max) => update({ codFee: { ...fee, max } })} />
          )}
          {fee.kind && (
            <RupeeField label="Free on orders above" optional value={fee.freeAbove} onChange={(freeAbove) => update({ codFee: { ...fee, freeAbove } })} />
          )}
          <p className="text-xs text-low sm:col-span-2">{describe(fee.kind, fee.value, fee.max, fee.freeAbove, 'fee')}</p>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-[13px] font-medium text-hi">Discount for paying online</legend>
          <Field label="Discount">
            <Select value={disc.kind} onChange={(e) => update({ prepaidDiscount: { ...disc, kind: e.target.value as Draft['prepaidDiscount']['kind'] } })}>
              <option value="">No discount</option>
              <option value="flat">Fixed amount off</option>
              <option value="percent">Percent off</option>
            </Select>
          </Field>
          {disc.kind === 'flat' && <RupeeField label="Amount off" value={disc.value} onChange={(value) => update({ prepaidDiscount: { ...disc, value } })} />}
          {disc.kind === 'percent' && (
            <NumberField label="Percent off" value={disc.value} max={50} onChange={(value) => update({ prepaidDiscount: { ...disc, value } })} />
          )}
          {disc.kind === 'percent' && (
            <RupeeField label="At most" optional value={disc.max} onChange={(max) => update({ prepaidDiscount: { ...disc, max } })} />
          )}
          {disc.kind && (
            <RupeeField label="On orders above" optional value={disc.minOrder} onChange={(minOrder) => update({ prepaidDiscount: { ...disc, minOrder } })} />
          )}
          <p className="text-xs text-low sm:col-span-2">{describe(disc.kind, disc.value, disc.max, disc.minOrder, 'discount')}</p>
        </fieldset>

        <RupeeField
          label="Cash on delivery only up to"
          hint="Bigger orders must be paid online. Leave empty for no limit."
          value={draft.codMaxOrder}
          optional
          onChange={(codMaxOrder) => update({ codMaxOrder })}
        />

        <ToggleRow
          checked={draft.recovery !== false}
          onChange={(recovery) => update({ recovery })}
          title="Remind buyers who did not finish checkout"
          disabled={!canRecover.allowed}
        >
          One WhatsApp message from your own number, an hour after a buyer verified their number but did not order. At most
          once a week per buyer. Starts once your WhatsApp is connected; until then, nudge them from Orders.
        </ToggleRow>
        {!canRecover.allowed && !canRecover.isLoading && (
          <p className="-mt-3 flex items-center gap-2 text-xs text-low">
            <Lock className="size-3.5" /> Checkout reminders come with the Growth and Pro plans.
          </p>
        )}

        <Button className="self-start" loading={busy} onClick={onSave}>
          Save charges
        </Button>
      </div>
    </Card>
  );
}
