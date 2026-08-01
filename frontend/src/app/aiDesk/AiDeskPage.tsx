import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Check, Inbox as InboxIcon, Lock, MessageSquareText, Send, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { AiDraft, DraftData } from '@/api/types';
import { useAiMutations, useDrafts } from '@/api/ai';
import { useConversation, useConversations, useChannelMutations } from '@/api/messaging';
import { useCan } from '@/api/plans';
import { toast } from '@/store/ui';
import { useCopy } from '@/hooks/useCopy';
import { timeAgo } from '@/lib/date';
import { cn } from '@/lib/cn';
import { PageHeader } from '../shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { MoneyText } from '@/ui/MoneyText';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';

const sourceBadge = (source?: string) =>
  source === 'whatsapp'
    ? { label: 'WhatsApp', tone: 'jade' as const }
    : source === 'instagram'
      ? { label: 'Instagram', tone: 'gold' as const }
      : null;

function Inbox({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: convos, isLoading } = useConversations();
  return (
    <Card className="mt-4">
      <CardHeader title="Inbox" subtitle="DMs captured automatically from your connected channels" />
      <div className="p-5 pt-4">
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : convos && convos.length > 0 ? (
          <ul className="divide-y">
            {convos.map((c) => {
              const b = sourceBadge(c.channel);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
                  <button className="min-w-0 flex-1 basis-full text-left sm:basis-0" onClick={() => onOpen(c.id)}>
                    <p className="flex items-center gap-2 text-sm font-medium text-hi">
                      {c.contactName || c.contactId}
                      {c.unread > 0 && (
                        <span className="rounded-full bg-jade-500/20 px-1.5 text-[10px] font-semibold text-jade-ink">
                          {c.unread} new
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-low">{c.preview}</p>
                  </button>
                  {b && <Badge tone={b.tone}>{b.label}</Badge>}
                  {c.draftId && <Badge tone="jade">draft ready</Badge>}
                  <span className="hidden text-xs text-low sm:inline">{timeAgo(c.lastMessageAt)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<InboxIcon className="size-5" />}
            title="No conversations yet"
            message="Connect Instagram or WhatsApp in Settings — buyer DMs then appear here as order drafts, automatically."
          />
        )}
      </div>
    </Card>
  );
}

function ConversationModal({
  id,
  drafts,
  onReview,
  onClose,
}: {
  id: string;
  drafts: AiDraft[];
  onReview: (d: AiDraft) => void;
  onClose: () => void;
}) {
  const { data: conv, isLoading } = useConversation(id);
  const { reply } = useChannelMutations();
  const [text, setText] = useState('');
  const draft = conv?.draftId ? drafts.find((d) => d.id === conv.draftId && d.status === 'pending') : undefined;

  return (
    <Modal open onClose={onClose} title={conv ? conv.contactName || conv.contactId : 'Conversation'} wide>
      {isLoading || !conv ? (
        <SkeletonRows rows={4} />
      ) : (
        <>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-md bg-surface-2 p-3">
            {conv.messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm text-hi',
                  m.direction === 'in' ? 'bg-surface-3' : 'ml-auto bg-jade-500/15',
                )}
              >
                {m.body}
              </div>
            ))}
          </div>
          {draft && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-jade-500/30 bg-jade-500/10 p-3">
              <p className="text-sm text-hi">AI drafted an order from this chat · {draft.confidence}% confident</p>
              <Button size="sm" onClick={() => onReview(draft)}>
                Review &amp; confirm
              </Button>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Input placeholder={`Reply on ${conv.channel}…`} value={text} onChange={(e) => setText(e.target.value)} />
            <Button
              icon={<Send className="size-4" />}
              loading={reply.isPending}
              onClick={() =>
                reply.mutate(
                  { id, text },
                  { onSuccess: () => setText(''), onError: (e) => toast('error', 'Reply failed', e.message) },
                )
              }
            >
              Send
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DraftReview({ draft, onClose }: { draft: AiDraft | null; onClose: () => void }) {
  const { confirm, discard } = useAiMutations();
  const [edited, setEdited] = useState<DraftData | null>(null);
  const data = edited ?? draft?.draft ?? null;

  if (!draft || !data) return <Modal open={false} onClose={onClose} title="Draft" children={null} />;

  const setField = (patch: Partial<DraftData>) => setEdited({ ...data, ...patch });
  const setAddress = (patch: Partial<DraftData['address']>) =>
    setEdited({ ...data, address: { ...data.address, ...patch } });

  return (
    <Modal open onClose={onClose} title="Review draft order" wide>
      <div className="mb-4 flex items-center gap-2">
        <Badge tone={draft.confidence >= 80 ? 'jade' : 'gold'}>
          <Sparkles className="size-3" /> {draft.confidence}% confident
        </Badge>
        <span className="text-xs text-low">{timeAgo(draft.createdAt)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Buyer name">
          <Input value={data.customerName} onChange={(e) => setField({ customerName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={data.phone} onChange={(e) => setField({ phone: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Input value={data.address.line} onChange={(e) => setAddress({ line: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          <Field label="City">
            <Input value={data.address.city} onChange={(e) => setAddress({ city: e.target.value })} />
          </Field>
          <Field label="State">
            <Input value={data.address.state} onChange={(e) => setAddress({ state: e.target.value })} />
          </Field>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Pincode">
              <Input value={data.address.pincode} onChange={(e) => setAddress({ pincode: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-low">Items</h3>
      <ul className="divide-y rounded-md bg-surface-2 px-4">
        {data.items.map((item, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-hi">
              {item.qty}× {item.name}
              {item.variant && <span className="text-low"> · {item.variant}</span>}
              {item.productId ? (
                <Badge tone="jade" className="ml-2">matched</Badge>
              ) : (
                <Badge tone="gold" className="ml-2">custom</Badge>
              )}
            </span>
            <MoneyText paise={item.price * item.qty} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-low">
        Payment: <span className="uppercase text-mid">{data.paymentMethod || 'cod'}</span>
        {data.notes && <> · {data.notes}</>}
      </p>

      <div className="mt-6 flex gap-3">
        <Button
          icon={<Check className="size-4" />}
          loading={confirm.isPending}
          onClick={() =>
            confirm.mutate(
              { id: draft.id, overrides: edited ?? undefined },
              {
                onSuccess: () => {
                  toast('success', 'Order created', 'It is now on your board as new.');
                  onClose();
                },
                onError: (e) => toast('error', 'Could not confirm', e.message),
              },
            )
          }
        >
          Confirm order
        </Button>
        <Button
          variant="ghost"
          icon={<Trash2 className="size-4" />}
          loading={discard.isPending}
          onClick={() =>
            discard.mutate(draft.id, {
              onSuccess: () => {
                toast('info', 'Draft discarded');
                onClose();
              },
            })
          }
        >
          Discard
        </Button>
      </div>
    </Modal>
  );
}

export default function AiDeskPage() {
  const [conversation, setConversation] = useState('');
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [reviewing, setReviewing] = useState<AiDraft | null>(null);
  const [openConvId, setOpenConvId] = useState<string | null>(null);
  const { data: drafts, isLoading } = useDrafts();
  const { parse, reply: replyMut } = useAiMutations();
  const canReply = useCan('aiReply').allowed;
  const { copied, copy } = useCopy();

  const doParse = () => {
    if (conversation.trim().length < 10) {
      toast('error', 'Paste the whole thread', 'A few lines of chat give the AI enough to work with.');
      return;
    }
    parse.mutate(conversation, {
      onSuccess: (draft) => {
        setConversation('');
        setReviewing(draft);
      },
      onError: (e) => toast('error', 'Could not parse', e.message),
    });
  };

  const pending = (drafts ?? []).filter((d) => d.status === 'pending');

  return (
    <>
      <PageHeader title="AI order desk" subtitle="Paste a chat, get an order" />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card glass className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-jade-400 to-transparent"
          />
          <div
            aria-hidden
            className="absolute -right-16 -top-16 size-40 rounded-full bg-jade-500/12 blur-3xl"
          />
          <CardHeader
            title="Parse a DM thread"
            subtitle="Hinglish works — item, size, address, payment"
            action={
              <span className="grid size-9 place-items-center rounded-full bg-jade-500/15 text-jade-ink">
                <Sparkles className="size-4.5" />
              </span>
            }
          />
          <div className="relative flex flex-col gap-4 p-5 pt-4">
            <Textarea
              rows={7}
              placeholder={'pink wali kurti M size chahiye\nCOD karwa do\n45 Civil Lines Delhi 110054\nPriya 98110 43210'}
              value={conversation}
              onChange={(e) => setConversation(e.target.value)}
              aria-label="DM conversation"
            />
            <Button icon={<Wand2 className="size-4" />} loading={parse.isPending} onClick={doParse}>
              {parse.isPending ? 'Reading the chat…' : 'Draft the order'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Reply assistant" subtitle="Draft a pre-sales answer in your tone" />
          <div className="flex flex-col gap-4 p-5 pt-4">
            <Field label="Buyer's question">
              <Input
                placeholder="kya isme XL milega? delivery kitne din?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!canReply}
              />
            </Field>
            {canReply ? (
              <Button
                variant="secondary"
                icon={<MessageSquareText className="size-4" />}
                loading={replyMut.isPending}
                onClick={() =>
                  replyMut.mutate(question, {
                    onSuccess: (r) => setReply(r.reply),
                    onError: (e) => toast('error', 'No reply generated', e.message),
                  })
                }
              >
                Suggest reply
              </Button>
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-xs text-low">
                <Lock className="size-3.5" /> The reply assistant needs a higher plan.
                <Link to="/app/billing" className="font-medium text-jade-ink hover:underline">
                  See plans →
                </Link>
              </p>
            )}
            {reply && (
              <div className="rounded-md bg-surface-2 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-hi">{reply}</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(reply)}>
                  {copied ? 'Copied ✓' : 'Copy reply'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Inbox onOpen={setOpenConvId} />

      <Card className="mt-4">
        <CardHeader title="Pending drafts" subtitle="Parsed orders waiting for your one-tap confirm — from DMs or paste" />
        <div className="p-5 pt-4">
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : pending.length > 0 ? (
            <ul className="divide-y">
              {pending.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="truncate text-sm font-medium text-hi">
                      {d.draft.customerName || 'Unknown buyer'} ·{' '}
                      {d.draft.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || 'no items matched'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-low">{d.conversation.slice(0, 90)}…</p>
                  </div>
                  {sourceBadge(d.source) && <Badge tone={sourceBadge(d.source)!.tone}>{sourceBadge(d.source)!.label}</Badge>}
                  <Badge tone={d.confidence >= 80 ? 'jade' : 'gold'}>{d.confidence}%</Badge>
                  <span className="hidden text-xs text-low sm:inline">{timeAgo(d.createdAt)}</span>
                  <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setReviewing(d)}>
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Bot className="size-5" />}
              title="No drafts waiting"
              message="Parsed chats appear here until you confirm or discard them."
            />
          )}
        </div>
      </Card>

      {openConvId && (
        <ConversationModal
          id={openConvId}
          drafts={drafts ?? []}
          onReview={(d) => {
            setOpenConvId(null);
            setReviewing(d);
          }}
          onClose={() => setOpenConvId(null)}
        />
      )}
      {reviewing && <DraftReview draft={reviewing} onClose={() => setReviewing(null)} />}
    </>
  );
}
