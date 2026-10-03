import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Lock, RotateCcw, Send } from 'lucide-react';
import { useBusiness, useUpdateAiSettings, useUpdateSettings } from '@/api/business';
import { useCan } from '@/api/plans';
import { practiceTurn } from '@/api/ai';
import type { AiProfile, ChatCart, ChatStage, OpenDay } from '@/api/types';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { SkeletonRows } from '@/ui/Skeleton';
import { RupeeField, ToggleRow, useDraft } from './form';

// How the DM assistant behaves. Replies need the aiReply capability; without it
// chats still become drafts (the "ai" capability), which is today's behaviour.
function AutomationCard() {
  const { data: business } = useBusiness();
  const update = useUpdateAiSettings();
  const canReply = useCan('aiReply');
  const [notes, setNotes] = useState<string | null>(null);

  if (!business) return null;
  const save = (input: Parameters<typeof update.mutate>[0], done: string) =>
    update.mutate(input, {
      onSuccess: () => toast('success', done),
      onError: (e) => toast('error', 'Could not save', e.message),
    });
  const notesValue = notes ?? business.aiNotes;

  return (
    <Card>
      <CardHeader
        title="AI assistant"
        subtitle="Answers buyers in your DMs, in their language, from your catalog only"
        action={
          <span className="grid size-9 place-items-center rounded-full bg-jade-500/15 text-jade-ink">
            <Bot className="size-4.5" />
          </span>
        }
      />
      <div className="flex flex-col gap-5 p-5 pt-4">
        {!canReply.allowed && !canReply.isLoading && (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-gold-400/10 p-3 text-xs text-mid shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.22)]">
            <Lock className="size-3.5" /> Automatic replies need a higher plan, chats still become order drafts.
            <Link to="/app/billing" className="font-medium text-jade-ink hover:underline">
              See plans
            </Link>
          </p>
        )}
        <ToggleRow
          checked={business.aiAutoReply}
          title="Reply to buyers automatically"
          disabled={!canReply.allowed || update.isPending}
          onChange={(autoReply) => save({ autoReply }, autoReply ? 'Auto-reply on' : 'Auto-reply off')}
        >
          Answers price, size, stock and delivery questions, collects the order and shows the buyer a summary to confirm.
          Off: chats only become drafts for you.
        </ToggleRow>
        <ToggleRow
          checked={business.aiAutoOrder}
          title="Place orders without my confirmation"
          disabled={!canReply.allowed || !business.aiAutoReply || update.isPending}
          onChange={(autoOrder) => save({ autoOrder }, autoOrder ? 'Orders place automatically' : 'You confirm each order')}
        >
          When the buyer says yes to the summary, the order is created and they get the order link right away. Off: you get
          a ready draft to confirm in one tap, then the buyer gets the link.
        </ToggleRow>
        <Field
          label="What the assistant should know"
          hint="Fabric care, sizing, anything not covered by your policies. It never makes these up; anything not here, it checks with you."
        >
          <Textarea
            rows={4}
            maxLength={2000}
            placeholder={'Kurtis are true to size.\nWe dispatch from Jaipur.'}
            value={notesValue}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Button
          variant="secondary"
          className="self-start"
          loading={update.isPending}
          disabled={notes === null || notes === business.aiNotes}
          onClick={() => save({ notes: notesValue }, 'Assistant notes saved')}
        >
          Save notes
        </Button>
      </div>
    </Card>
  );
}

// Monday first, the way a shop writes its hours; index = JS weekday
const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const blankDays = (): OpenDay[] => Array.from({ length: 7 }, (_, i) => ({ open: i !== 0, from: '10:00', to: '19:00' }));

