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
            <div className="relative basis-full sm:basis-auto">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-low" />
              <Input
                placeholder="Name, code, email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-full pl-10 sm:h-10 sm:w-56"
                aria-label="Search businesses"
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-full sm:h-10 sm:w-36" aria-label="Status filter">
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
                <Th className="hidden md:table-cell">Owner</Th>
                <Th className="hidden sm:table-cell">Plan</Th>
                <Th>Subscription</Th>
                <Th className="hidden md:table-cell">Ends</Th>
                <Th className="hidden text-right sm:table-cell">Orders</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.businesses.map((b) => (
                <Tr key={b.id}>
                  <Td>
                    <Link to={`/admin/businesses/${b.id}`} className="-my-3 inline-block py-3 font-medium text-hi hover:text-jade-ink">
                      {b.name}
                    </Link>
                    <p className="font-mono text-xs text-low">/{b.code}</p>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <p className="text-mid">{b.ownerName}</p>
                    <p className="text-xs text-low">{b.email}</p>
                  </Td>
                  <Td className="hidden text-xs font-medium capitalize text-mid sm:table-cell">{b.planCode || '-'}</Td>
                  <Td>
                    <StatusChip status={b.subscriptionStatus || 'none'} />
                  </Td>
                  <Td className="hidden text-xs text-low md:table-cell">{formatDate(b.subscriptionEndsAt)}</Td>
                  <Td className="hidden text-right tnum sm:table-cell">{b.ordersCount}</Td>
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
