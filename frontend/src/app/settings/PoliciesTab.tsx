import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useBusiness, useUpdateSettings } from '@/api/business';
import { returnReasonLabels } from '@/api/aftersale';
import { returnReasons, type ReturnReason, type StorePolicies } from '@/api/types';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { SkeletonRows } from '@/ui/Skeleton';
import { NumberField, ToggleRow, useDraft } from './form';

const cancelOptions: { value: StorePolicies['cancelBefore']; label: string }[] = [
  { value: '', label: 'Until the order ships' },
  { value: 'packed', label: 'Until it is packed' },
  { value: 'confirmed', label: 'Only before I confirm it' },
  { value: 'never', label: 'No cancellations once placed' },
];

/**
 * What the store promises buyers. The assistant quotes it, the store's policy
 * page shows it, and the server enforces the parts it can (return window,
 * reasons, photos, cancellation).
 */
export function PoliciesTab() {
  const { data: business, isLoading } = useBusiness();
  const save = useUpdateSettings('policies');
  const { draft, update, saved } = useDraft(business?.policies);

  if (isLoading || !business || !draft) return <SkeletonRows rows={6} />;
  const returns = draft.returns;
  const setReturns = (patch: Partial<StorePolicies['returns']>) => update({ returns: { ...returns, ...patch } });
  const reasons = returns.reasons ?? [];
  const toggleReason = (r: ReturnReason) => {
    const all = reasons.length === 0 ? [...returnReasons] : reasons;
    const next = all.includes(r) ? all.filter((x) => x !== r) : [...all, r];
    setReturns({ reasons: next.length === returnReasons.length ? [] : next });
  };
  const faqs = draft.faqs ?? [];
  const setFaq = (i: number, patch: Partial<{ q: string; a: string }>) =>
    update({ faqs: faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  const onSave = () =>
    // the COD ceiling is edited under Payments; keep whatever is saved there
    save.mutate(
      { ...draft, codMaxOrder: business.policies.codMaxOrder },
      {
        onSuccess: () => {
          saved();
          toast('success', 'Policies saved', 'Your assistant and policy page use them now.');
        },
        onError: (e) => toast('error', 'Could not save', e.message),
      },
    );

  const returnsOn = returns.windowDays > 0 && (returns.exchange || returns.refund);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Returns and exchanges" subtitle="Buyers request these from their order page, inside your rules" />
            <div className="flex flex-col gap-5 p-5 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Days after delivery"
                  hint="0 keeps returns off — buyers message you instead"
                  value={returns.windowDays}
                  max={90}
                  onChange={(windowDays) => setReturns({ windowDays })}
                />
                <Field label="Getting the item back">
                  <Select value={returns.pickup} onChange={(e) => setReturns({ pickup: e.target.value as StorePolicies['returns']['pickup'] })}>
                    <option value="">Decide case by case</option>
                    <option value="pickup">We arrange a pickup</option>
                    <option value="self_ship">Buyer sends it back</option>
                  </Select>
                </Field>
              </div>
              <ToggleRow checked={returns.exchange} onChange={(exchange) => setReturns({ exchange })} title="Exchanges">
                Another size or colour of the same item. You send the replacement as a new order with the returned value credited.
              </ToggleRow>
              <ToggleRow checked={returns.refund} onChange={(refund) => setReturns({ refund })} title="Returns for a refund">
                Money back once you have the item (or right away, if you let the buyer keep it).
              </ToggleRow>
              <fieldset className={cn(!returnsOn && 'opacity-50')}>
                <legend className="mb-2 text-[13px] font-medium text-hi">Reasons you accept</legend>
                <div className="flex flex-wrap gap-2">
                  {returnReasons.map((r) => {
                    const on = reasons.length === 0 || reasons.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={on}
                        disabled={!returnsOn}
                        onClick={() => toggleReason(r)}
                        className={cn(
                          'min-h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-micro',
                          on ? 'bg-jade-500/14 text-jade-ink shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.25)]' : 'neu text-low',
                        )}
                      >
                        {returnReasonLabels[r]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <ToggleRow
                checked={returns.photoRequired}
                onChange={(photoRequired) => setReturns({ photoRequired })}
                title="Ask for photos"
                disabled={!returnsOn}
              >
                Damaged, wrong, poor-quality or not-as-described claims need a photo before they reach you.
              </ToggleRow>
              <Field label="Conditions" optional hint="Shown to buyers and quoted by the assistant">
                <Textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Unused, tags on, in the original packing. Unboxing video for damage claims."
                  value={returns.conditions}
                  onChange={(e) => setReturns({ conditions: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Cancellation" subtitle="How long a buyer can cancel from their order page" />
            <div className="flex flex-col gap-3 p-5 pt-4">
              <Field label="Buyers can cancel">
                <Select value={draft.cancelBefore} onChange={(e) => update({ cancelBefore: e.target.value as StorePolicies['cancelBefore'] })}>
                  {cancelOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-xs leading-relaxed text-low">
                A cancelled order goes back in stock on its own. If the buyer already paid, the refund shows up on the order for
                you to send. Buyers can change their delivery address until the order ships.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Shipping and delivery" />
            <div className="grid gap-4 p-5 pt-4 sm:grid-cols-3">
              <NumberField
                label="Dispatch within (days)"
                value={draft.delivery.dispatchDays}
                max={30}
                onChange={(dispatchDays) => update({ delivery: { ...draft.delivery, dispatchDays } })}
              />
              <Field label="Metro cities">
                <Input placeholder="2-4 days" maxLength={40} value={draft.delivery.metro} onChange={(e) => update({ delivery: { ...draft.delivery, metro: e.target.value } })} />
              </Field>
              <Field label="Rest of India">
                <Input placeholder="4-7 days" maxLength={40} value={draft.delivery.rest} onChange={(e) => update({ delivery: { ...draft.delivery, rest: e.target.value } })} />
              </Field>
              <div className="sm:col-span-3">
                <Field label="Anything else about delivery" optional>
                  <Textarea rows={2} maxLength={500} placeholder="We ship with Delhivery and DTDC. No delivery on Sundays." value={draft.delivery.note} onChange={(e) => update({ delivery: { ...draft.delivery, note: e.target.value } })} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Terms and contact" subtitle="Payment gateways ask for these pages when they activate your account" />
            <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
              <Field label="Support email" optional>
                <Input type="email" value={draft.supportEmail} onChange={(e) => update({ supportEmail: e.target.value })} />
              </Field>
              <Field label="Support phone" optional>
                <Input type="tel" value={draft.supportPhone} onChange={(e) => update({ supportPhone: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Warranty or care" optional>
                  <Textarea rows={2} maxLength={500} placeholder="Dry clean only. 6-month warranty on plating." value={draft.warranty} onChange={(e) => update({ warranty: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Terms of sale" optional>
                  <Textarea rows={5} maxLength={4000} value={draft.terms} onChange={(e) => update({ terms: e.target.value })} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Answers to common questions"
              subtitle="The assistant gives these answers word for word, and buyers see them on your policy page"
            />
            <div className="flex flex-col gap-4 p-5 pt-4">
              {faqs.length === 0 && <p className="text-xs text-low">Add the questions buyers ask you every day: bulk orders, custom sizes, delivery to your city.</p>}
              {faqs.map((f, i) => (
                <div key={i} className="grid gap-2 rounded-lg bg-[rgb(var(--field)/0.04)] p-3 hairline">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Field label={`Question ${i + 1}`}>
                        <Input maxLength={200} value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} />
                      </Field>
                    </div>
                    <IconButton label={`Remove question ${i + 1}`} className="mt-6" onClick={() => update({ faqs: faqs.filter((_, j) => j !== i) })}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <Field label="Answer">
                    <Textarea rows={2} maxLength={600} value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} />
                  </Field>
                </div>
              ))}
              {faqs.length < 20 && (
                <Button variant="secondary" size="sm" className="self-start" icon={<Plus className="size-4" />} onClick={() => update({ faqs: [...faqs, { q: '', a: '' }] })}>
                  Add a question
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={save.isPending} onClick={onSave}>
          Save policies
        </Button>
        <a href={`/s/${business.code}/policies`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-jade-ink hover:underline">
          View your policy page <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
