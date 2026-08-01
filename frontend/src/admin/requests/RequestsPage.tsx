import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import type { ContactMessage, PlanRequest } from '@/api/types';
import {
  useAdminEnquiries,
  useAdminPlanRequests,
  useUpdateEnquiry,
  useUpdatePlanRequest,
} from '@/api/admin';
import { toast } from '@/store/ui';
import { timeAgo } from '@/lib/date';
import { PageHeader } from '@/app/shell/PageHeader';
import { Tabs } from '@/ui/Tabs';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Field, Select, Textarea } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

type Working = { id: string; title: string; status: string; adminNote: string; businessId?: string };

const statusTabs = [
  { value: 'open', label: 'Open' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
  { value: '', label: 'All' },
];

export default function RequestsPage() {
  const [kind, setKind] = useState<'plans' | 'enquiries'>('plans');
  const [status, setStatus] = useState('open');
  const [working, setWorking] = useState<Working | null>(null);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('contacted');

  const plans = useAdminPlanRequests(kind === 'plans' ? status || undefined : undefined);
  const enquiries = useAdminEnquiries(kind === 'enquiries' ? status || undefined : undefined);
  const updatePlan = useUpdatePlanRequest();
  const updateEnquiry = useUpdateEnquiry();

  const list = kind === 'plans' ? plans : enquiries;
  const update = kind === 'plans' ? updatePlan : updateEnquiry;

  const openWork = (w: Working) => {
    setWorking(w);
    setNote(w.adminNote);
    setNewStatus(w.status === 'open' ? 'contacted' : w.status);
  };

  const save = () => {
    if (!working) return;
    update.mutate(
      { id: working.id, status: newStatus, adminNote: note },
      {
        onSuccess: () => {
          toast('success', 'Updated');
          setWorking(null);
        },
        onError: (e) => toast('error', 'Update failed', e.message),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle="Custom-plan enquiries from sellers and contact-form leads from the website"
        actions={
          <Tabs
            tabs={[
              { value: 'plans', label: 'Plan requests' },
              { value: 'enquiries', label: 'Website enquiries' },
            ]}
            value={kind}
            onChange={(v) => setKind(v as 'plans' | 'enquiries')}
          />
        }
      />

      <div className="mb-4">
        <Tabs tabs={statusTabs} value={status} onChange={setStatus} />
      </div>

      {list.isLoading ? (
        <SkeletonRows rows={4} />
      ) : kind === 'plans' ? (
        <PlanRequestList requests={plans.data ?? []} onWork={openWork} />
      ) : (
        <EnquiryList messages={enquiries.data ?? []} onWork={openWork} />
      )}

      <Modal open={!!working} onClose={() => setWorking(null)} title={working?.title ?? ''}>
        <div className="flex flex-col gap-4">
          <Field label="Status">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field label="Internal note">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={update.isPending} onClick={save}>
              Save
            </Button>
            {working?.businessId && (
              <Link
                to={`/admin/businesses/${working.businessId}`}
                className="text-sm font-medium text-jade-ink hover:underline"
              >
                Assign a plan →
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

function PlanRequestList({ requests, onWork }: { requests: PlanRequest[]; onWork: (w: Working) => void }) {
  if (requests.length === 0) {
    return <EmptyState icon={<Inbox className="size-5" />} title="Queue is clear" message="Custom-plan enquiries land here." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-start gap-4 p-5">
          <div className="min-w-0 flex-1 basis-64">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-hi">
              <Link to={`/admin/businesses/${r.businessId}`} className="hover:text-jade-ink">
                {r.businessName}
              </Link>
              <StatusChip status={r.status} />
            </p>
            <p className="mt-0.5 break-words text-xs text-low">
              {r.email} · {r.phone} · ~{r.expectedOrders} orders/mo · {timeAgo(r.createdAt)}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-mid">{r.message}</p>
            {r.adminNote && (
              <p className="mt-2 rounded-md bg-gold-400/8 px-3 py-2 text-xs text-gold-ink">Note: {r.adminNote}</p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onWork({ id: r.id, title: r.businessName, status: r.status, adminNote: r.adminNote, businessId: r.businessId })
            }
          >
            Work request
          </Button>
        </Card>
      ))}
    </div>
  );
}

function EnquiryList({ messages, onWork }: { messages: ContactMessage[]; onWork: (w: Working) => void }) {
  if (messages.length === 0) {
    return <EmptyState icon={<Inbox className="size-5" />} title="No enquiries" message="Contact-form messages from the website land here." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => (
        <Card key={m.id} className="flex flex-wrap items-start gap-4 p-5">
          <div className="min-w-0 flex-1 basis-64">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-hi">
              {m.name}
              {m.business && <span className="text-mid">· {m.business}</span>}
              <StatusChip status={m.status} />
            </p>
            <p className="mt-0.5 break-words text-xs text-low">
              <a href={`mailto:${m.email}`} className="hover:text-jade-ink">
                {m.email}
              </a>
              {m.phone && ` · ${m.phone}`} · {timeAgo(m.createdAt)}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-mid">{m.message}</p>
            {m.adminNote && (
              <p className="mt-2 rounded-md bg-gold-400/8 px-3 py-2 text-xs text-gold-ink">Note: {m.adminNote}</p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onWork({ id: m.id, title: m.name, status: m.status, adminNote: m.adminNote })}
          >
            Work enquiry
          </Button>
        </Card>
      ))}
    </div>
  );
}
