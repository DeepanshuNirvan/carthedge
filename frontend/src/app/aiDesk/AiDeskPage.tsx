import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Check, Inbox as InboxIcon, Lock, MessageSquareText, Pause, Play, Send, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { AiDraft, ChatCart, ConversationMessage, ConversationSummary, DraftData } from '@/api/types';
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

// what the seller needs to know about a chat at a glance, most urgent first
const chatState = (c: Pick<ConversationSummary, 'stage' | 'draftId' | 'aiPaused'>) =>
  c.stage === 'handoff'
    ? { label: 'Needs you', tone: 'danger' as const }
    : c.draftId
      ? { label: 'Confirm order', tone: 'gold' as const }
      : c.stage === 'confirming'
        ? { label: 'Awaiting buyer', tone: 'neutral' as const }
        : c.aiPaused
          ? { label: 'AI paused', tone: 'neutral' as const }
          : null;

const authorLabel: Record<string, string> = { ai: 'AI', seller: 'You', system: 'Order update' };

function cartLine(cart: ChatCart | undefined) {
  const items = cart?.items ?? [];
  if (items.length === 0) return '';
  const parts = [items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ''}`).join(', ')];
  if (cart?.name) parts.push(cart.name);
  if (cart?.address.pincode) parts.push(cart.address.pincode);
  if (cart?.payment) parts.push(cart.payment.toUpperCase());
  return parts.join(' · ');
}

/** a buyer wrote moments ago and the assistant is on: it is composing the answer */
const replyingNow = (c: ConversationSummary) =>
  !c.aiPaused && c.stage !== 'handoff' && c.unread > 0 && Date.now() - new Date(c.lastMessageAt).getTime() < 90_000;

function Inbox({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: convos, isLoading } = useConversations();
  return (
    <Card className="mt-4">
      <CardHeader title="Inbox" subtitle="DMs captured automatically from your connected channels" />
      <div className="p-5 pt-4">
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : convos && convos.length > 0 ? (
          <ul className="-mx-2 divide-y">
            {convos.map((c) => {
              const b = sourceBadge(c.channel);
              const state = chatState(c);
              return (
                <li key={c.id}>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-[rgb(var(--field)/0.05)]"
                    onClick={() => onOpen(c.id)}
                  >
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--field)/0.08)] text-sm font-semibold text-mid">
                      {(c.contactName || c.contactId || '?')[0]?.toUpperCase()}
                      {c.unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-jade-500 px-1 text-[10px] font-bold text-[rgb(var(--text-on-accent))] ring-2 ring-[rgb(var(--surface))]">
                          {c.unread}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate text-sm text-hi', c.unread > 0 ? 'font-semibold' : 'font-medium')}>
                          {c.contactName || c.contactId}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-low">{timeAgo(c.lastMessageAt)}</span>
                      </span>
                      {replyingNow(c) ? (
                        <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-jade-ink">
                          <span className="flex items-center gap-0.5" aria-hidden>
                            <span className="typing-dot !size-[5px]" />
                            <span className="typing-dot !size-[5px]" />
                            <span className="typing-dot !size-[5px]" />
                          </span>
                          Assistant replying
                        </span>
                      ) : (
                        <span className="mt-0.5 block truncate text-xs text-low">{c.preview}</span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {b && <Badge tone={b.tone}>{b.label}</Badge>}
                        {state && <Badge tone={state.tone}>{state.label}</Badge>}
                        {c.lastOrderCode && (
                          <Badge tone="jade">
                            {c.lastOrderCode}, {c.lastOrderStatus}
                          </Badge>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<InboxIcon className="size-5" />}
            title="No conversations yet"
            message="Connect Instagram or WhatsApp in Settings. Buyer DMs then appear here as order drafts, automatically."
          />
        )}
      </div>
    </Card>
  );
}

/** The chat as the buyer sees it, newest at the bottom. When the last word is the
 *  buyer's and the assistant is on, it shows the assistant composing: replies land
 *  within seconds of the buyer going quiet. */
function Thread({ messages, replying }: { messages: ConversationMessage[]; replying: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const composing =
    replying && last?.direction === 'in' && Date.now() - new Date(last.createdAt).getTime() < 90_000;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, composing]);

  return (
    <div className="flex max-h-[22rem] flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-lg bg-[rgb(var(--field)/0.04)] p-3 hairline">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showAuthor = m.direction === 'out' && authorLabel[m.author] && prev?.author !== m.author;
        return (
          <div key={i} className={cn('flex max-w-[85%] flex-col gap-0.5', m.direction === 'in' ? '' : 'ml-auto items-end')}>
            {showAuthor && <span className="px-1 pt-1.5 text-[11px] font-medium text-low">{authorLabel[m.author]}</span>}
            <div
              className={cn(
                'whitespace-pre-wrap rounded-[18px] px-3.5 py-2 text-sm text-hi',
                m.direction === 'in'
                  ? 'rounded-bl-md bg-[rgb(var(--field)/0.09)]'
                  : m.author === 'seller'
                    ? 'rounded-br-md bg-info/14'
                    : 'rounded-br-md bg-jade-500/16',
              )}
            >
              {m.body}
            </div>
          </div>
        );
      })}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ml-auto flex items-center gap-2"
            aria-live="polite"
          >
            <span className="text-[11px] text-low">Assistant is replying</span>
            <span className="flex items-center gap-1 rounded-[18px] rounded-br-md bg-jade-500/16 px-3.5 py-3 text-jade-ink">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={end} />
    </div>
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
  const { reply, setAi } = useChannelMutations();
  const [text, setText] = useState('');
  const draft = conv?.draftId ? drafts.find((d) => d.id === conv.draftId && d.status === 'pending') : undefined;
  const building = cartLine(conv?.cart);

  return (
    <Modal open onClose={onClose} title={conv ? conv.contactName || conv.contactId : 'Conversation'} wide>
      {isLoading || !conv ? (
        <SkeletonRows rows={4} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {chatState(conv) && <Badge tone={chatState(conv)!.tone}>{chatState(conv)!.label}</Badge>}
            <span className="text-xs text-low">
              {conv.aiPaused ? 'Assistant paused on this chat' : 'Assistant replying on this chat'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              icon={conv.aiPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
              loading={setAi.isPending}
              onClick={() =>
                setAi.mutate(
                  { id, paused: !conv.aiPaused },
                  {
                    onSuccess: () => toast('success', conv.aiPaused ? 'Assistant resumed' : 'Assistant paused'),
                    onError: (e) => toast('error', 'Could not update', e.message),
                  },
                )
              }
            >
              {conv.aiPaused ? 'Resume AI' : 'Pause AI'}
            </Button>
          </div>
          {conv.stage === 'handoff' && (
            <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-hi">
              The assistant stepped back because this buyer needs you. Reply below, then resume the assistant when you are done.
            </p>
          )}
          <Thread messages={conv.messages} replying={!conv.aiPaused && conv.stage !== 'handoff'} />
          {building && !draft && (
            <p className="mt-3 text-xs text-low">
              Order being built: <span className="text-mid">{building}</span>
            </p>
          )}
          {draft && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-jade-500/30 bg-jade-500/10 p-3">
              <p className="text-sm text-hi">The assistant drafted an order from this chat. Check it before it is placed.</p>
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

      <h3 className="mb-2 mt-5 text-[13px] font-semibold text-mid">Items</h3>
      <ul className="divide-y rounded-lg bg-[rgb(var(--field)/0.04)] px-4 hairline">
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
          <CardHeader
            title="Parse a DM thread"
            subtitle="Hinglish works: item, size, address, payment"
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
                  See plans
                </Link>
              </p>
            )}
            {reply && (
              <div className="rounded-lg bg-[rgb(var(--field)/0.04)] p-4 hairline">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-hi">{reply}</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(reply)}>
                  {copied ? 'Copied' : 'Copy reply'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Inbox onOpen={setOpenConvId} />

      <Card className="mt-4">
        <CardHeader title="Pending drafts" subtitle="Parsed orders from DMs or a paste, waiting for your one-tap confirm" />
        <div className="p-5 pt-4">
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : pending.length > 0 ? (
            <ul className="divide-y">
              {pending.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5">
                  {/* lit only where the seller is needed (unsure, or nothing matched). The draft is the AI's reading, so it is set in hairline
                      (dotted) type until confirmed; how sure it is reads as words, not a score pill. */}
                  <span className="bulb size-2 shrink-0" data-lit={d.confidence < 80 || d.draft.items.length === 0} />
                  <div className="min-w-0 flex-1 basis-[80%] sm:basis-0">
                    <p className="truncate text-sm text-hi">
                      <span className="font-medium">{d.draft.customerName || 'Unknown buyer'}</span>
                      <span className="text-low">, </span>
                      <span className="text-mid underline decoration-dotted decoration-[rgb(var(--text-low)/0.6)] underline-offset-[3px]">
                        {d.draft.items.map((i) => `${i.qty}x ${i.name}`).join(', ') || 'no items matched'}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-low">{d.conversation.slice(0, 90)}…</p>
                  </div>
                  {sourceBadge(d.source) && <Badge tone={sourceBadge(d.source)!.tone}>{sourceBadge(d.source)!.label}</Badge>}
                  <span className={cn('text-xs font-medium', d.confidence >= 80 ? 'text-jade-ink' : 'text-gold-ink')}>
                    {d.confidence >= 80 ? 'AI is sure' : d.confidence >= 50 ? 'Check details' : 'Needs a closer look'}
                  </span>
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
