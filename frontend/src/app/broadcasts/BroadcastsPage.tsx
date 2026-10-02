import { useState } from 'react';
import { CheckCheck, Podcast, Send, Trash2 } from 'lucide-react';
import { useBroadcastMutations, useBroadcasts } from '@/api/broadcasts';
import { toast } from '@/store/ui';
import { formatDateTime, timeAgo } from '@/lib/date';
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

const segments = [
  { value: 'all', label: 'All customers' },
  { value: 'retail', label: 'Retail buyers' },
  { value: 'reseller', label: 'Resellers' },
  { value: 'repeat', label: 'Repeat buyers' },
];

export default function BroadcastsPage() {
  const { data: broadcasts, isLoading } = useBroadcasts();
  const { create, send, remove } = useBroadcastMutations();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all');
  const [scheduledAt, setScheduledAt] = useState('');
  // the time picker only appears once the seller chooses to schedule
  const [when, setWhen] = useState<'now' | 'later'>('now');

  const submit = (thenSend: boolean) => {
    if (!name || message.length < 5) {
      toast('error', 'Give the drop a name and a message');
      return;
    }
    create.mutate(
      { name, message, segment, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined },
      {
        onSuccess: (b) => {
          if (thenSend) {
            send.mutate(b.id, {
              onSuccess: () => toast('success', 'Broadcast sending', 'Messages are going out now.'),
              onError: (e) => toast('error', 'Send failed', e.message),
            });
          } else {
            toast('success', scheduledAt ? 'Broadcast scheduled' : 'Draft saved');
          }
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
      <PageHeader title="Broadcasts" subtitle="Collection drops and announcements over WhatsApp" />
      <div className="grid items-start gap-4 lg:grid-cols-5 lg:items-stretch">
        <Card className="lg:col-span-3">
          <CardHeader title="Compose a drop" />
          <div className="flex flex-col gap-4 p-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input placeholder="Diwali collection drop" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Audience">
                <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
                  {segments.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Message" hint="Keep it personal, broadcasts that read like DMs convert best">
              <Textarea
                rows={5}
                placeholder={'Naya collection aa gaya! ✨\nPehle 20 orders pe free shipping.\n{{store link}}'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
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
                  <Input
                    type="datetime-local"
                    min={nowLocal()}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </Field>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                icon={<Send className="size-4" />}
                loading={create.isPending || send.isPending}
                disabled={when === 'later' && !scheduledAt}
                onClick={() => submit(!scheduledAt)}
              >
                {when === 'later' ? 'Schedule' : 'Send now'}
              </Button>
              {when === 'now' && (
                <Button variant="ghost" onClick={() => submit(false)}>
                  Save as draft
                </Button>
              )}
            </div>
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
                    {message || 'Your message shows here'}
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
                  {b.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        send.mutate(b.id, {
                          onSuccess: () => toast('success', 'Broadcast sending'),
                          onError: (e) => toast('error', 'Send failed', e.message),
                        })
                      }
                    >
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
              message="Your past buyers are your warmest audience, announce the next drop to them first."
            />
          )}
        </div>
      </Card>
    </>
  );
}
