import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { FileText, Printer } from 'lucide-react';
import type { CreditNote, Invoice } from '@/api/types';
import { useInvoice, useInvoices } from '@/api/invoices';
import { useBusiness } from '@/api/business';
import { useOrder } from '@/api/orders';
import { InvoiceDocument } from './InvoiceDocument';
import { GstDocument } from './GstDocument';
import { formatDate } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { MoneyText } from '@/ui/MoneyText';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

function InvoiceView({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: business } = useBusiness();
  const { data: invoice } = useInvoice(id ?? undefined);
  // invoices from before GST snapshots render from the order, as they always did
  const legacy = !!invoice && !invoice.doc;
  const { data: order, isLoading: orderLoading } = useOrder(legacy ? invoice?.orderId : undefined);
  const [note, setNote] = useState<CreditNote | null>(null);
  const shown = note ?? invoice;
  const doc =
    invoice &&
    (note ? (
      <GstDocument doc={note.doc} number={note.number} date={note.createdAt} logoUrl={business?.logoUrl || undefined} />
    ) : invoice.doc ? (
      <GstDocument doc={invoice.doc} number={invoice.invoiceNumber} date={invoice.createdAt} logoUrl={business?.logoUrl || undefined} />
    ) : (
      <InvoiceDocument invoice={invoice} business={business} order={order} orderLoading={orderLoading} />
    ));
  const close = () => {
    setNote(null);
    onClose();
  };
  return (
    <>
      <Modal open={!!id} onClose={close} title={note ? `Credit note ${note.number}` : `Invoice ${invoice?.invoiceNumber ?? ''}`} wide>
        {doc ?? <Skeleton className="h-96" />}
        {invoice?.creditNotes && invoice.creditNotes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-low">{note ? 'Back to' : 'Credit notes:'}</span>
            {note ? (
              <Button size="sm" variant="secondary" onClick={() => setNote(null)}>
                Invoice {invoice.invoiceNumber}
              </Button>
            ) : (
              invoice.creditNotes.map((cn) => (
                <Button key={cn.id} size="sm" variant="secondary" onClick={() => setNote(cn)}>
                  {cn.number} · <MoneyText paise={cn.total} />
                </Button>
              ))
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={<Printer className="size-4" />} disabled={!shown} onClick={() => window.print()}>
            Print or save PDF
          </Button>
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
        </div>
      </Modal>
      {/* print copy: a direct child of <body>, so the print stylesheet can show it alone at full page */}
      {doc && createPortal(<div data-print className="hidden print:block">{doc}</div>, document.body)}
    </>
  );
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  // ?open= lets the order drawer link straight to an invoice it just created
  const [params, setParams] = useSearchParams();
  const viewing = params.get('open');
  const setViewing = (inv: Invoice | null) => {
    if (inv) params.set('open', inv.id);
    else params.delete('open');
    setParams(params, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="GST invoices from your orders, numbered by financial year. Create one from the order drawer; refunds add credit notes."
      />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : invoices && invoices.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th className="hidden sm:table-cell">Order</Th>
              <Th>Customer</Th>
              <Th className="hidden sm:table-cell">Date</Th>
              <Th className="hidden md:table-cell text-right">GST</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <Tr key={inv.id} onClick={() => setViewing(inv)} className="cursor-pointer">
                <Td className="font-mono text-xs font-medium text-jade-ink">{inv.invoiceNumber}</Td>
                <Td className="hidden font-mono text-xs sm:table-cell">{inv.orderCode}</Td>
                <Td className="font-medium text-hi">{inv.customerName}</Td>
                <Td className="hidden text-xs text-low sm:table-cell">{formatDate(inv.createdAt)}</Td>
                <Td className="hidden text-right text-xs text-mid md:table-cell">
                  {inv.docType === 'tax_invoice' && inv.gstAmount > 0 ? <MoneyText paise={inv.gstAmount} /> : inv.docType === 'bill_of_supply' ? 'Bill of supply' : '-'}
                </Td>
                <Td className="text-right">
                  <MoneyText paise={inv.total} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No invoices yet"
          message="Open an order and tap Create invoice. Numbering is automatic and restarts each April."
        />
      )}
      <InvoiceView id={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
