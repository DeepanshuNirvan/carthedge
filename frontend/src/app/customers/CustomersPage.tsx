import { useState } from 'react';
import { AlertTriangle, Search, Users } from 'lucide-react';
import type { Customer } from '@/api/types';
import { useCustomer, useCustomers, useUpdateCustomer } from '@/api/customers';
import { useOrders } from '@/api/orders';
import { toast } from '@/store/ui';
import { formatDate, timeAgo } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Input, Select, Field } from '@/ui/Input';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { MoneyText } from '@/ui/MoneyText';
import { Badge, StatusChip } from '@/ui/Badge';
import { Switch } from '@/ui/Switch';
import { Sheet } from '@/ui/Modal';
import { Avatar } from '@/ui/Avatar';
import { Skeleton, SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

function CustomerDrawer({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const { data: customer } = useCustomer(customerId ?? undefined);
  const { data: orders } = useOrders(customer ? { search: customer.phone, limit: 20 } : { limit: 0 });
  const update = useUpdateCustomer();

  return (
    <Sheet open={!!customerId} onClose={onClose} title={customer?.name ?? 'Customer'}>
      {!customer ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} className="size-12" />
            <div>
              <p className="font-mono text-sm text-mid">{customer.phone}</p>
              {customer.email && <p className="text-xs text-low">{customer.email}</p>}
              <p className="text-xs text-low">Buyer since {formatDate(customer.createdAt)}</p>
            </div>
            {customer.riskFlagged && (
              <Badge tone="danger" className="ml-auto">
                <AlertTriangle className="size-3" /> COD risk
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="font-display text-xl font-semibold tnum text-hi">{customer.ordersCount}</p>
              <p className="text-xs text-low">orders</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <MoneyText paise={customer.totalSpent} compact className="font-display text-xl font-semibold text-jade-500" />
              <p className="text-xs text-low">lifetime value</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="font-display text-xl font-semibold tnum text-danger">{customer.codRefusals}</p>
              <p className="text-xs text-low">COD refusals</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg bg-surface-2 p-4 sm:grid-cols-2">
            <Field label="Segment">
              <Select
                value={customer.segment}
                onChange={(e) =>
                  update.mutate(
                    { id: customer.id, segment: e.target.value },
                    { onSuccess: () => toast('success', 'Segment updated') },
                  )
                }
              >
                <option value="retail">Retail</option>
                <option value="reseller">Reseller</option>
              </Select>
            </Field>
            <div className="flex items-end pb-2">
              <span className="flex items-center gap-2.5 text-sm text-hi">
                <Switch
                  checked={customer.riskFlagged}
                  label="Risk flag"
                  onChange={(riskFlagged) =>
                    update.mutate(
                      { id: customer.id, riskFlagged },
                      { onSuccess: () => toast('success', riskFlagged ? 'Flagged as risk' : 'Risk flag removed') },
                    )
                  }
                />
                Flag as COD risk
              </span>
            </div>
          </div>

          {customer.lastAddress.line && (
            <p className="rounded-lg bg-surface-2 p-4 text-sm leading-relaxed text-mid">
              {customer.lastAddress.line}, {customer.lastAddress.city}, {customer.lastAddress.state} —{' '}
              {customer.lastAddress.pincode}
            </p>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-low">Order history</h3>
            {orders && orders.length > 0 ? (
              <ul className="divide-y">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="font-mono text-xs text-low">#{o.code}</span>
                    <StatusChip status={o.status} />
                    <span className="ml-auto text-xs text-low">{timeAgo(o.createdAt)}</span>
                    <MoneyText paise={o.total} className="w-20 text-right" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-low">No orders recorded.</p>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: customers, isLoading } = useCustomers({ search, segment, risk: riskOnly });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Your buyer ledger, with COD risk built in"
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
              <Input
                placeholder="Name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-52 pl-9"
                aria-label="Search customers"
              />
            </div>
            <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="h-10 w-32" aria-label="Segment filter">
              <option value="">All segments</option>
              <option value="retail">Retail</option>
              <option value="reseller">Reseller</option>
            </Select>
            <span className="flex items-center gap-2 text-xs text-mid">
              <Switch checked={riskOnly} onChange={setRiskOnly} label="Risk only" />
              Risk only
            </span>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : customers && customers.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Segment</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">LTV</Th>
              <Th className="text-right">Refusals</Th>
              <Th>Risk</Th>
              <Th>Last order</Th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c: Customer) => (
              <Tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer">
                <Td>
                  <p className="font-medium text-hi">{c.name}</p>
                  <p className="font-mono text-xs text-low">{c.phone}</p>
                </Td>
                <Td>
                  <Badge tone={c.segment === 'reseller' ? 'gold' : 'neutral'}>{c.segment}</Badge>
                </Td>
                <Td className="text-right tnum">{c.ordersCount}</Td>
                <Td className="text-right">
                  <MoneyText paise={c.totalSpent} compact />
                </Td>
                <Td className="text-right tnum">{c.codRefusals}</Td>
                <Td>{c.riskFlagged && <AlertTriangle className="size-4 text-danger" aria-label="Risk flagged" />}</Td>
                <Td className="text-xs text-low">{c.lastOrderAt ? timeAgo(c.lastOrderAt) : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No customers yet"
          message="Every order automatically builds your ledger — LTV, repeat rate and COD behaviour included."
        />
      )}

      <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