/** Tone, language, hours and what the assistant may handle itself. */
function ProfileCard() {
  const { data: business } = useBusiness();
  const save = useUpdateSettings('ai');
  const { draft, update, saved } = useDraft<AiProfile>(business?.aiProfile);
  if (!business || !draft) return <SkeletonRows rows={5} />;
  const days = draft.hours.days?.length === 7 ? draft.hours.days : blankDays();
  const setDay = (i: number, patch: Partial<OpenDay>) =>
    update({ hours: { ...draft.hours, days: days.map((d, j) => (j === i ? { ...d, ...patch } : d)) } });
  const handles = draft.handles;
  const setHandle = (k: keyof AiProfile['handles'], v: boolean) => update({ handles: { ...handles, [k]: v } });

  return (
    <Card>
      <CardHeader title="How it talks and when it steps back" subtitle="Applies to every chat the assistant answers" />
      <div className="flex flex-col gap-6 p-5 pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tone">
            <Select value={draft.tone} onChange={(e) => update({ tone: e.target.value as AiProfile['tone'] })}>
              <option value="">Warm and friendly</option>
              <option value="formal">Polite and professional</option>
              <option value="fun">Playful and chatty</option>
            </Select>
          </Field>
          <Field label="Reply language">
            <Select value={draft.language} onChange={(e) => update({ language: e.target.value as AiProfile['language'] })}>
              <option value="">Same as the buyer</option>
              <option value="english">Always English</option>
              <option value="hinglish">Always Hinglish</option>
              <option value="hindi">Always Hindi (देवनागरी)</option>
            </Select>
          </Field>
          <Field label="Emojis">
            <Select value={draft.emoji} onChange={(e) => update({ emoji: e.target.value as AiProfile['emoji'] })}>
              <option value="">Now and then</option>
              <option value="none">Never</option>
              <option value="lots">Often</option>
            </Select>
          </Field>
          <Field label="In Hindi, address buyers as">
            <Select value={draft.address} onChange={(e) => update({ address: e.target.value as AiProfile['address'] })}>
              <option value="">Aap (respectful)</option>
              <option value="tum">Tum (friendly)</option>
            </Select>
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-medium text-hi">Let the assistant handle</legend>
          <ToggleRow checked={handles.returns} onChange={(v) => setHandle('returns', v)} title="Return and exchange questions">
            Explains your policy and sends the buyer to their order page to raise it. Off: it hands the chat to you.
          </ToggleRow>
          <ToggleRow checked={handles.cancel} onChange={(v) => setHandle('cancel', v)} title="Cancelling or changing an order">
            Points to the order page, where buyers cancel or change the address within your rules.
          </ToggleRow>
          <ToggleRow checked={handles.bargain} onChange={(v) => setHandle('bargain', v)} title="Price bargaining">
            Holds your price politely. Off: it says you will check and alerts you.
          </ToggleRow>
          <ToggleRow checked={handles.offers} onChange={(v) => setHandle('offers', v)} title="Mention live coupon codes">
            Shares your active offers when a buyer asks for a discount.
          </ToggleRow>
          <ToggleRow checked={handles.bulk} onChange={(v) => setHandle('bulk', v)} title="Bulk and wholesale questions">
            Answers from your notes and FAQs. Off: bulk enquiries come to you.
          </ToggleRow>
          <p className="text-xs text-low">Complaints, abuse and requests to talk to you always come to you.</p>
        </fieldset>

        <RupeeField
          label="Send orders above this amount to me"
          hint="The assistant stops before the summary and alerts you. Leave empty for no limit."
          value={draft.handoffAbove}
          optional
          onChange={(handoffAbove) => update({ handoffAbove })}
        />

        <fieldset className="flex flex-col gap-3">
          <ToggleRow
            checked={draft.hours.enabled}
            onChange={(enabled) => update({ hours: { enabled, days } })}
            title="Business hours"
          >
            The assistant tells buyers when you are next open, and your away message goes out after hours.
          </ToggleRow>
          {draft.hours.enabled && (
            <div className="flex flex-col divide-y rounded-lg bg-[rgb(var(--field)/0.04)] px-3 hairline">
              {dayOrder.map((i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                  <span className="flex w-36 items-center gap-2.5">
                    <Switch checked={days[i].open} onChange={(open) => setDay(i, { open })} label={`Open on ${dayNames[i]}`} />
                    <span className={cn('text-sm', days[i].open ? 'text-hi' : 'text-low')}>{dayNames[i]}</span>
                  </span>
                  {days[i].open ? (
                    <span className="flex items-center gap-2">
                      <Input type="time" aria-label={`${dayNames[i]} opens`} value={days[i].from} onChange={(e) => setDay(i, { from: e.target.value })} className="h-10 w-32" />
                      <span className="text-xs text-low">to</span>
                      <Input type="time" aria-label={`${dayNames[i]} closes`} value={days[i].to} onChange={(e) => setDay(i, { to: e.target.value })} className="h-10 w-32" />
                    </span>
                  ) : (
                    <span className="text-xs text-low">Closed</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {draft.hours.enabled && (
            <>
              <Field label="Who answers during business hours">
                <Select value={draft.replyWhen} onChange={(e) => update({ replyWhen: e.target.value as AiProfile['replyWhen'] })}>
                  <option value="">The assistant, all day</option>
                  <option value="closed">Me — the assistant covers only after hours</option>
                </Select>
              </Field>
              <Field label="Away message" optional hint="Sent once per chat when you are closed and the assistant is not replying">
                <Textarea rows={2} maxLength={500} placeholder="Thanks for your message! We are closed right now and reply from 10 am." value={draft.away} onChange={(e) => update({ away: e.target.value })} />
              </Field>
            </>
          )}
        </fieldset>

        <Button
          className="self-start"
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { ...draft, hours: { ...draft.hours, days } },
              {
                onSuccess: () => {
                  saved();
                  toast('success', 'Assistant settings saved');
                },
                onError: (e) => toast('error', 'Could not save', e.message),
              },
            )
          }
        >
          Save assistant settings
        </Button>
      </div>
    </Card>
  );
}

type Line = { who: 'buyer' | 'shop'; text: string; note?: boolean };

/**
 * Chat with your own assistant before it talks to buyers: real replies from
 * your catalog, policies and settings. Nothing is ordered or sent.
 */
function PracticeCard() {
  const canReply = useCan('aiReply');
  const [lines, setLines] = useState<Line[]>([]);
  const [state, setState] = useState<{ cart?: ChatCart; stage?: ChatStage; summaryHash?: string }>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  // block body: scrollIntoView returns a Promise in current Chrome, which React would take as the cleanup
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines.length, busy]);

  const send = async () => {
    const message = text.trim();
    if (!message || busy) return;
    const next: Line[] = [...lines, { who: 'buyer', text: message }];
    setLines(next);
    setText('');
    setBusy(true);
    try {
      const res = await practiceTurn({
        messages: next.filter((l) => !l.note).slice(-40).map(({ who, text }) => ({ who, text })),
        ...state,
      });
      setState({ cart: res.cart, stage: res.stage, summaryHash: res.summaryHash });
      setLines((l) => [
        ...l,
        ...res.messages.map((m) => ({ who: 'shop' as const, text: m })),
        ...(res.note ? [{ who: 'shop' as const, text: res.note, note: true }] : []),
      ]);
    } catch (e) {
      toast('error', 'No reply', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Try your assistant"
        subtitle="Write as a buyer would. Replies use your live catalog and settings; nothing is ordered or sent."
        action={
          lines.length > 0 ? (
            <IconButton label="Start over" onClick={() => (setLines([]), setState({}))}>
              <RotateCcw className="size-4" />
            </IconButton>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 p-5 pt-4">
        {!canReply.allowed && !canReply.isLoading ? (
          <p className="flex items-center gap-2 text-xs text-low">
            <Lock className="size-3.5" /> Practice chats need a plan with the reply assistant.
          </p>
        ) : (
          <>
            <div className="flex min-h-40 max-h-[24rem] flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-lg bg-[rgb(var(--field)/0.04)] p-3 hairline" aria-live="polite">
              {lines.length === 0 && (
                <p className="m-auto max-w-[36ch] text-center text-xs text-low">
                  Try “M size available hai?”, “return policy kya hai?” or a full order with name, phone and address.
                </p>
              )}
              {lines.map((l, i) =>
                l.note ? (
                  <p key={i} className="mx-auto my-1 max-w-[46ch] text-center text-[11.5px] text-low">
                    {l.text}
                  </p>
                ) : (
                  <div key={i} className={cn('flex max-w-[85%] flex-col', l.who === 'buyer' ? '' : 'ml-auto items-end')}>
                    <div
                      className={cn(
                        'whitespace-pre-wrap rounded-[18px] px-3.5 py-2 text-sm text-hi',
                        l.who === 'buyer' ? 'rounded-bl-md bg-[rgb(var(--field)/0.09)]' : 'rounded-br-md bg-jade-500/16',
                      )}
                    >
                      {l.text}
                    </div>
                  </div>
                ),
              )}
              <AnimatePresence>
                {busy && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="ml-auto flex items-center gap-1 rounded-[18px] rounded-br-md bg-jade-500/16 px-3.5 py-3 text-jade-ink"
                  >
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </motion.span>
                )}
              </AnimatePresence>
              <div ref={end} />
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input value={text} maxLength={1000} placeholder="Message as a buyer…" onChange={(e) => setText(e.target.value)} aria-label="Practice message" className="rounded-full" />
              <Button type="submit" disabled={!text.trim()} loading={busy} icon={<Send className="size-4" />} aria-label="Send">
                <span className="max-sm:hidden">Send</span>
              </Button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
}

export function AssistantTab() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <AutomationCard />
        <PracticeCard />
      </div>
      <div className="min-w-0">
        <ProfileCard />
      </div>
    </div>
  );
}
