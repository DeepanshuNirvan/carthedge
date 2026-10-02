import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { adminChangePassword } from '@/api/admin';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { useAdminAuth } from '@/store/adminAuth';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Avatar } from '@/ui/Avatar';
import { Field, PasswordInput } from '@/ui/Input';
import { Button } from '@/ui/Button';

export default function AccountPage() {
  const { name, email, clear } = useAdminAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const signOut = () => {
    clear();
    navigate('/admin/login');
  };

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
      <PageHeader title="Account" subtitle="Your staff sign-in for the platform console" />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* who is signed in: the console acts on every seller, so the identity is worth seeing */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar name={name || 'CartHedge staff'} className="size-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-snug text-hi">{name || 'CartHedge staff'}</p>
              {email && <p className="truncate text-sm text-mid">{email}</p>}
            </div>
          </div>
          <dl className="mt-5 border-t pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-low">Role</dt>
              <dd className="font-medium text-hi">Platform admin</dd>
            </div>
          </dl>
          <Button variant="secondary" className="mt-5 w-full sm:w-auto" icon={<LogOut className="size-4" />} onClick={signOut}>
            Sign out
          </Button>
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={submit} className="flex flex-col gap-4 p-5 pt-4">
            <Field label="Current password">
              <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" hint="8+ characters">
                <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              </Field>
              <Field label="Confirm new password">
                <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" loading={busy} className="sm:w-fit">
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
