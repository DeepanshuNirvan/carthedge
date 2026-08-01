import { useMemo, useState } from 'react';
import { AlertTriangle, KanbanSquare, LayoutList, Search } from 'lucide-react';
import type { Order, OrderStatus } from '@/api/types';
import { orderStatuses } from '@/api/types';
import { useOrderBoard, useOrderMutations, useOrders } from '@/api/orders';
import { PageHeader } from '../shell/PageHeader';
import { OrderDrawer } from './OrderDrawer';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/date';
import { Input, Select } from '@/ui/Input';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';

const columnTitles: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  rto: 'RTO',
  cancelled: 'Cancelled',
};

const riskyTargets = new Set<OrderStatus>(['cancelled', 'rto']);

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/order-id', order.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onOpen}
      className="panel w-full cursor-grab rounded-md p-3.5 text-left transition-[transform,box-shadow] duration-micro ease-enter hover:-translate-y-0.5 hover:shadow-raised active:cursor-grabbing active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-hi">{order.customerName}</p>
        <MoneyText paise={order.total} className="shrink-0 text-sm" />
      </div>
      <p className="mt-0.5 truncate text-xs text-low">
        {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            order.paymentMethod === 'cod' ? 'bg-gold-400/14 text-gold-ink' : 'bg-jade-500/12 text-jade-ink',
          )}
        >
          {order.paymentMethod === 'cod' ? (order.codConfirmedAt ? 'COD ✓' : 'COD') : 'Prepaid'}
        </span>
        {order.riskFlagged && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/12 px-2 py-0.5 text-[10px] font-semibold text-danger-ink">
            <AlertTriangle className="size-3" /> Risk
          </span>
        )}
        {order.courierTrackingId && (
          <span className="truncate font-mono text-[10px] text-low">{order.courierName}</span>
        )}
        <span className="ml-auto text-[10px] text-low">{timeAgo(order.createdAt)}</span>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const [view, setView] = useState<'board' | 'table'>('board');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; status: OrderStatus; name: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<OrderStatus | null>(null);

  const { data: board, isLoading } = useOrderBoard();
  const { data: tableOrders, isLoading: tableLoading } = useOrders(
    view === 'table' ? { search, payment, status: statusFilter, limit: 100 } : { limit: 0 },
  );
  const { setStatus } = useOrderMutations();

  const filterCard = (o: Order) => {
    if (payment && o.paymentMethod !== payment) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.customerName.toLowerCase().includes(q) ||
      o.code.toLowerCase().includes(q) ||
      o.customerPhone.includes(q)
    );
  };

  const columns = useMemo(
    () =>
      orderStatuses.map((st) => ({
        status: st,
        orders: (board?.columns[st] ?? []).filter(filterCard),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, search, payment],
  );

  const move = (id: string, status: OrderStatus) => {
    setStatus.mutate(
      { id, status },
      {
        onError: (e) => toast('error', 'Could not move order', e.message),
      },
    );
  };

  const onDrop = (status: OrderStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData('text/order-id');
    if (!id) return;
    const order = Object.values(board?.columns ?? {}).flat().find((o) => o.id === id);
    if (!order || order.status === status) return;
    if (riskyTargets.has(status)) {
      setPendingMove({ id, status, name: order.customerName });
    } else {
      move(id, status);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Tap a card to open it · drag between columns on desktop"
        actions={
          <>
            <div className="relative basis-full sm:basis-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-low" />
              <Input
                placeholder="Search buyer, code, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9 sm:h-10 sm:w-52"
                aria-label="Search orders"
              />
            </div>
            <Select value={payment} onChange={(e) => setPayment(e.target.value)} className="h-11 sm:h-10 sm:w-32" aria-label="Payment filter">
              <option value="">All payments</option>
              <option value="cod">COD</option>
              <option value="prepaid">Prepaid</option>
            </Select>
            <Tabs
              tabs={[
                { value: 'board', label: 'Board' },
                { value: 'table', label: 'List' },
              ]}
              value={view}
              onChange={setView}
            />
          </>
        }
      />

      {view === 'board' ? (
        <div className="rail -mx-4 flex snap-x snap-mandatory gap-3 px-4 pb-4 sm:mx-0 sm:snap-none sm:px-0">
          {columns.map((col) => (
            <section
              key={col.status}
              aria-label={columnTitles[col.status]}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget(col.status);
              }}
              onDragLeave={() => setDropTarget((t) => (t === col.status ? null : t))}
              onDrop={(e) => onDrop(col.status, e)}
              className={cn(
                'flex w-[82vw] max-w-72 shrink-0 snap-start flex-col rounded-lg bg-surface-2/60 transition-shadow duration-micro sm:w-64',
                dropTarget === col.status && 'shadow-[inset_0_0_0_2px_rgb(var(--jade-500))]',
              )}
            >
              <header className="flex items-center justify-between px-3.5 py-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mid">
                  {columnTitles[col.status]}
                  <span className="rounded-full bg-surface-3 px-1.5 font-mono text-[10px] text-low tnum">
                    {board?.counts[col.status] ?? 0}
                  </span>
                </h2>
              </header>
              <div className="flex min-h-32 flex-col gap-2.5 px-2.5 pb-3">
                {isLoading ? (
                  <>
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </>
                ) : (
                  col.orders.map((o) => <OrderCard key={o.id} order={o} onOpen={() => setOpenOrderId(o.id)} />)
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 sm:h-10 sm:w-40"
              aria-label="Status filter"
            >
              <option value="">All statuses</option>
              {orderStatuses.map((s) => (
                <option key={s} value={s}>
                  {columnTitles[s]}
                </option>
              ))}
            </Select>
          </div>
          {tableLoading ? (
            <Skeleton className="h-64" />
          ) : tableOrders && tableOrders.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Buyer</Th>
                  <Th className="hidden sm:table-cell">Items</Th>
                  <Th className="hidden sm:table-cell">Payment</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {tableOrders.map((o) => (
                  <Tr key={o.id} onClick={() => setOpenOrderId(o.id)} className="cursor-pointer">
                    <Td className="font-mono text-xs">{o.code}</Td>
                    <Td>
                      <p className="font-medium text-hi">{o.customerName}</p>
                      <p className="font-mono text-xs text-low">{o.customerPhone}</p>
                    </Td>
                    <Td className="hidden max-w-52 truncate text-mid sm:table-cell">
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                    </Td>
                    <Td className="hidden text-xs uppercase text-mid sm:table-cell">{o.paymentMethod}</Td>
                    <Td>
                      <StatusChip status={o.status} />
                    </Td>
                    <Td className="text-right">
                      <MoneyText paise={o.total} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={view === 'table' ? <LayoutList className="size-5" /> : <KanbanSquare className="size-5" />}
              title="No orders match"
              message="Try clearing the filters, or share a checkout link to get orders flowing."
            />
          )}
        </>
      )}

      <OrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />

      <Modal open={!!pendingMove} onClose={() => setPendingMove(null)} title="Confirm move">
        <p className="text-sm text-mid">
          Move <span className="font-medium text-hi">{pendingMove?.name}</span>&apos;s order to{' '}
          <span className="font-medium text-danger-ink">{pendingMove && columnTitles[pendingMove.status]}</span>?
          This affects your RTO stats.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              if (pendingMove) move(pendingMove.id, pendingMove.status);
              setPendingMove(null);
            }}
          >
            Yes, move it
          </Button>
          <Button variant="ghost" onClick={() => setPendingMove(null)}>
            Keep as is
          </Button>
        </div>
      </Modal>
    </>
  );
}
