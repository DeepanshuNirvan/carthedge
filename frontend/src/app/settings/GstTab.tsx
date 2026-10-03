import { useState } from 'react';
import { useBusiness, useUpdateBusiness, useUpdateSettings } from '@/api/business';
import { gstRates, type GstProfile } from '@/api/types';
import { toast } from '@/store/ui';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { SkeletonRows } from '@/ui/Skeleton';
import { useDraft } from './form';

const gstinShape = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Financial year as on an invoice number: "2627" for 2026-27. */
function fyShort(d = new Date()) {
  const y = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}

/**
 * The seller's tax identity on invoices. Prices stay GST-inclusive: each
 * invoice takes the tax out line by line, CGST + SGST inside the seller's
 * state and IGST across states.
 */
export function GstTab() {
  const { data: business, isLoading } = useBusiness();
  const save = useUpdateSettings('gst');
  const saveBusiness = useUpdateBusiness();
  const { draft, update, saved } = useDraft<GstProfile>(business?.gst);
  const [gstin, setGstin] = useState<string | null>(null);

  if (isLoading || !business || !draft) return <SkeletonRows rows={5} />;
  const gstinValue = (gstin ?? business.gstin).toUpperCase().trim();
  const gstinError = gstinValue && !gstinShape.test(gstinValue) ? '15 characters, as on your GST certificate' : '';
  const registration = draft.registration || (gstinValue ? 'regular' : 'unregistered');
  const prefix = draft.prefix || business.code.split('-').map((p) => p[0]?.toUpperCase()).join('').slice(0, 4) || 'INV';

  const onSave = async () => {
    if (gstinError) return;
    try {
      if (gstinValue !== business.gstin) await saveBusiness.mutateAsync({ gstin: gstinValue });
      await save.mutateAsync({ ...draft, registration: draft.registration });
      saved();
      setGstin(null);
      toast('success', 'GST details saved', 'New invoices use them.');
    } catch (e) {
      toast('error', 'Could not save', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="GST details" subtitle="Printed on every invoice you create from an order" />
        <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="GST registration">
              <Select value={draft.registration} onChange={(e) => update({ registration: e.target.value as GstProfile['registration'] })}>
                <option value="">{gstinValue ? 'Regular (I have a GSTIN)' : 'Not registered'}</option>
                <option value="regular">Regular taxpayer — tax invoices</option>
                <option value="composition">Composition scheme — bill of supply</option>
                <option value="unregistered">Not registered — plain invoices, no GST</option>
              </Select>
            </Field>
          </div>
          <Field label="GSTIN" error={gstinError} optional={registration === 'unregistered'}>
            <Input value={gstinValue} maxLength={15} placeholder="08ABCDE1234F1Z5" onChange={(e) => setGstin(e.target.value)} />
          </Field>
          <Field label="Legal name" optional hint="If it differs from your store name">
            <Input maxLength={300} value={draft.legalName} onChange={(e) => update({ legalName: e.target.value })} />
          </Field>
          <Field label="Usual GST rate" hint="Products can override it in their own form">
            <Select
              value={draft.defaultRate === null ? '' : String(draft.defaultRate)}
              disabled={registration !== 'regular'}
              onChange={(e) => update({ defaultRate: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">Ask on each invoice</option>
              {gstRates.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Usual HSN code" optional hint="4, 6 or 8 digits — e.g. 6204 for women's garments">
            <Input inputMode="numeric" maxLength={8} value={draft.defaultHsn} onChange={(e) => update({ defaultHsn: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Invoice prefix" hint={`Next invoice looks like ${prefix}/${fyShort()}/0001 — numbering restarts each April`}>
            <Input maxLength={4} value={draft.prefix} placeholder={prefix} onChange={(e) => update({ prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note under every invoice" optional>
              <Textarea rows={2} maxLength={300} placeholder="Goods once sold can be exchanged as per our return policy." value={draft.note} onChange={(e) => update({ note: e.target.value })} />
            </Field>
          </div>
          <Button className="sm:justify-self-start" loading={save.isPending || saveBusiness.isPending} disabled={!!gstinError} onClick={onSave}>
            Save GST details
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="How invoices work out tax" />
        <div className="flex flex-col gap-3 p-5 pt-4 text-[13px] leading-relaxed text-mid">
          <p>Your prices include GST. Each invoice takes the tax out of what the buyer paid, line by line, at the product’s rate.</p>
          <p>
            Buyer in your state: CGST and SGST, half each. Another state: IGST. The state comes from the delivery address;
            you can change it on the invoice if the address is unclear.
          </p>
          <p>Shipping and COD charges are taxed at the rate of the goods they come with. Discounts reduce the taxable value of each line.</p>
          <p>Business buyers can add their GSTIN at checkout, and you can add or correct it when you create the invoice.</p>
          <p>When you refund an invoiced order, a credit note is issued automatically against that invoice.</p>
          {registration === 'composition' && (
            <p className="rounded-lg bg-gold-400/10 p-3 text-gold-ink">
              On the composition scheme you issue bills of supply and cannot collect GST from buyers.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
