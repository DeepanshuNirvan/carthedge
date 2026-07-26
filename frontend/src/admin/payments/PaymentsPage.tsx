import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { useAdminPayments } from '@/api/admin';
import { PageHeader } from '@/app/shell/PageHeader';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { formatDateTime } from '@/lib/date';

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const { data: payments, isLoading } = useAdminPayments(page);

  return (
    <>
      <PageHeader title="Subscription payments" subtitle="Platform revenue ledger" />
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : payments && payments.length > 0 ? (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th className="hidden sm:table-cell">Plan</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Razorpay order</Th>
                <Th className="hidden sm:table-cell">When</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <p className="font-medium text-hi">{p.businessName}</p>
                    <p className="font-mono text-xs text-low">/{p.businessCode}</p>
                  </Td>
                  <Td className="hidden text-xs font-medium uppercase text-mid sm:table-cell">{p.planCode || '—'}</Td>
                  <Td className="text-right">
                    <MoneyText paise={p.amount} />
                  </Td>
                  <Td>
                    <StatusChip status={p.status} />
                  </Td>
                  <Td className="hidden font-mono text-xs text-low md:table-cell">{p.razorpayOrderId}</Td>
                  <Td className="hidden text-xs text-low sm:table-cell">{formatDateTime(p.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="font-mono text-xs text-mid tnum">page {page}</span>
            <Button variant="secondary" size="sm" disabled={payments.length < 20} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </>
      ) : (
        <EmptyState icon={<Receipt className="size-5" />} title="No payments yet" />
      )}
    </>
  );
}
