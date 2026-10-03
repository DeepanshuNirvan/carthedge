import { useState } from 'react';
import { PackageCheck, RotateCcw, Undo2 } from 'lucide-react';
import type { Order, Refund, RefundMethod, ReturnRequest, ReturnStatus } from '@/api/types';
import { refundMethodLabels, returnReasonLabels, useAfterSaleMutations, useOrderAfterSale } from '@/api/aftersale';
import { returnReasons } from '@/api/types';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/date';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Button } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';

// the request's path; rejected and cancelled leave it
const flow: ReturnStatus[] = ['requested', 'approved', 'picked_up', 'received', 'completed'];
const stepLabel: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  picked_up: 'Picked up',
  received: 'Received',
  completed: 'Closed',
};

function Steps({ status }: { status: ReturnStatus }) {
  const at = flow.indexOf(status);
  if (at < 0) return null;
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1" aria-label="Return progress">
      {flow.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="bulb size-2" data-lit={i === at && s !== 'completed'} data-state={i < at || (s === 'completed' && i === at) ? 'done' : undefined} />
          <span className={cn('whitespace-nowrap text-[11px]', i <= at ? 'text-hi' : 'text-low')}>{stepLabel[s]}</span>
          {i < flow.length - 1 && <span className="h-px w-3 bg-line" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

const refundMethods = Object.keys(refundMethodLabels) as RefundMethod[];

/** Money back: amount, how, reference. Razorpay sends it through the seller's own keys. */
function RefundDialog({
  open,
  onClose,
  order,
  max,
  razorpay,
  returnId,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  max: number;
  razorpay: boolean;
  returnId?: string;
  pending?: Refund;
}) {
  const { refund, processRefund } = useAfterSaleMutations();
  const [amount, setAmount] = useState(paiseToRupees(pending?.amount ?? max));
  const [method, setMethod] = useState<RefundMethod>(razorpay ? 'razorpay' : 'upi');
  const [reference, setReference] = useState('');
  const paise = rupeesToPaise(amount) ?? 0;
  const busy = refund.isPending || processRefund.isPending;
  const done = {
    onSuccess: () => {
      toast('success', method === 'razorpay' ? 'Refund sent through Razorpay' : 'Refund recorded', 'The buyer has been told.');
      onClose();
    },
    onError: (e: Error) => toast('error', 'Refund not recorded', e.message),
  };
  const submit = () => {
    if (pending) processRefund.mutate({ id: pending.id, method, reference }, done);
    else refund.mutate({ orderId: order.id, input: { amount: paise, method, reference, returnId } }, done);
  };
  return (
    <Modal open={open} onClose={onClose} title={pending ? 'Pay this refund' : 'Refund the buyer'}>
      <div className="flex flex-col gap-4">
        <Field label="Amount ₹" hint={pending ? undefined : `Up to ${paiseToRupees(max)} can still go back on this order`}>
          <Input inputMode="decimal" value={amount} disabled={!!pending} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="How the money goes back">
          <Select value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)}>
            {refundMethods
              .filter((m) => m !== 'razorpay' || razorpay)
              .map((m) => (
                <option key={m} value={m}>
                  {refundMethodLabels[m]}
                </option>
              ))}
          </Select>
        </Field>
        {method === 'razorpay' ? (
          <p className="text-xs leading-relaxed text-low">
            Razorpay refunds the buyer’s original payment from your account, usually in 5–7 working days.
          </p>
        ) : (
          <Field label="Reference" optional hint="UTR or transaction id, so the buyer can match it">
            <Input value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
          </Field>
        )}
        <Button className="self-start" loading={busy} disabled={!pending && (paise <= 0 || paise > max)} onClick={submit}>
          {method === 'razorpay' ? 'Refund through Razorpay' : 'Mark refunded'}
        </Button>
      </div>
    </Modal>
  );
}

/** What the seller can do next with one request. */
function ReturnCard({ order, ret, refundable, razorpay }: { order: Order; ret: ReturnRequest; refundable: number; razorpay: boolean }) {
  const { setStatus, replacement } = useAfterSaleMutations();
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [restock, setRestock] = useState<number[]>(ret.items.filter((i) => i.restock).map((i) => i.index));
  const [shipping, setShipping] = useState('');
  const [refunding, setRefunding] = useState(false);
  const can = (s: ReturnStatus) => ret.nextStatuses.includes(s);
  const open = !['completed', 'rejected', 'cancelled'].includes(ret.status);

  const move = (status: ReturnStatus, done: string) =>
    setStatus.mutate(
      { id: ret.id, input: { status, note: note || undefined, pickupCourier: courier || undefined, pickupTracking: tracking || undefined, restock: status === 'received' ? restock : undefined } },
      {
        onSuccess: () => {
          toast('success', done);
          setNote('');
        },
        onError: (e) => toast('error', 'Could not update the request', e.message),
      },
    );

  return (
    <article className="flex flex-col gap-3 rounded-xl bg-[rgb(var(--field)/0.045)] p-4 hairline">
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-hi">{ret.code}</span>
        <span className="text-sm font-medium text-hi">{ret.kind === 'exchange' ? 'Exchange' : 'Return'}</span>
        <span className="text-xs text-low">{returnReasonLabels[ret.reason]}</span>
        <span className="ml-auto">
          <StatusChip status={ret.status} />
        </span>
      </header>
      <Steps status={ret.status} />
      <ul className="flex flex-col gap-1 text-sm">
        {ret.items.map((it) => (
          <li key={it.index} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-hi">
              {it.qty}× {it.name}
              {it.variant && <span className="text-low">, {it.variant}</span>}
              {it.exchangeLabel && <span className="text-jade-ink"> → {it.exchangeLabel}</span>}
            </span>
            <MoneyText paise={it.price * it.qty} className="text-xs text-mid" />
          </li>
        ))}
      </ul>
      {ret.note && <p className="rounded-lg bg-surface/60 p-2.5 text-xs text-mid">“{ret.note}”</p>}
      {ret.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ret.photos.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={`What the buyer sent for ${ret.code}`} className="size-16 overflow-hidden rounded-md object-cover text-transparent hairline" />
            </a>
          ))}
        </div>
      )}
      {(ret.replacementOrderCode || ret.refunded > 0 || ret.pickupTracking) && (
        <p className="text-xs text-mid">
          {ret.replacementOrderCode && <>Replacement order #{ret.replacementOrderCode}. </>}
          {ret.refunded > 0 && (
            <>
              Refunded <MoneyText paise={ret.refunded} className="text-xs" />.{' '}
            </>
          )}
          {ret.pickupTracking && <>Pickup: {ret.pickupCourier} {ret.pickupTracking}.</>}
        </p>
      )}
      <p className="text-[11px] text-low">
        {ret.source === 'seller' ? 'Logged by you' : 'Raised by the buyer'} {formatDateTime(ret.createdAt)}
      </p>

      {open && (
        <div className="flex flex-col gap-3 border-t pt-3">
          {(can('approved') || can('rejected')) && (
            <Field label="Message to the buyer" optional hint="Pickup details, or why it cannot be accepted">
              <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
          {can('picked_up') && ret.status === 'approved' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Pickup courier" optional>
                <Input value={courier} onChange={(e) => setCourier(e.target.value)} />
              </Field>
              <Field label="Pickup tracking" optional>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </Field>
            </div>
          )}
          {can('received') && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[13px] font-medium text-hi">Put back on sale when received</legend>
              {ret.items.map((it) => (
                <label key={it.index} className="flex items-center gap-2 text-sm text-mid">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-jade-500"
                    disabled={!it.productId}
                    checked={restock.includes(it.index)}
                    onChange={(e) => setRestock((r) => (e.target.checked ? [...r, it.index] : r.filter((x) => x !== it.index)))}
                  />
                  {it.qty}× {it.name}
                  {it.variant && `, ${it.variant}`}
                </label>
              ))}
            </fieldset>
          )}
          {ret.kind === 'exchange' && !ret.replacementOrderId && ['approved', 'picked_up', 'received'].includes(ret.status) && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Re-delivery charge ₹" optional hint="Free unless you charge for it">
                <Input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
              </Field>
              <Button
                variant="secondary"
                icon={<PackageCheck className="size-4" />}
                loading={replacement.isPending}
                onClick={() =>
                  replacement.mutate(
                    { id: ret.id, shipping: rupeesToPaise(shipping) ?? 0 },
                    {
                      onSuccess: (o) => toast('success', `Replacement order #${o.code} created`, 'It is on your board, ready to pack.'),
                      onError: (e) => toast('error', 'No replacement created', e.message),
                    },
                  )
                }
              >
                Send replacement
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {can('approved') && (
              <Button size="sm" loading={setStatus.isPending} onClick={() => move('approved', 'Request approved')}>
                Approve
              </Button>
            )}
            {can('rejected') && (
              <Button size="sm" variant="ghost" className="text-danger-ink" loading={setStatus.isPending} onClick={() => move('rejected', 'Request declined')}>
                Decline
              </Button>
            )}
            {can('picked_up') && (
              <Button size="sm" variant="secondary" loading={setStatus.isPending} onClick={() => move('picked_up', 'Marked picked up')}>
                Picked up
              </Button>
            )}
            {can('received') && (
              <Button size="sm" variant="secondary" loading={setStatus.isPending} onClick={() => move('received', 'Item received')}>
                Item received
              </Button>
            )}
            {refundable > 0 && ret.status !== 'requested' && (
              <Button size="sm" variant="secondary" icon={<Undo2 className="size-4" />} onClick={() => setRefunding(true)}>
                Refund
              </Button>
            )}
            {can('completed') && (
              <Button size="sm" variant="secondary" loading={setStatus.isPending} onClick={() => move('completed', 'Request closed')}>
                Close request
              </Button>
            )}
          </div>
        </div>
      )}
      {refunding && (
        <RefundDialog
          open
          onClose={() => setRefunding(false)}
          order={order}
          max={Math.min(refundable, Math.max(ret.value - ret.refunded, 0) || refundable)}
          razorpay={razorpay}
          returnId={ret.id}
        />
      )}
    </article>
  );
}

