import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import type { PlanRequest } from '@/api/types';
import { useAdminPlanRequests, useUpdatePlanRequest } from '@/api/admin';
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

export default function RequestsPage() {
  const [status, setStatus] = useState('open');
  const [working, setWorking] = useState<PlanRequest | null>(null);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('contacted');
  const { data: requests, isLoading } = useAdminPlanRequests(status || undefined);
  const update = useUpdatePlanRequest();

  const openWork = (r: PlanRequest) => {
    setWorking(r);
    setNote(r.adminNote);
    setNewStatus(r.status === 'open' ? 'contacted' : r.status);
  };

  return (
    <>
      <PageHeader
        title="Plan requests"
        actions={
          <Tabs
            tabs={[
              { value: 'open', label: 'Open' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'closed', label: 'Closed' },
              { value: '', label: 'All' },
            ]}
            value={status}
            onChange={setStatus}
          />
        }
      />

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : requests && requests.length > 0 ? (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1 basis-64">
                <p className="flex items-center gap-2 text-sm font-semibold text-hi">
                  <Link to={`/admin/businesses/${r.businessId}`} className="hover:text-jade-500">
                    {r.businessName}
                  </Link>
                  <StatusChip status={r.status} />
                </p>
                <p className="mt-0.5 text-xs text-low">
                  {r.email} · {r.phone} · ~{r.expectedOrders} orders/mo · {timeAgo(r.createdAt)}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-mid">{r.message}</p>
                {r.adminNote && (
                  <p className="mt-2 rounded-md bg-gold-400/8 px-3 py-2 text-xs text-gold-500">Note: {r.adminNote}</p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => openWork(r)}>
                Work request
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Inbox className="size-5" />} title="Queue is clear" message="Custom-plan enquiries land here." />
      )}

      <Modal open={!!working} onClose={() => setWorking(null)} title={working?.businessName ?? ''}>
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
          <div className="flex gap-3">
            <Button
              loading={update.isPending}
              onClick={() =>
                working &&
                update.mutate(
                  { id: working.id, status: newStatus, adminNote: note },
                  {
                    onSuccess: () => {
                      toast('success', 'Request updated');
                      setWorking(null);
                    },
                    onError: (e) => toast('error', 'Update failed', e.message),
                  },
                )
              }
            >
              Save
            </Button>
            {working && (
              <Link to={`/admin/businesses/${working.businessId}`} className="self-center text-sm font-medium text-jade-500 hover:underline">
                Assign a plan →
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
