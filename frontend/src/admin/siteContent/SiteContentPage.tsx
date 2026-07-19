import { useEffect, useState } from 'react';
import { useAdminSettings, useUpdateSettings } from '@/api/admin';
import type { SiteSettings } from '@/api/types';
import { toast } from '@/store/ui';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { SkeletonRows } from '@/ui/Skeleton';

/** Friendly editor over the site_settings key/value store the marketing site reads. */
export default function SiteContentPage() {
  const { data, isLoading } = useAdminSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (data && !form) setForm(structuredClone(data));
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
      </div>
    </>
  );
}
