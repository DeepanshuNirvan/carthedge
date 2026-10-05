import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Clock, Podcast, Send, ShieldCheck, Trash2 } from 'lucide-react';
import type { Broadcast } from '@/api/types';
import { useBroadcastAudience, useBroadcastMutations, useBroadcasts } from '@/api/broadcasts';
import { useBusiness } from '@/api/business';
import { toast } from '@/store/ui';
import { formatDate, formatDateTime, timeAgo } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { StatusChip } from '@/ui/Badge';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Tabs } from '@/ui/Tabs';

/** datetime-local wants local wall time, not UTC */
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const segments: { value: Broadcast['segment']; label: string }[] = [
  { value: 'all', label: 'All customers' },
  { value: 'retail', label: 'Retail buyers' },
  { value: 'reseller', label: 'Resellers' },
  { value: 'repeat', label: 'Repeat buyers' },
];

const STORE_LINK = '{{store link}}';

export default function BroadcastsPage() {
  const { data: broadcasts, isLoading } = useBroadcasts();
  const { data: audience } = useBroadcastAudience();
  const { data: business } = useBusiness();
  const { create, send, remove, acceptTerms } = useBroadcastMutations();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState<Broadcast['segment']>('all');
  const [scheduledAt, setScheduledAt] = useState('');
  // the time picker only appears once the seller chooses to schedule
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [agreed, setAgreed] = useState(false);

  const accepted = !!audience?.termsAcceptedAt;
  // offers leave from the seller's own WhatsApp; until that can be connected
  // only drafts are possible (the API refuses the rest)
  const paused = audience?.canSend === false;
  const reach = audience?.optedIn[segment] ?? 0;
  const storeUrl = business ? `${window.location.origin}/s/${business.code}` : '';

  /** The broadcast rules are accepted once, the first time a drop goes out. */
  const ensureTerms = async () => {
    if (accepted) return true;
    if (!agreed) {
      toast('error', 'Accept the broadcast rules first', 'Tick the box above the send button.');
      return false;
    }
    try {
      await acceptTerms.mutateAsync();
      return true;
    } catch (e) {
      toast('error', 'Could not save that', e instanceof Error ? e.message : undefined);
      return false;
    }
  };

  const sendNow = async (id: string, done?: string) => {
    if (!(await ensureTerms())) return;
    send.mutate(id, {
      onSuccess: () => toast('success', done ?? 'Broadcast sending', 'Messages are going out now.'),
      onError: (e) => toast('error', 'Send failed', e.message),
    });
  };

  const submit = async (thenSend: boolean) => {
    if (!name || message.length < 5) {
      toast('error', 'Give the drop a name and a message');
      return;
    }
    if ((thenSend || scheduledAt) && !(await ensureTerms())) return;
    create.mutate(
      { name, message, segment, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined },
      {
        onSuccess: (b) => {
          if (thenSend) sendNow(b.id);
          else toast('success', scheduledAt ? 'Broadcast scheduled' : 'Draft saved');
          setName('');
          setMessage('');
          setScheduledAt('');
          setWhen('now');
        },
        onError: (e) => toast('error', 'Could not create broadcast', e.message),
      },
    );
  };

  return (
    <>
      <PageHeader title="Broadcasts" subtitle="Collection drops and announcements over WhatsApp, to buyers who asked for them" />
      <div className="grid items-start gap-4 lg:grid-cols-5 lg:items-stretch">
        <Card className="lg:col-span-3">
          <CardHeader title="Compose a drop" />
          <div className="flex flex-col gap-4 p-5 pt-4">
            {paused && (
              <p className="flex items-start gap-2.5 rounded-lg p-3.5 text-sm leading-snug text-mid neu">
                <Clock className="mt-0.5 size-4 shrink-0 text-jade-ink" aria-hidden />
                <span>
                  Offers go out from your own WhatsApp number, which you can connect soon. Until then, write and save drafts. Buyers&apos;
                  yes or no to offers keeps being recorded, so your audience is ready on day one.
                </span>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input placeholder="Diwali collection drop" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Audience">
                <Select value={segment} onChange={(e) => setSegment(e.target.value as Broadcast['segment'])}>
                  {segments.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                      {audience ? ` (${audience.optedIn[s.value]})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="-mt-1 flex items-start gap-2 text-xs leading-relaxed text-low">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-jade-ink" aria-hidden />
              <span>
                Only buyers who said yes to offers get broadcasts
                {audience && (
                  <>
                    : <span className="font-medium text-mid tnum">{audience.optedIn.all}</span> of{' '}
                    <span className="tnum">{audience.customers}</span> customers
                  </>
                )}
                . They tick a box at checkout or reply START, and every message ends with their own stop link.
              </span>
            </p>
            <Field label="Message" hint={`Keep it personal, broadcasts that read like DMs convert best. ${STORE_LINK} becomes your store link.`}>
              <Textarea
                rows={5}
                maxLength={1000}
                placeholder={'Naya collection aa gaya! ✨\nPehle 20 orders pe free shipping.\n' + STORE_LINK}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            {!paused && (
              <div className="flex flex-col gap-3">
                <Tabs
                  className="w-fit"
                  tabs={[
                    { value: 'now', label: 'Send now' },
                    { value: 'later', label: 'Schedule' },
                  ]}
                  value={when}
                  onChange={(v) => {
                    setWhen(v);
                    if (v === 'now') setScheduledAt('');
                  }}
                />
                {when === 'later' && (
                  <Field label="Send at">
                    <Input type="datetime-local" min={nowLocal()} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </Field>
                )}
              </div>
            )}

            {audience && !accepted && !paused && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-3.5 neu">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-jade-500" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="text-sm leading-snug text-mid">
                  I will only send offers buyers asked for, honour every stop request, and follow WhatsApp&apos;s Business and Commerce
                  policies.{' '}
                  <Link to="/terms#broadcasts-and-marketing-messages" target="_blank" className="font-medium text-jade-ink hover:underline">
                    Broadcast rules
                  </Link>
                </span>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {!paused && (
                <Button
                  icon={<Send className="size-4" />}
                  loading={create.isPending || send.isPending || acceptTerms.isPending}
                  disabled={(when === 'later' && !scheduledAt) || (!accepted && !agreed) || reach === 0}
                  onClick={() => submit(!scheduledAt)}
                >
                  {when === 'later' ? 'Schedule' : 'Send now'}
                </Button>
              )}
              {when === 'now' && (
                <Button variant={paused ? 'primary' : 'ghost'} loading={paused && create.isPending} onClick={() => submit(false)}>
                  Save as draft
                </Button>
              )}
              {audience && reach === 0 && !paused && (
                <span className="text-xs text-low">No one in this audience has said yes to offers yet.</span>
              )}
            </div>
            {accepted && audience?.termsAcceptedAt && (
              <p className="text-xs text-low">Broadcast rules accepted on {formatDate(audience.termsAcceptedAt)}.</p>
            )}
          </div>
        </Card>

        {/* WhatsApp-style live preview */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader title="Preview" subtitle="How buyers see it" />
          <div className="flex flex-1 flex-col p-5 pt-4">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col rounded-[2rem] bg-[linear-gradient(160deg,rgb(var(--ink-700)),rgb(var(--ink-950)))] p-2 shadow-float">
              <div className="min-h-56 flex-1 rounded-[1.6rem] bg-ink-950 p-4" data-theme="dark">
                <p className="mb-4 text-center text-[11px] text-low">Today</p>
                <div className="ml-auto w-fit max-w-[88%] rounded-[18px] rounded-br-md bg-jade-700 px-3.5 py-2 shadow-raised">
                  <p className="whitespace-pre-wrap break-words text-sm text-white">
                    {message ? message.split(STORE_LINK).join(storeUrl || STORE_LINK) : 'Your message shows here'}
                  </p>
                  {/* every buyer gets their own stop link at the foot */}
                  <p className="mt-2 break-words text-xs text-white/80">
                    No more offers from {business?.name ?? 'your store'}? Tap {window.location.host}/unsubscribe/…
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-white/90">
                    {new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    <CheckCheck className="size-3.5" aria-hidden />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="History" />
        <div className="p-5 pt-4">
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : broadcasts && broadcasts.length > 0 ? (
            <ul className="divide-y">
              {broadcasts.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3.5">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm font-medium text-hi">{b.name}</p>
                    <p className="truncate text-xs text-low">{b.message}</p>
                  </div>
                  <span className="text-xs capitalize text-mid">{b.segment}</span>
                  <StatusChip status={b.status} />
                  <span className="text-xs text-low tnum">
                    {b.sentCount > 0 && `${b.sentCount} sent, `}
                    {b.scheduledAt ? formatDateTime(b.scheduledAt) : timeAgo(b.createdAt)}
                  </span>
                  {b.status === 'draft' && !paused && (
                    <Button size="sm" variant="secondary" disabled={!accepted && !agreed} onClick={() => sendNow(b.id)}>
                      Send
                    </Button>
                  )}
                  {/* a sent drop is a record, not a draft — the API refuses to
                      delete it, so do not offer a button that always fails */}
                  {(b.status === 'draft' || b.status === 'scheduled') && (
                    <IconButton
                      label="Delete broadcast"
                      onClick={() =>
                        remove.mutate(b.id, {
                          onSuccess: () => toast('info', 'Broadcast deleted'),
                          onError: (e) => toast('error', 'Delete failed', e.message),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Podcast className="size-5" />}
              title="No broadcasts yet"
              message="Your past buyers are your warmest audience. Announce the next drop to the ones who asked for offers."
            />
          )}
        </div>
      </Card>
    </>
  );
}
