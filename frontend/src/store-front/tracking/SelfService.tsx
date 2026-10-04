import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Camera, MapPin, MessageCircle, RotateCcw, Smartphone, X } from 'lucide-react';
import type { Address, ReturnReason, TrackedOrder } from '@/api/types';
import { returnReasons } from '@/api/types';
import { returnReasonLabels } from '@/api/aftersale';
import { ApiError } from '@/api/http';
import {
  buyerCancel,
  buyerChangeAddress,
  buyerRequestReturn,
  buyerSetMarketing,
  buyerUploadPhoto,
  buyerWithdrawReturn,
  sendOtp,
  verifyOtp,
} from '@/api/storefront';
import { toast } from '@/store/ui';
import { formatDate } from '@/lib/date';
import { addressSchema } from '@/lib/validators';
import { Button } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';

type Action = 'cancel' | 'address' | 'return' | 'withdraw' | null;

const cancelReasons = ['Ordered by mistake', 'Changed my mind', 'Found it cheaper elsewhere', 'Delivery is too slow', 'Other'];

/** One-time code to the order's phone: these actions change the order, so a code and a number are not enough. */
function Verify({ order, phone, onToken }: { order: TrackedOrder; phone: string; onToken: (t: string) => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await sendOtp(order.businessCode, phone);
      setSent(true);
    } catch (e) {
      toast('error', 'Could not send the code', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const res = await verifyOtp(order.businessCode, phone, code);
      onToken(res.orderToken);
    } catch (e) {
      toast('error', 'Wrong or expired code', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-mid">
        <Smartphone className="size-4 text-jade-ink" aria-hidden /> First, confirm it is you: we send a code to +91 {phone}.
      </p>
      {sent ? (
        <>
          <Field label="Enter the 6-digit code">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl font-semibold tracking-[0.55em] tnum"
            />
          </Field>
          <Button loading={busy} disabled={code.length < 4} onClick={verify}>
            Verify
          </Button>
          <button onClick={send} disabled={busy} className="text-center text-xs text-mid hover:text-hi disabled:opacity-50">
            Send the code again
          </button>
        </>
      ) : (
        <Button loading={busy} onClick={send}>
          Send code
        </Button>
      )}
    </div>
  );
}

function CancelForm({ onSubmit, busy }: { onSubmit: (reason: string) => void; busy: boolean }) {
  const [reason, setReason] = useState(cancelReasons[0]);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Why are you cancelling?">
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {cancelReasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <p className="text-xs leading-relaxed text-low">If you already paid, the seller sends your money back once the order is cancelled.</p>
      <Button variant="danger" loading={busy} onClick={() => onSubmit(reason)}>
        Cancel my order
      </Button>
    </div>
  );
}

function AddressForm({ initial, onSubmit, busy }: { initial: Address; onSubmit: (a: Address) => void; busy: boolean }) {
  const [a, setA] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const r = addressSchema.safeParse(a);
    if (!r.success) {
      const next: Record<string, string> = {};
      for (const issue of r.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    onSubmit(a);
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Delivery address" error={errors.line}>
        <Textarea rows={2} autoComplete="street-address" value={a.line} onChange={(e) => setA({ ...a, line: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" error={errors.city}>
          <Input autoComplete="address-level2" value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} />
        </Field>
        <Field label="State" error={errors.state}>
          <Input autoComplete="address-level1" value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })} />
        </Field>
      </div>
      <Field label="Pincode" error={errors.pincode}>
        <Input inputMode="numeric" maxLength={6} value={a.pincode} onChange={(e) => setA({ ...a, pincode: e.target.value.replace(/\D/g, '') })} />
      </Field>
      <Button loading={busy} onClick={submit}>
        Save new address
      </Button>
    </div>
  );
}

/** Pick the pieces, say why, add photos — inside the store's return rules. */
function ReturnForm({
  order,
  auth,
  onSubmit,
  busy,
}: {
  order: TrackedOrder;
  auth: { phone: string; orderToken: string };
  onSubmit: (input: Parameters<typeof buyerRequestReturn>[2]) => void;
  busy: boolean;
}) {
  const as = order.afterSale!;
  const policy = as.returnPolicy;
  const kinds = [policy.exchange && 'exchange', policy.refund && 'return'].filter(Boolean) as ('exchange' | 'return')[];
  const reasons = (policy.reasons && policy.reasons.length > 0 ? policy.reasons : returnReasons) as ReturnReason[];
  const [kind, setKind] = useState(kinds[0]);
  const [reason, setReason] = useState<ReturnReason>(reasons[0]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [swap, setSwap] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const needsPhoto = policy.photoRequired && ['damaged', 'wrong_item', 'quality', 'not_as_described'].includes(reason);
  const items = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([i, q]) => {
      const index = Number(i);
      const opt = as.options[index]?.find((o) => o.id === swap[index]);
      return { index, qty: q, exchangeVariantId: kind === 'exchange' && opt ? opt.id : undefined };
    });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await buyerUploadPhoto(order.orderCode, auth, file);
      setPhotos((p) => [...p, url]);
    } catch (e) {
      toast('error', 'Photo not uploaded', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {kinds.length > 1 && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What would you like?">
          {kinds.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={kind === k ? 'rounded-lg bg-jade-500/10 p-3 text-sm font-medium text-jade-ink shadow-[inset_0_0_0_1.5px_rgb(var(--jade-500))]' : 'rounded-lg p-3 text-sm text-mid neu'}
            >
              {k === 'exchange' ? 'Exchange it' : 'Return for a refund'}
            </button>
          ))}
        </div>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[13px] font-medium text-hi">Which items?</legend>
        {order.items.map((it, i) => {
          const left = as.returnable[String(i)] ?? 0;
          if (left <= 0) return null;
          const options = as.options[String(i)];
          return (
            <div key={i} className="flex flex-col gap-2 rounded-lg bg-[rgb(var(--field)/0.04)] p-3 hairline">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm text-hi">
                  {it.name}
                  {it.variant && <span className="block text-xs text-low">{it.variant}</span>}
                </span>
                <Select aria-label={`How many ${it.name}`} className="h-10 w-20" value={String(qty[i] ?? 0)} onChange={(e) => setQty({ ...qty, [i]: Number(e.target.value) })}>
                  {Array.from({ length: left + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              {kind === 'exchange' && (qty[i] ?? 0) > 0 && options && (
                <Field label="Exchange for">
                  <Select value={swap[i] ?? ''} onChange={(e) => setSwap({ ...swap, [i]: e.target.value })}>
                    <option value="">The same, a fresh piece</option>
                    {options
                      .filter((o) => o.name !== it.variant)
                      .map((o) => (
                        <option key={o.id} value={o.id} disabled={!o.inStock}>
                          {o.name}
                          {!o.inStock ? ' (sold out)' : ''}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
            </div>
          );
        })}
      </fieldset>
      <Field label="Reason">
        <Select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {returnReasonLabels[r]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-hi">
          Photos {needsPhoto ? <span className="font-normal text-low">(needed for this reason)</span> : <span className="font-normal text-low">(optional)</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {photos.map((src) => (
            <span key={src} className="relative">
              <img src={src} alt="What you attached" className="size-16 overflow-hidden rounded-md object-cover text-transparent hairline" />
              <button
                aria-label="Remove photo"
                onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-surface text-mid shadow-soft"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {photos.length < 5 && (
            <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md text-[11px] text-low neu">
              <Camera className="size-4" />
              {uploading ? '…' : 'Add'}
              <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          )}
        </div>
      </div>
      <Field label="Anything else the seller should know?" optional>
        <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {policy.conditions && <p className="text-xs leading-relaxed text-low">{policy.conditions}</p>}
      <Button
        loading={busy}
        disabled={items.length === 0 || (needsPhoto && photos.length === 0) || uploading}
        onClick={() => onSubmit({ kind, reason, note: note || undefined, photos, items })}
      >
        Send request
      </Button>
    </div>
  );
}

/**
 * What the buyer can do with their order themselves: cancel (within the
 * store's rules), change the address before it ships, ask for a return or
 * exchange after delivery — and see how those requests and refunds are going.
 */
export function SelfService({ order, phone, onChanged }: { order: TrackedOrder; phone: string; onChanged: () => void }) {
  const [action, setAction] = useState<Action>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState<{ id: string; code: string } | null>(null);
  const as = order.afterSale;
  if (!as) return null;
  const auth = { phone, orderToken: token };
  const activeReturns = as.returns;
  const canAct = as.canCancel || as.canChangeAddress || as.canReturn;
  if (!canAct && activeReturns.length === 0 && as.refunds.length === 0) return null;

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast('success', done);
      setAction(null);
      onChanged();
    } catch (e) {
      // the code is good for 15 minutes; after that the next try asks for a fresh one
      if (e instanceof ApiError && e.status === 401) setToken('');
      toast('error', 'That did not go through', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Exclude<Action, null>, string> = {
    cancel: 'Cancel this order',
    address: 'Change the delivery address',
    return: 'Return or exchange',
    withdraw: 'Withdraw your request',
  };

  return (
    <section className="panel rounded-xl p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-hi">{canAct ? 'Need help with this order?' : 'Returns and refunds'}</h2>
      {canAct && (
        <div className="mt-3 flex flex-wrap gap-2">
          {as.canReturn && (
            <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => setAction('return')}>
              Return or exchange
            </Button>
          )}
          {as.canChangeAddress && (
            <Button size="sm" variant="secondary" icon={<MapPin className="size-4" />} onClick={() => setAction('address')}>
              Change address
            </Button>
          )}
          {as.canCancel && (
            <Button size="sm" variant="ghost" className="text-danger-ink" icon={<Ban className="size-4" />} onClick={() => setAction('cancel')}>
              Cancel order
            </Button>
          )}
        </div>
      )}
      {as.returnBy && as.canReturn && <p className="mt-2 text-xs text-low">Returns and exchanges are open until {formatDate(as.returnBy)}.</p>}

      {activeReturns.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {activeReturns.map((r) => (
            <li key={r.id} className="rounded-lg bg-[rgb(var(--field)/0.04)] p-3.5 hairline">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-hi">{r.code}</span>
                <span className="text-sm text-hi">{r.kind === 'exchange' ? 'Exchange' : 'Return'}</span>
                <span className="ml-auto">
                  <StatusChip status={r.status} />
                </span>
              </div>
              <p className="mt-1 text-xs text-mid">
                {r.items.map((i) => `${i.qty}× ${i.name}${i.exchangeLabel ? ` → ${i.exchangeLabel}` : ''}`).join(', ')}
              </p>
              {r.sellerNote && <p className="mt-1.5 text-xs text-hi">From the seller: {r.sellerNote}</p>}
              {r.replacementOrderCode && (
                <p className="mt-1.5 text-xs text-mid">
                  Replacement order{' '}
                  <Link to={`/o/${r.replacementOrderCode}`} state={{ phone }} className="font-mono text-jade-ink hover:underline">
                    {r.replacementOrderCode}
                  </Link>
                </p>
              )}
              {['requested', 'approved'].includes(r.status) && !r.replacementOrderId && (
                <button
                  className="mt-2 text-xs font-medium text-low underline underline-offset-2 hover:text-mid"
                  onClick={() => {
                    setWithdrawing({ id: r.id, code: r.code });
                    setAction('withdraw');
                  }}
                >
                  Withdraw this request
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {as.refunds.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {as.refunds.map((f) => (
            <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-mid">
                {f.status === 'processed' ? 'Refunded' : 'Refund on its way'}: <MoneyText paise={f.amount} className="font-medium text-hi" />
                {f.status === 'processed' && f.reference && <span className="text-xs text-low"> (ref {f.reference})</span>}
              </span>
              <span className="text-xs text-low">{formatDate(f.processedAt || f.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!action} onClose={() => setAction(null)} title={action ? titles[action] : undefined}>
        {action && !token ? (
          <Verify order={order} phone={phone} onToken={setToken} />
        ) : action === 'cancel' ? (
          <CancelForm busy={busy} onSubmit={(reason) => run(() => buyerCancel(order.orderCode, auth, reason), 'Order cancelled')} />
        ) : action === 'address' ? (
          <AddressForm initial={order.address} busy={busy} onSubmit={(a) => run(() => buyerChangeAddress(order.orderCode, auth, a), 'Address updated')} />
        ) : action === 'return' ? (
          <ReturnForm
            order={order}
            auth={auth}
            busy={busy}
            onSubmit={(input) => run(() => buyerRequestReturn(order.orderCode, auth, input), 'Request sent to the seller')}
          />
        ) : action === 'withdraw' && withdrawing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-mid">
              Withdraw request <span className="font-mono text-hi">{withdrawing.code}</span>? The seller sees that you withdrew it, and you
              can raise a new one while the return window is open.
            </p>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(() => buyerWithdrawReturn(order.orderCode, withdrawing.id, auth), 'Request withdrawn')}
            >
              Withdraw request
            </Button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

/**
 * WhatsApp offers from this store, on or off. Behind the same one-time code as
 * the other order actions; the stop link in every offer works without one.
 */
export function OffersPreference({ order, phone, onChanged }: { order: TrackedOrder; phone: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const m = order.marketing;
  if (!m) return null;

  const change = async (optIn: boolean) => {
    setBusy(true);
    try {
      await buyerSetMarketing(order.orderCode, { phone, orderToken: token }, optIn);
      toast('success', optIn ? 'You will get offers on WhatsApp' : 'Offers stopped', optIn ? undefined : 'Order updates still come through.');
      setOpen(false);
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setToken('');
      toast('error', 'That did not go through', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-52">
          <h2 className="text-[15px] font-semibold text-hi">Offers on WhatsApp</h2>
          <p className="mt-0.5 text-sm text-mid">
            {m.optedIn
              ? `You get offers and new arrivals from ${order.businessName}.`
              : `You don't get offers from ${order.businessName}. Order updates come either way.`}
          </p>
        </div>
        <Button size="sm" variant={m.optedIn ? 'ghost' : 'secondary'} onClick={() => setOpen(true)}>
          {m.optedIn ? 'Stop offers' : 'Get offers'}
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={m.optedIn ? 'Stop offers' : 'Offers on WhatsApp'}>
        {!token ? (
          <Verify order={order} phone={phone} onToken={setToken} />
        ) : m.optedIn ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-mid">
              {order.businessName} will stop sending you offers on WhatsApp. Updates about your orders still come through.
            </p>
            <Button loading={busy} onClick={() => change(false)}>
              Stop offers
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-mid">{m.wording}</p>
            <Button loading={busy} onClick={() => change(true)}>
              Yes, send me offers
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
}
