import { useState } from 'react';
import { adminChangePassword } from '@/api/admin';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input } from '@/ui/Input';
import { Button } from '@/ui/Button';

export default function AccountPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast('error', 'New password must be 8+ characters');
    if (next !== confirm) return toast('error', 'Passwords do not match');
    setBusy(true);
    try {
      await adminChangePassword(current, next);
      toast('success', 'Password changed');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      toast('error', 'Change failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Account" />
      <Card className="max-w-md">
        <CardHeader title="Change password" />
        <form onSubmit={submit} className="flex flex-col gap-4 p-5 pt-4">
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" hint="8+ characters">
            <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>
            Update password
          </Button>
        </form>
      </Card>
    </>
  );
}
