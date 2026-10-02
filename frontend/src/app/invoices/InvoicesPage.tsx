import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer } from 'lucide-react';
import type { Invoice } from '@/api/types';
import { useInvoices } from '@/api/invoices';
import { useBusiness } from '@/api/business';
import { useOrder } from '@/api/orders';
import { InvoiceDocument } from './InvoiceDocument';
import { formatDate } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { MoneyText } from '@/ui/MoneyText';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

function InvoiceView({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { data: business } = useBusiness();
  const { data: order, isLoading: orderLoading } = useOrder(invoice?.orderId);
  const doc = invoice && (
    <InvoiceDocument invoice={invoice} business={business} order={order} orderLoading={orderLoading} />
  );
  return (
    <>
      <Modal open={!!invoice} onClose={onClose} title={`Invoice ${invoice?.invoiceNumber ?? ''}`} wide>
        {doc}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
            Print or save PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
      {/* print copy: a direct child of <body>, so the print stylesheet can show it alone at full page */}
      {doc && createPortal(<div id="invoice-print" className="hidden print:block">{doc}</div>, document.body)}
    </>
  );
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const [viewing, setViewing] = useState<Invoice | null>(null);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="GST-lite invoices from your orders. Create one from the order drawer; numbering is automatic."
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
          message="Open a delivered order and tap Generate invoice. Numbering is automatic."
        />
      )}
      <InvoiceView invoice={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
