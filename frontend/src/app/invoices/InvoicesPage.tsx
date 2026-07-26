import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import type { Invoice } from '@/api/types';
import { useInvoices } from '@/api/invoices';
import { useBusiness } from '@/api/business';
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
  return (
    <Modal open={!!invoice} onClose={onClose} title={`Invoice ${invoice?.invoiceNumber ?? ''}`} wide>
      {invoice && (
        <>
          {/* print-friendly premium layout */}
          <div id="invoice-print" className="rounded-lg bg-surface-2 p-5 sm:p-8">
            <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <p className="font-display text-xl font-semibold text-hi">{business?.name}</p>
                {business?.gstin && <p className="mt-1 font-mono text-xs text-mid">GSTIN {business.gstin}</p>}
                <p className="mt-1 text-xs leading-relaxed text-low">
                  {business?.address && `${business.address}, `}
                  {business?.city} {business?.pincode}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-mono text-sm font-semibold text-jade-500">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs text-low">{formatDate(invoice.createdAt)}</p>
                <p className="mt-1 font-mono text-xs text-low">Order #{invoice.orderCode}</p>
              </div>
            </div>
            <p className="mt-5 text-sm text-mid">
              Billed to <span className="font-medium text-hi">{invoice.customerName}</span>
            </p>
            <dl className="mt-5 flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-mid">
                <dt>Subtotal</dt>
                <dd><MoneyText paise={invoice.subtotal} /></dd>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-mid">
                  <dt>Discount</dt>
                  <dd>-<MoneyText paise={invoice.discount} /></dd>
                </div>
              )}
              <div className="flex justify-between text-mid">
                <dt>Shipping</dt>
                <dd><MoneyText paise={invoice.shipping} /></dd>
              </div>
              {invoice.gstRate > 0 && (
                <div className="flex justify-between text-mid">
                  <dt>GST @ {invoice.gstRate}%</dt>
                  <dd><MoneyText paise={invoice.gstAmount} /></dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 text-base font-semibold text-hi">
                <dt>Total</dt>
                <dd><MoneyText paise={invoice.total} /></dd>
              </div>
            </dl>
            <p className="mt-8 text-center text-xs text-low">Generated with CartHedge · carthedge.in</p>
          </div>
          <Button variant="secondary" className="mt-4" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            Print / save PDF
          </Button>
        </>
      )}
    </Modal>
  );
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const [viewing, setViewing] = useState<Invoice | null>(null);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="GST-lite invoices from delivered orders — create them from the order drawer"
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
                <Td className="font-mono text-xs font-medium text-jade-500">{inv.invoiceNumber}</Td>
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
          message="Open a delivered order and tap 'Generate invoice' — numbering is automatic."
        />
      )}
      <InvoiceView invoice={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
