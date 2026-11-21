import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Instagram, MessageCircle, MessagesSquare, Phone, Plus, Send, Trash2 } from 'lucide-react';
import { enquiryStatuses, type Enquiry, type EnquiryStatus } from '@/api/types';
import { useEnquiries, useEnquiryMutations } from '@/api/enquiries';
import { toast } from '@/store/ui';
import { formatDateTime, timeAgo } from '@/lib/date';
import { formatPaise, paiseToRupees, rupeesToPaise } from '@/lib/money';
import { cn } from '@/lib/cn';
import { PageHeader } from '../shell/PageHeader';
import { Tabs } from '@/ui/Tabs';
import { Badge, StatusChip } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { buttonLink } from '@/ui/buttonLink';
import { Field, Input, Textarea } from '@/ui/Input';
import { Modal, Sheet } from '@/ui/Modal';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

const statusLabels: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
};

const emptyCopy: Record<EnquiryStatus, { title: string; message: string }> = {
  new: {
    title: 'No new enquiries',
    message: 'When someone asks about a service in your DMs, the assistant notes what they need and it lands here.',
  },
  contacted: { title: 'Nobody waiting on you', message: 'Enquiries you have replied to stay here until you quote a price.' },
  quoted: { title: 'No open quotes', message: 'Enquiries you have sent a price for wait here for the buyer to decide.' },
  won: { title: 'Nothing won yet', message: 'Mark an enquiry won when the buyer goes ahead.' },
  lost: { title: 'Nothing lost', message: 'Enquiries that did not work out are kept here, out of the way.' },
};

/** What they asked about: "Goa Beach Trip (Deluxe) × 4". */
const itemText = (e: Enquiry) =>
  e.items.map((it) => `${it.name}${it.option ? ` (${it.option})` : ''}${it.qty > 1 ? ` × ${it.qty}` : ''}`).join(', ');

function SourceBadge({ source }: { source: Enquiry['source'] }) {
  if (source === 'manual') return <Badge>Added by you</Badge>;
  const Icon = source === 'instagram' ? Instagram : MessageCircle;
  return (
    <Badge>
      <Icon className="size-3" aria-hidden /> {source === 'instagram' ? 'Instagram' : 'WhatsApp'}
    </Badge>
  );
}

