import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search } from 'lucide-react';
import { useAdminBusinesses } from '@/api/admin';
import { PageHeader } from '@/app/shell/PageHeader';
import { Input, Select } from '@/ui/Input';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { StatusChip } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { formatDate } from '@/lib/date';

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminBusinesses({ search, status, page });

  return (
    <>
      <PageHeader
        title="Businesses"
        subtitle={data ? `${data.total} on the platform` : undefined}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
              <Input
                placeholder="Name, code, email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-56 pl-9"
                aria-label="Search businesses"
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-36" aria-label="Status filter">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : data && data.businesses.length > 0 ? (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>Owner</Th>
                <Th>Plan</Th>
                <Th>Subscription</Th>
                <Th>Ends</Th>
                <Th className="text-right">Orders</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.businesses.map((b) => (
                <Tr key={b.id}>
                  <Td>
                    <Link to={`/admin/businesses/${b.id}`} className="font-medium text-hi hover:text-jade-500">
                      {b.name}
                    </Link>
                    <p className="font-mono text-xs text-low">/{b.code}</p>
                  </Td>
                  <Td>
                    <p className="text-mid">{b.ownerName}</p>
                    <p className="text-xs text-low">{b.email}</p>
                  </Td>
                  <Td className="uppercase text-xs font-medium text-mid">{b.planCode || '—'}</Td>
                  <Td>
                    <StatusChip status={b.subscriptionStatus || 'none'} />
                  </Td>
                  <Td className="text-xs text-low">{formatDate(b.subscriptionEndsAt)}</Td>
                  <Td className="text-right tnum">{b.ordersCount}</Td>
                  <Td>
                    <StatusChip status={b.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {data.total > 20 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="font-mono text-xs text-mid tnum">
                {page} / {Math.ceil(data.total / 20)}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={<Building2 className="size-5" />} title="No businesses match" />
      )}
    </>
  );
}
