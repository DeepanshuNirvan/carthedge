import type { GstDoc } from '@/api/types';
import { formatDate } from '@/lib/date';
import { LogoMark } from '@/marketing/Wordmark';
import { MoneyText } from '@/ui/MoneyText';
import { rupeesInWords } from './InvoiceDocument';

const titles: Record<GstDoc['type'], string> = {
  tax_invoice: 'Tax invoice',
  bill_of_supply: 'Bill of supply',
  invoice: 'Invoice',
  credit_note: 'Credit note',
};

function Party({ label, p }: { label: string; p: GstDoc['seller'] }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-low">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{p.legalName || p.name}</p>
      {p.legalName && p.legalName !== p.name && <p className="text-xs text-mid">{p.name}</p>}
      {p.address && <p className="mt-0.5 max-w-[40ch] text-xs leading-relaxed text-mid">{p.address}</p>}
      {p.state && (
        <p className="text-xs text-mid">
          {p.state}
          {p.stateCode && ` (${p.stateCode})`}
        </p>
      )}
      {p.gstin && <p className="mt-1 font-mono text-[11px] text-mid">GSTIN {p.gstin}</p>}
      {p.phone && <p className="text-xs text-mid">{p.phone}</p>}
    </div>
  );
}

/**
 * A GST document exactly as the server froze it: line-wise taxable value,
 * CGST + SGST or IGST, totals, amount in words. White paper in both themes —
 * it is printed and shared as a file.
 */
export function GstDocument({ doc, number, date, logoUrl }: { doc: GstDoc; number: string; date: string; logoUrl?: string }) {
  const taxed = doc.type === 'tax_invoice' || (doc.type === 'credit_note' && doc.cgst + doc.sgst + doc.igst > 0);
  const igst = !doc.intra;
  return (
    <article data-theme="light" className="rounded-lg bg-surface p-5 text-hi shadow-raised sm:p-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-12 rounded-md object-cover" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-md bg-jade-500/12 text-lg font-semibold text-jade-ink">
              {doc.seller.name?.[0] ?? '?'}
            </span>
          )}
          <Party label="From" p={doc.seller} />
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold text-low">{titles[doc.type]}</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-jade-ink">{number}</p>
          <p className="mt-1 text-xs text-mid">{formatDate(date)}</p>
          {doc.againstInvoice && <p className="mt-1 text-xs text-mid">Against invoice {doc.againstInvoice}</p>}
        </div>
      </header>

      <div className="mt-6 grid gap-5 border-y py-4 sm:grid-cols-2">
        <Party label="Billed to" p={doc.buyer} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:justify-self-end">
          <dt className="text-low">Place of supply</dt>
          <dd className="font-medium">{doc.placeOfSupply}</dd>
          <dt className="text-low">Order</dt>
          <dd className="font-mono font-medium">{doc.orderCode}</dd>
          <dt className="text-low">Payment</dt>
          <dd className="font-medium">{doc.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'}</dd>
          {taxed && (
            <>
              <dt className="text-low">Reverse charge</dt>
              <dd className="font-medium">No</dd>
            </>
          )}
        </dl>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-[13px]">
          <thead>
            <tr className="border-b text-left text-[11px] text-low">
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 pr-2 font-medium">HSN/SAC</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 pr-2 text-right font-medium">{taxed ? 'Taxable value' : 'Amount'}</th>
              {taxed && <th className="py-2 pr-2 text-right font-medium">GST</th>}
              {taxed && !igst && <th className="py-2 pr-2 text-right font-medium">CGST</th>}
              {taxed && !igst && <th className="py-2 pr-2 text-right font-medium">SGST</th>}
              {taxed && igst && <th className="py-2 pr-2 text-right font-medium">IGST</th>}
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i} className="border-b last:border-0 align-top">
                <td className="py-2.5 pr-2 font-medium">{l.description}</td>
                <td className="py-2.5 pr-2 font-mono text-xs text-mid">{l.hsn || '-'}</td>
                <td className="py-2.5 pr-2 text-right tnum">{l.qty}</td>
                <td className="py-2.5 pr-2 text-right">
                  <MoneyText paise={l.taxable} />
                </td>
                {taxed && <td className="py-2.5 pr-2 text-right tnum">{l.rate}%</td>}
                {taxed && !igst && (
                  <td className="py-2.5 pr-2 text-right">
                    <MoneyText paise={l.cgst} />
                  </td>
                )}
                {taxed && !igst && (
                  <td className="py-2.5 pr-2 text-right">
                    <MoneyText paise={l.sgst} />
                  </td>
                )}
                {taxed && igst && (
                  <td className="py-2.5 pr-2 text-right">
                    <MoneyText paise={l.igst} />
                  </td>
                )}
                <td className="py-2.5 text-right font-medium">
                  <MoneyText paise={l.gross} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-6 border-t pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-[40ch] flex-col gap-2">
          <p className="text-xs italic leading-relaxed text-mid">{rupeesInWords(doc.total)}</p>
          {doc.discount > 0 && (
            <p className="text-xs text-low">
              Includes a discount of <MoneyText paise={doc.discount} className="text-xs" />, spread across the items.
            </p>
          )}
          {doc.type === 'bill_of_supply' && (
            <p className="text-xs text-low">Composition taxable person, not eligible to collect tax on supplies.</p>
          )}
          {doc.note && <p className="text-xs leading-relaxed text-mid">{doc.note}</p>}
        </div>
        <dl className="flex w-full flex-col gap-1.5 text-sm sm:w-64">
          {taxed && (
            <>
              <div className="flex justify-between text-mid">
                <dt>Taxable value</dt>
                <dd>
                  <MoneyText paise={doc.taxable} />
                </dd>
              </div>
              {igst ? (
                <div className="flex justify-between text-mid">
                  <dt>IGST</dt>
                  <dd>
                    <MoneyText paise={doc.igst} />
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-mid">
                    <dt>CGST</dt>
                    <dd>
                      <MoneyText paise={doc.cgst} />
                    </dd>
                  </div>
                  <div className="flex justify-between text-mid">
                    <dt>SGST</dt>
                    <dd>
                      <MoneyText paise={doc.sgst} />
                    </dd>
                  </div>
                </>
              )}
            </>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t pt-2.5">
            <dt className="text-sm font-semibold">{doc.type === 'credit_note' ? 'Credited' : 'Total'}</dt>
            <dd className="text-xl font-semibold tracking-tight">
              <MoneyText paise={doc.total} />
            </dd>
          </div>
        </dl>
      </div>

      <footer className="mt-9 flex flex-col gap-6 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="flex items-center gap-1.5 text-[11px] text-low">
          <LogoMark size={13} /> Generated with CartHedge
        </p>
        <p className="text-xs text-mid sm:text-right">
          For {doc.seller.legalName || doc.seller.name}
          <span className="mt-6 block border-t pt-1 text-[11px] text-low">Authorised signatory</span>
        </p>
      </footer>
    </article>
  );
}
