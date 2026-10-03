import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/api/business';
import { useCreateInvoice } from '@/api/invoices';
import { gstRates, type Invoice, type Order } from '@/api/types';
import { toast } from '@/store/ui';
import { Button } from '@/ui/Button';
import { buttonLink } from '@/ui/buttonLink';
import { Field, Input, Select } from '@/ui/Input';
import { Modal } from '@/ui/Modal';

// GST state codes (CBIC list), for the place-of-supply override
export const gstStates: [string, string][] = [
  ['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'],
  ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'],
  ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'], ['26', 'Dadra and Nagar Haveli and Daman and Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'],
  ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman and Nicobar Islands'],
  ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
];

const gstinShape = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * Create the invoice for an order. The server works out the tax from the
 * products and the delivery address; the seller can correct the state, add a
 * business buyer's GSTIN or charge one rate on every line.
 */
export function InvoiceDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { data: business } = useBusiness();
  const create = useCreateInvoice();
  const [pos, setPos] = useState('');
  const [gstin, setGstin] = useState(order.buyerGstin ?? '');
  const [name, setName] = useState(order.buyerCompany ?? '');
  const [rate, setRate] = useState('');
  const [created, setCreated] = useState<Invoice | null>(null);
  const registered = !!business?.gstin && (business.gst.registration === '' || business.gst.registration === 'regular');
  const gstinUpper = gstin.trim().toUpperCase();
  const gstinError = gstinUpper && !gstinShape.test(gstinUpper) ? 'Check the 15-character GSTIN' : '';

  const submit = () =>
    create.mutate(
      {
        orderId: order.id,
        placeOfSupply: pos || undefined,
        buyerGstin: gstinUpper || undefined,
        buyerName: name.trim() || undefined,
        gstRate: rate === '' ? undefined : Number(rate),
      },
      {
        onSuccess: (inv) => {
          setCreated(inv);
          toast('success', `Invoice ${inv.invoiceNumber} created`);
        },
        onError: (e) => toast('error', 'Invoice not created', e.message),
      },
    );

  return (
    <Modal open={open} onClose={onClose} title={created ? 'Invoice created' : 'Create invoice'}>
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-mid">
            <span className="font-mono font-semibold text-hi">{created.invoiceNumber}</span> is ready to print or share.
          </p>
          <div className="flex gap-3">
            <Link to={`/app/invoices?open=${created.id}`} className={buttonLink('primary')}>
              Open invoice
            </Link>
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!registered && (
            <p className="rounded-lg bg-[rgb(var(--field)/0.05)] p-3 text-xs leading-relaxed text-mid hairline">
              {business?.gst.registration === 'composition'
                ? 'You are on the composition scheme, so this will be a bill of supply without tax.'
                : 'No GSTIN on your account, so this will be a plain invoice without GST. Add it under Settings → GST.'}
            </p>
          )}
          <Field label="Buyer's state (place of supply)" hint="Leave as is to use the delivery address">
            <Select value={pos} onChange={(e) => setPos(e.target.value)}>
              <option value="">From the address: {order.address.state || order.address.pincode}</option>
              {gstStates.map(([code, label]) => (
                <option key={code} value={code}>
                  {code} - {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buyer GSTIN" optional error={gstinError} hint="For a business buyer claiming input credit">
              <Input value={gstin} maxLength={15} onChange={(e) => setGstin(e.target.value)} />
            </Field>
            <Field label="Buyer's business name" optional>
              <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          {registered && (
            <Field label="GST rate" hint="Each product's own rate unless you pick one for every line">
              <Select value={rate} onChange={(e) => setRate(e.target.value)}>
                <option value="">Each product's rate</option>
                {gstRates.map((r) => (
                  <option key={r} value={r}>
                    {r}% on every line
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Button className="self-start" loading={create.isPending} disabled={!!gstinError} onClick={submit}>
            Create invoice
          </Button>
        </div>
      )}
    </Modal>
  );
}