/** Seller logs a return the buyer asked for in a chat or on a call. */
function LogReturnDialog({ open, onClose, order }: { open: boolean; onClose: () => void; order: Order }) {
  const { createReturn } = useAfterSaleMutations();
  const [kind, setKind] = useState<'return' | 'exchange'>('exchange');
  const [reason, setReason] = useState<(typeof returnReasons)[number]>('size');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState<Record<number, number>>({});
  const items = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([i, q]) => ({ index: Number(i), qty: q }));
  return (
    <Modal open={open} onClose={onClose} title="Log a return or exchange">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as 'return' | 'exchange')}>
              <option value="exchange">Exchange</option>
              <option value="return">Return for refund</option>
            </Select>
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {returnReasons.map((r) => (
                <option key={r} value={r}>
                  {returnReasonLabels[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-medium text-hi">Items coming back</legend>
          {order.items.map((it, i) => (
            <label key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-hi">
                {it.name}
                {it.variant && <span className="text-low">, {it.variant}</span>}
              </span>
              <Select
                aria-label={`How many ${it.name}`}
                className="h-10 w-20"
                value={String(qty[i] ?? 0)}
                onChange={(e) => setQty({ ...qty, [i]: Number(e.target.value) })}
              >
                {Array.from({ length: it.qty + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </fieldset>
        <Field label="Note" optional>
          <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button
          className="self-start"
          disabled={items.length === 0}
          loading={createReturn.isPending}
          onClick={() =>
            createReturn.mutate(
              { orderId: order.id, input: { kind, reason, note: note || undefined, items } },
              {
                onSuccess: () => {
                  toast('success', 'Request logged');
                  onClose();
                },
                onError: (e) => toast('error', 'Not logged', e.message),
              },
            )
          }
        >
          Log request
        </Button>
      </div>
    </Modal>
  );
}

/** Returns, exchanges and refunds of one order, in the order drawer. */
export function AfterSalePanel({ order }: { order: Order }) {
  const { data } = useOrderAfterSale(order.id);
  const { cancelRefund, processRefund } = useAfterSaleMutations();
  const [logging, setLogging] = useState(false);
  const [refunding, setRefunding] = useState<Refund | 'new' | null>(null);
  if (!data) return null;
  const pending = data.refunds.filter((r) => r.status === 'pending');
  const done = data.refunds.filter((r) => r.status !== 'pending');
  const canLog = ['shipped', 'delivered'].includes(order.status) && !data.returns.some((r) => ['requested', 'approved', 'picked_up', 'received'].includes(r.status));
  if (data.returns.length === 0 && data.refunds.length === 0 && !canLog && data.refundable === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-mid">Returns and refunds</h3>
        <div className="flex gap-1">
          {canLog && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setLogging(true)}>
              Log a return
            </Button>
          )}
          {data.refundable > 0 && pending.length === 0 && (
            <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => setRefunding('new')}>
              Refund
            </Button>
          )}
        </div>
      </div>

      {pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-gold-400/10 p-4 shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.22)]">
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-sm font-medium text-gold-ink">
              Refund of <MoneyText paise={r.amount} /> due
            </p>
            <p className="text-xs text-mid">
              {r.method === 'razorpay'
                ? 'Sent to Razorpay, no answer yet. Retrying checks Razorpay first, so it is never paid twice.'
                : r.reason || 'Send it, then record how it went back.'}
            </p>
          </div>
          {r.method === 'razorpay' ? (
            <Button
              size="sm"
              loading={processRefund.isPending}
              onClick={() =>
                processRefund.mutate(
                  { id: r.id, method: 'razorpay', reference: '' },
                  {
                    onSuccess: () => toast('success', 'Refund sent through Razorpay', 'The buyer has been told.'),
                    onError: (e) => toast('error', 'Refund still pending', e.message),
                  },
                )
              }
            >
              Check and retry
            </Button>
          ) : (
            <Button size="sm" onClick={() => setRefunding(r)}>
              Pay refund
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            loading={cancelRefund.isPending}
            onClick={() =>
              cancelRefund.mutate(r.id, {
                onSuccess: () => toast('info', 'Refund voided'),
                onError: (e) => toast('error', 'Could not void', e.message),
              })
            }
          >
            Void
          </Button>
        </div>
      ))}

      {data.returns.map((ret) => (
        <ReturnCard key={ret.id} order={order} ret={ret} refundable={data.refundable} razorpay={data.razorpay} />
      ))}

      {done.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-xs text-mid">
          {done.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {r.status === 'processed' ? 'Refunded' : r.status === 'failed' ? 'Refund failed' : 'Refund voided'}{' '}
                <MoneyText paise={r.amount} className="text-xs text-hi" /> {r.method && `by ${refundMethodLabels[r.method as RefundMethod]?.toLowerCase() ?? r.method}`}
                {r.reference && <span className="font-mono"> · {r.reference}</span>}
              </span>
              <span className="text-low">{formatDateTime(r.processedAt || r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {logging && <LogReturnDialog open onClose={() => setLogging(false)} order={order} />}
      {refunding && (
        <RefundDialog
          open
          onClose={() => setRefunding(null)}
          order={order}
          max={refunding === 'new' ? data.refundable : refunding.amount}
          razorpay={data.razorpay}
          pending={refunding === 'new' ? undefined : refunding}
        />
      )}
    </section>
  );
}
