import { useState } from 'react';
import { MessageCircle, Printer, RotateCcw, ShoppingCart, X } from 'lucide-react';
import type { OrderStatus } from '@/api/types';
import { returnReasonLabels, usePendingRefunds, useReturns } from '@/api/aftersale';
import { useAbandonedCheckouts, useOrderMutations } from '@/api/orders';
import { toast } from '@/store/ui';
import { timeAgo } from '@/lib/date';
import { whatsappHref } from '@/lib/validators';
import { Button, IconButton } from '@/ui/Button';
import { Select } from '@/ui/Input';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Table, Td, Th, Tr } from '@/ui/Table';
import { Tabs } from '@/ui/Tabs';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';

/** Returns and exchanges in motion, plus refunds still owed. */
export function ReturnsView({ onOpen }: { onOpen: (orderId: string) => void }) {
  const [filter, setFilter] = useState<'open' | ''>('open');
  const { data: returns, isLoading } = useReturns(filter);
  const { data: refunds } = usePendingRefunds();
  return (
    <div className="flex flex-col gap-4">
      {refunds && refunds.length > 0 && (
        <div className="rounded-xl bg-gold-400/10 p-4 shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.22)]">
          <p className="text-sm font-medium text-gold-ink">
            {refunds.length === 1 ? 'One refund is' : `${refunds.length} refunds are`} waiting to be paid
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {refunds.map((r) => (
              <li key={r.id}>
                <button onClick={() => onOpen(r.orderId)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-hi shadow-soft">
                  #{r.orderCode} · <MoneyText paise={r.amount} className="text-xs" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Tabs
        tabs={[
          { value: 'open', label: 'In progress' },
          { value: '', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
        className="self-start"
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : returns && returns.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Request</Th>
              <Th>Buyer</Th>
              <Th className="hidden sm:table-cell">Items</Th>
              <Th>Status</Th>
              <Th className="text-right">Value</Th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <Tr key={r.id} onClick={() => onOpen(r.orderId)} className="cursor-pointer">
                <Td>
                  <p className="font-mono text-xs font-medium text-hi">{r.code}</p>
                  <p className="text-xs text-low">
                    {r.kind === 'exchange' ? 'Exchange' : 'Return'} · {returnReasonLabels[r.reason]}
                  </p>
                </Td>
                <Td>
                  <p className="font-medium text-hi">{r.customerName}</p>
                  <p className="font-mono text-xs text-low">#{r.orderCode}</p>
                </Td>
                <Td className="hidden max-w-52 truncate text-mid sm:table-cell">
                  {r.items.map((i) => `${i.qty}× ${i.name}${i.exchangeLabel ? ` → ${i.exchangeLabel}` : ''}`).join(', ')}
                </Td>
                <Td>
                  <StatusChip status={r.status} />
                  <p className="mt-1 text-[11px] text-low">{timeAgo(r.updatedAt)}</p>
                </Td>
                <Td className="text-right">
                  <MoneyText paise={r.value} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<RotateCcw className="size-5" />}
          title={filter === 'open' ? 'No returns in progress' : 'No returns yet'}
          message="Buyers raise returns and exchanges from their order page, inside the rules you set in Settings → Policies."
        />
      )}
    </div>
  );
}

/** Buyers who verified their number at checkout but did not order this week. */
export function DroppedView() {
  const { data, isLoading } = useAbandonedCheckouts();
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        icon={<ShoppingCart className="size-5" />}
        title="No dropped checkouts this week"
        message="When a buyer verifies their number but does not order, they show up here so you can follow up."
      />
    );
  return (
    <Table>
      <thead>
        <tr>
          <Th>Buyer</Th>
          <Th className="hidden sm:table-cell">Was buying</Th>
          <Th>When</Th>
          <Th className="text-right">Follow up</Th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <Tr key={c.phone}>
            <Td>
              <p className="font-medium text-hi">{c.name || 'New buyer'}</p>
              <p className="font-mono text-xs text-low">{c.phone}</p>
            </Td>
            <Td className="hidden max-w-60 truncate text-mid sm:table-cell">{c.items || 'Cart from a share link'}</Td>
            <Td className="text-xs text-mid">
              {timeAgo(c.verifiedAt)}
              {c.remindedAt && <p className="text-[11px] text-low">Reminder sent</p>}
            </Td>
            <Td className="text-right">
              <a
                href={whatsappHref(c.phone)}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${c.name || c.phone}`}
                className="inline-flex size-10 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink transition-colors hover:bg-jade-500/20"
              >
                <MessageCircle className="size-4" />
              </a>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

const bulkTargets: { value: OrderStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Floating bar for many orders at once. Each order makes the same guarded
 * move as a single one; orders that cannot are listed, the rest still move.
 */
export function BulkBar({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const { bulkStatus } = useOrderMutations();
  const [target, setTarget] = useState<OrderStatus>('confirmed');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const run = () =>
    bulkStatus.mutate(
      { ids, status: target },
      {
        onSuccess: (r) => {
          const failed = r.results.filter((x) => !x.ok);
          if (failed.length === 0) toast('success', `${r.updated} ${r.updated === 1 ? 'order' : 'orders'} moved`);
          else toast('info', `${r.updated} moved, ${failed.length} could not`, failed[0]?.error);
          onClear();
        },
        onError: (e) => toast('error', 'Orders not moved', e.message),
      },
    );
  const print = (picklist: boolean) =>
    window.open(`/app/print/slips?ids=${ids.join(',')}${picklist ? '&picklist=1' : ''}`, '_blank', 'noopener');

  return (
    <>
      <div
        role="region"
        aria-label="Bulk actions"
        className="glass-nav sheen fixed inset-x-3 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl p-2.5 shadow-float lg:bottom-6"
      >
        <span className="px-2 text-sm font-semibold text-hi tnum">{ids.length} selected</span>
        <Select value={target} onChange={(e) => setTarget(e.target.value as OrderStatus)} className="h-10 w-36 rounded-full" aria-label="Move to">
          {bulkTargets.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Button size="sm" loading={bulkStatus.isPending} onClick={() => (target === 'cancelled' ? setConfirmCancel(true) : run())}>
          Move
        </Button>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => print(false)}>
          Packing slips
        </Button>
        <Button size="sm" variant="ghost" onClick={() => print(true)}>
          Pick list
        </Button>
        <IconButton label="Clear selection" className="ml-auto" onClick={onClear}>
          <X className="size-4" />
        </IconButton>
      </div>
      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel these orders?">
        <p className="text-sm text-mid">
          {ids.length} {ids.length === 1 ? 'order goes' : 'orders go'} back to stock. Buyers who paid get a refund due on their order.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              setConfirmCancel(false);
              run();
            }}
          >
            Cancel orders
          </Button>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep them
          </Button>
        </div>
      </Modal>
    </>
  );
}
