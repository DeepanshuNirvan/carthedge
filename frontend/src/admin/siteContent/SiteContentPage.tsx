import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAdminSettings, useUpdateSettings } from '@/api/admin';
import { siteFallback } from '@/api/site';
import type { SiteFaq, SiteSettings, SiteStat, SiteTestimonial } from '@/api/types';
import { toast } from '@/store/ui';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { SkeletonRows } from '@/ui/Skeleton';

type Row = Record<string, string | number>;
type FieldDef = { key: string; label: string; type?: 'text' | 'number' | 'textarea'; optional?: boolean };

/** Repeatable list of records — the add/remove/edit scaffolding for stats, testimonials and FAQs. */
function ListEditor({
  items,
  fields,
  blank,
  addLabel,
  onChange,
}: {
  items: Row[];
  fields: FieldDef[];
  blank: () => Row;
  addLabel: string;
  onChange: (next: Row[]) => void;
}) {
  const set = (i: number, key: string, value: string | number) =>
    onChange(items.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  return (
    <div className="flex flex-col gap-4 p-5 pt-4">
      {items.map((it, i) => (
        <div key={i} className="neu-inset grid gap-3 rounded-lg p-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} optional={f.optional}>
              {f.type === 'textarea' ? (
                <Textarea rows={2} value={String(it[f.key] ?? '')} onChange={(e) => set(i, f.key, e.target.value)} />
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={String(it[f.key] ?? '')}
                  onChange={(e) => set(i, f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              )}
            </Field>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="size-4" />}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="justify-self-start text-danger-ink sm:col-span-2"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        icon={<Plus className="size-4" />}
        onClick={() => onChange([...items, blank()])}
        className="self-start"
      >
        {addLabel}
      </Button>
    </div>
  );
}

/** Friendly editor over the site_settings key/value store the marketing site reads. */
export default function SiteContentPage() {
  const { data, isLoading } = useAdminSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (data && !form) {
      const next = structuredClone(data);
      next.stats ??= siteFallback.stats;
      next.testimonials ??= siteFallback.testimonials;
      next.faqs ??= siteFallback.faqs;
      next.billing ??= { legalName: '', gstin: '', address: '', email: '', sac: '998314', rate: 18 };
      setForm(next);
    }
  }, [data, form]);

  if (isLoading || !form) {
    return (
      <>
        <PageHeader title="Site content" />
        <SkeletonRows rows={5} />
      </>
    );
  }

  const save = () =>
    update.mutate(form, {
      onSuccess: () => toast('success', 'Site content published', 'The marketing site reads it live.'),
      onError: (e) => toast('error', 'Save failed', e.message),
    });

  return (
    <>
      <PageHeader
        title="Site content"
        subtitle="Everything the public website shows"
        actions={
          <Button onClick={save} loading={update.isPending}>
            Publish changes
          </Button>
        }
      />
      <div className="grid max-w-4xl items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Brand" />
          <div className="flex flex-col gap-4 p-5 pt-4">
            <Field label="Tagline">
              <Input
                value={form.site.tagline}
                onChange={(e) => setForm({ ...form, site: { ...form.site, tagline: e.target.value } })}
              />
            </Field>
            <Field label="Announcement bar" optional hint="Empty hides it">
              <Textarea
                rows={2}
                value={form.site.announcement}
                onChange={(e) => setForm({ ...form, site: { ...form.site, announcement: e.target.value } })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contact" />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
            <Field label="Email">
              <Input
                value={form.contact.email}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.contact.phone}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })}
              />
            </Field>
            <Field label="Support hours">
              <Input
                value={form.contact.supportHours}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, supportHours: e.target.value } })}
              />
            </Field>
            <Field label="Address">
              <Input
                value={form.contact.address}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, address: e.target.value } })}
              />
            </Field>
          </div>
        </Card>

        {form.billing && (
          <Card className="lg:col-span-2">
            <CardHeader title="Invoice identity" subtitle="Printed on the GST invoice every seller gets for their plan payment" />
            <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
              {(
                [
                  ['legalName', 'Legal name', 'As on the GST certificate'],
                  ['gstin', 'GSTIN', 'Without it, invoices carry no GST'],
                  ['address', 'Registered address', ''],
                  ['email', 'Billing email', ''],
                  ['sac', 'SAC code', '998314 covers software services'],
                ] as const
              ).map(([key, label, hint]) => (
                <Field key={key} label={label} hint={hint || undefined}>
                  <Input
                    value={form.billing![key]}
                    onChange={(e) =>
                      setForm({ ...form, billing: { ...form.billing!, [key]: key === 'gstin' ? e.target.value.toUpperCase() : e.target.value } })
                    }
                  />
                </Field>
              ))}
              <Field label="GST rate on plans" hint="Plan prices include it">
                <Select value={String(form.billing.rate)} onChange={(e) => setForm({ ...form, billing: { ...form.billing!, rate: Number(e.target.value) } })}>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader title="Social links" subtitle="Shown in the site footer" />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {(['instagram', 'twitter', 'linkedin', 'youtube'] as const).map((key) => (
              <Field key={key} label={key[0].toUpperCase() + key.slice(1)} optional>
                <Input
                  placeholder="https://…"
                  value={form.social[key]}
                  onChange={(e) => setForm({ ...form, social: { ...form.social, [key]: e.target.value } })}
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Problem stats" subtitle="The three loss numbers on the landing page" />
          <ListEditor
            items={form.stats}
            fields={[
              { key: 'value', label: 'Number', type: 'number' },
              { key: 'suffix', label: 'Suffix' },
              { key: 'label', label: 'Caption', type: 'textarea' },
            ]}
            blank={() => ({ value: 0, suffix: '', label: '' })}
            addLabel="Add stat"
            onChange={(next) => setForm({ ...form, stats: next as SiteStat[] })}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Testimonials" subtitle="Seller stories on the landing page" />
          <ListEditor
            items={form.testimonials}
            fields={[
              { key: 'quote', label: 'Quote', type: 'textarea' },
              { key: 'metric', label: 'Highlight metric' },
              { key: 'name', label: 'Name' },
              { key: 'business', label: 'Business' },
            ]}
            blank={() => ({ quote: '', name: '', business: '', metric: '' })}
            addLabel="Add testimonial"
            onChange={(next) => setForm({ ...form, testimonials: next as SiteTestimonial[] })}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="FAQs" subtitle="Questions in the Guides section" />
          <ListEditor
            items={form.faqs}
            fields={[
              { key: 'q', label: 'Question' },
              { key: 'a', label: 'Answer', type: 'textarea' },
            ]}
            blank={() => ({ q: '', a: '' })}
            addLabel="Add FAQ"
            onChange={(next) => setForm({ ...form, faqs: next as SiteFaq[] })}
          />
        </Card>
      </div>
    </>
  );
}