function EnquiryRow({ enquiry, onOpen }: { enquiry: Enquiry; onOpen: () => void }) {
  return (
    <li>
      <button
        onClick={onOpen}
        className="panel flex w-full flex-col gap-2 rounded-xl p-4 text-left transition-[transform,box-shadow] duration-std ease-enter [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-raised"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold tracking-snug text-hi">{enquiry.name || enquiry.contactName || 'A buyer'}</span>
            <span className="block truncate text-sm text-mid">{itemText(enquiry) || 'General enquiry'}</span>
          </span>
          <span className="shrink-0 text-xs text-low">{timeAgo(enquiry.createdAt)}</span>
        </span>
        {enquiry.answers.length > 0 && (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mid">
            {enquiry.answers.slice(0, 3).map((a) => (
              <span key={a.label} className="min-w-0 max-w-full truncate">
                <span className="text-low">{a.label}:</span> {a.value}
              </span>
            ))}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-2">
          <SourceBadge source={enquiry.source} />
          {enquiry.quotedAmount > 0 && <Badge tone="jade">Quoted {formatPaise(enquiry.quotedAmount)}</Badge>}
        </span>
      </button>
    </li>
  );
}

/** The price the owner offers. It reaches the buyer on their chat while Meta's 24-hour window is open. */
function QuoteBox({ enquiry }: { enquiry: Enquiry }) {
  const { quote } = useEnquiryMutations();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(enquiry.quotedAmount ? paiseToRupees(enquiry.quotedAmount) : '');
    setNote(enquiry.quoteNote);
    setError('');
  }, [enquiry.id, enquiry.quotedAmount, enquiry.quoteNote]);

  const canSend = !!enquiry.conversationId && enquiry.chatOpen;
  const submit = () => {
    const paise = rupeesToPaise(amount);
    if (!paise) {
      setError('Enter the price you are quoting');
      return;
    }
    quote.mutate(
      { id: enquiry.id, amount: paise, note },
      {
        onSuccess: ({ sent }) =>
          sent
            ? toast('success', 'Quote sent on the chat', `${enquiry.name || 'The buyer'} has your price of ${formatPaise(paise)}.`)
            : toast('info', 'Price saved', 'It could not go on the chat, so message or call them with it.'),
        onError: (e) => toast('error', 'Could not save the quote', e.message),
      },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[13px] font-semibold text-mid">Your price</h3>
      <Field label="Quote (₹)" error={error}>
        <Input
          inputMode="decimal"
          placeholder="12000"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
        />
      </Field>
      <Field label="What it covers" optional hint="Sent with the price, in your words">
        <Textarea rows={2} maxLength={500} placeholder="Stay, breakfast and airport transfers for 4" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div>
        <Button icon={canSend ? <Send className="size-4" /> : undefined} loading={quote.isPending} onClick={submit}>
          {canSend ? 'Send quote on chat' : 'Save price'}
        </Button>
        {!canSend && (
          <p className="mt-2 text-xs leading-relaxed text-low">
            {enquiry.conversationId
              ? 'This buyer last wrote more than 24 hours ago, so Instagram and WhatsApp will not carry a new message. Call or message them yourself.'
              : 'This enquiry did not come from a chat. Call or message them with the price.'}
          </p>
        )}
      </div>
    </section>
  );
}

function EnquirySheet({ enquiry, onClose }: { enquiry: Enquiry | null; onClose: () => void }) {
  const { update, remove } = useEnquiryMutations();
  const [notes, setNotes] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);
  useEffect(() => setConfirmErase(false), [enquiry?.id]);
  useEffect(() => setNotes(enquiry?.sellerNotes ?? ''), [enquiry?.id, enquiry?.sellerNotes]);

  const save = (patch: Parameters<typeof update.mutate>[0]['patch'], done: string) =>
    enquiry &&
    update.mutate(
      { id: enquiry.id, patch },
      { onSuccess: () => toast('success', done), onError: (e) => toast('error', 'Could not save', e.message) },
    );

  return (
    <Sheet open={!!enquiry} onClose={onClose} title={enquiry?.name || enquiry?.contactName || 'Enquiry'}>
      {enquiry && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={enquiry.status} />
            <SourceBadge source={enquiry.source} />
            <span className="text-xs text-low">{formatDateTime(enquiry.createdAt)}</span>
          </div>

          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold text-mid">Asked for</h3>
            <p className="text-[15px] font-medium leading-snug text-hi">{itemText(enquiry) || 'General enquiry'}</p>
            {enquiry.answers.length > 0 && (
              <dl className="mt-3 divide-y rounded-xl bg-[rgb(var(--field)/0.04)] hairline">
                {enquiry.answers.map((a) => (
                  <div key={a.label} className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
                    <dt className="shrink-0 text-xs text-low">{a.label}</dt>
                    <dd className="min-w-0 break-words text-right text-sm text-hi">{a.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-mid">Reach them</h3>
            {enquiry.phone ? (
              <div className="flex flex-wrap gap-2">
                <a href={`tel:+91${enquiry.phone}`} className={buttonLink('secondary')}>
                  <Phone className="size-4" aria-hidden /> Call {enquiry.phone}
                </a>
                <a href={`https://wa.me/91${enquiry.phone}`} target="_blank" rel="noreferrer" className={buttonLink('secondary')}>
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </div>
            ) : (
              <p className="text-sm text-mid">No number on this enquiry.</p>
            )}
            {enquiry.conversationId && (
              <Link to={`/app/ai?conversation=${enquiry.conversationId}`} className={cn(buttonLink('ghost'), 'mt-2')}>
                <MessagesSquare className="size-4" aria-hidden /> Open the chat
              </Link>
            )}
          </section>

          <QuoteBox enquiry={enquiry} />

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-mid">Where it stands</h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Enquiry status">
              {enquiryStatuses.map((s) => (
                <button
                  key={s}
                  aria-pressed={enquiry.status === s}
                  disabled={update.isPending}
                  onClick={() => enquiry.status !== s && save({ status: s }, `Moved to ${statusLabels[s].toLowerCase()}`)}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-medium transition-colors duration-micro',
                    enquiry.status === s ? 'bg-hi text-bg' : 'neu text-mid hover:text-hi',
                  )}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Field label="Your notes" optional hint="Only you see these">
              <Textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {notes !== enquiry.sellerNotes && (
              <Button variant="secondary" size="sm" className="self-start" loading={update.isPending} onClick={() => save({ sellerNotes: notes }, 'Notes saved')}>
                Save notes
              </Button>
            )}
          </section>

          {/* a buyer may ask for their details to go (DPDP); one who only enquired is not in Customers */}
          <section className="border-t pt-5">
            {confirmErase ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-mid">Delete this enquiry with their name, number and answers? This cannot be undone. The chat itself stays.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={remove.isPending}
                    onClick={() =>
                      remove.mutate(enquiry.id, {
                        onSuccess: () => {
                          toast('success', 'Enquiry deleted');
                          onClose();
                        },
                        onError: (e) => toast('error', 'Could not delete it', e.message),
                      })
                    }
                  >
                    Delete for good
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmErase(false)}>
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-danger-ink" icon={<Trash2 className="size-4" />} onClick={() => setConfirmErase(true)}>
                Delete enquiry
              </Button>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

/** An enquiry that came by phone or in person, written down so it sits with the rest. */
function AddEnquiry({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create } = useEnquiryMutations();
  const blank = { name: '', phone: '', about: '', details: '' };
  const [form, setForm] = useState(blank);
  const set = (key: keyof typeof blank) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Add an enquiry">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(form, {
            onSuccess: () => {
              toast('success', 'Enquiry added');
              setForm(blank);
              onClose();
            },
            onError: (err) => toast('error', 'Could not add it', err.message),
          });
        }}
      >
        <Field label="Their name">
          <Input required maxLength={120} autoComplete="off" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Mobile number" optional>
          <Input inputMode="tel" maxLength={14} autoComplete="off" placeholder="98765 43210" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="What they asked for">
          <Input required maxLength={200} placeholder="Birthday decor for 40 guests" value={form.about} onChange={set('about')} />
        </Field>
        <Field label="Details" optional>
          <Textarea rows={3} maxLength={2000} placeholder="Date, place, budget, anything they told you" value={form.details} onChange={set('details')} />
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={create.isPending}>
            Add enquiry
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function EnquiriesPage() {
  const [status, setStatus] = useState<EnquiryStatus>('new');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useEnquiries(status);
  const list = data?.enquiries ?? [];
  // read from the list so the sheet follows edits; a move to another tab closes it
  const open = list.find((e) => e.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="People who asked about your services, with what they need. Reply, quote a price, and mark how it went."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Add enquiry
          </Button>
        }
      />

      {/* five tabs do not fit a phone: the rail scrolls sideways inside the page gutter */}
      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <Tabs
          className="w-max"
          value={status}
          onChange={(s) => {
            setStatus(s);
            setOpenId(null);
          }}
          tabs={enquiryStatuses.map((s) => ({ value: s, label: statusLabels[s], count: data?.counts[s] }))}
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : list.length > 0 ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((e) => (
            <EnquiryRow key={e.id} enquiry={e} onOpen={() => setOpenId(e.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ClipboardList className="size-5" />} title={emptyCopy[status].title} message={emptyCopy[status].message} />
      )}

      <EnquirySheet enquiry={open} onClose={() => setOpenId(null)} />
      <AddEnquiry open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
