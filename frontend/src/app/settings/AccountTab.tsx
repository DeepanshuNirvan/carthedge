import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Download, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useBusiness, useUpdateSettings } from '@/api/business';
import { changePassword, deleteAccount, downloadExport, logout, signOutOtherDevices } from '@/api/auth';
import { disablePush, enablePush, pushState, sendTestPush, type PushState } from '@/api/push';
import type { AlertPrefs } from '@/api/types';
import { toast } from '@/store/ui';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, PasswordInput } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { ToggleRow } from './form';

const on = (v: boolean | null | undefined) => v !== false;

function NotificationsCard() {
  const { data: business } = useBusiness();
  const save = useUpdateSettings('alerts');
  const [device, setDevice] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    pushState().then(setDevice, () => setDevice('unsupported'));
  }, []);
  if (!business) return null;
  const prefs = business.alerts;
  const set = (patch: Partial<AlertPrefs>) =>
    save.mutate({ ...prefs, ...patch }, { onError: (e) => toast('error', 'Could not save', e.message) });

  const toggleDevice = async () => {
    setBusy(true);
    try {
      const next = device === 'on' ? await disablePush() : await enablePush();
      setDevice(next);
      if (next === 'on') toast('success', 'Notifications on for this device');
      if (next === 'blocked') toast('error', 'Notifications are blocked', 'Allow them for this site in your browser settings, then try again.');
    } catch (e) {
      toast('error', 'Could not change notifications', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Notifications"
        subtitle="New orders, return requests, cancellations, reported UPI payments and chats that need you"
      />
      <div className="flex flex-col gap-5 p-5 pt-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[rgb(var(--field)/0.04)] p-4 hairline">
          <BellRing className="size-5 shrink-0 text-jade-ink" aria-hidden />
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-sm font-medium text-hi">This device</p>
            <p className="text-xs text-low">
              {device === 'loading'
                ? 'Checking…'
                : device === 'on'
                  ? 'Alerts arrive here even when CartHedge is closed.'
                  : device === 'blocked'
                    ? 'Blocked in this browser. Allow notifications for this site in its settings.'
                    : device === 'unsupported'
                      ? 'This browser cannot receive notifications. On iPhone, add CartHedge to your home screen first.'
                      : 'Get an alert the moment an order comes in, even with the app closed.'}
            </p>
          </div>
          {(device === 'on' || device === 'off') && (
            <Button size="sm" variant={device === 'on' ? 'secondary' : 'primary'} loading={busy} onClick={toggleDevice}>
              {device === 'on' ? 'Turn off here' : 'Turn on'}
            </Button>
          )}
          {device === 'on' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                sendTestPush().then(
                  (r) => toast(r.sent > 0 ? 'success' : 'info', r.sent > 0 ? 'Test sent' : 'No device reached', r.sent > 0 ? undefined : 'Turn notifications off and on again on this device.'),
                  (e) => toast('error', 'Test failed', e.message),
                )
              }
            >
              Send a test
            </Button>
          )}
        </div>
        <ToggleRow checked={on(prefs.push)} onChange={(push) => set({ push })} title="Device notifications">
          On every device where you turned them on.
        </ToggleRow>
        <ToggleRow checked={on(prefs.whatsapp)} onChange={(whatsapp) => set({ whatsapp })} title="WhatsApp">
          To your login number, {business.phone}.
        </ToggleRow>
        <ToggleRow checked={on(prefs.email)} onChange={(email) => set({ email })} title="Email">
          To {business.email}. Turn off if you get many orders a day.
        </ToggleRow>
      </div>
    </Card>
  );
}

function SecurityCard() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<'password' | 'devices' | null>(null);
  const tooShort = next.length > 0 && next.length < 8;

  const onChange = async () => {
    setBusy('password');
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      toast('success', 'Password changed', 'Every other device has been signed out.');
    } catch (e) {
      toast('error', 'Password not changed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader title="Sign-in and security" />
      <div className="flex flex-col gap-5 p-5 pt-4">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onChange();
          }}
        >
          <Field label="Current password">
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" error={tooShort ? 'At least 8 characters' : undefined}>
            <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Button type="submit" className="sm:justify-self-start" loading={busy === 'password'} disabled={!current || next.length < 8}>
            Change password
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <ShieldCheck className="size-5 text-low" aria-hidden />
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-low">
            Lost a phone or used a shared computer? Sign out everywhere except here.
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={busy === 'devices'}
            icon={<LogOut className="size-4" />}
            onClick={async () => {
              setBusy('devices');
              try {
                await signOutOtherDevices();
                toast('success', 'Other devices signed out');
              } catch (e) {
                toast('error', 'Could not sign out other devices', e instanceof Error ? e.message : undefined);
              } finally {
                setBusy(null);
              }
            }}
          >
            Sign out other devices
          </Button>
        </div>
        <Button
          variant="ghost"
          className="self-start"
          icon={<LogOut className="size-4" />}
          onClick={async () => {
            await logout();
            navigate('/app/login');
          }}
        >
          Sign out of this device
        </Button>
      </div>
    </Card>
  );
}

function DataCard() {
  const { data: business } = useBusiness();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  if (!business) return null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount(password, confirm);
      await logout();
      navigate('/app/login', { replace: true });
      toast('info', 'Account scheduled for deletion', 'Log in within 30 days to restore it.');
    } catch (e) {
      toast('error', 'Account not deleted', e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Your data" />
      <div className="flex flex-col gap-5 p-5 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-low">
            Everything in your store as one file: products, buyers, orders, returns, invoices and chats.
          </p>
          <Button
            size="sm"
            variant="secondary"
            loading={exporting}
            icon={<Download className="size-4" />}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadExport();
              } catch (e) {
                toast('error', 'Export failed', e instanceof Error ? e.message : undefined);
              } finally {
                setExporting(false);
              }
            }}
          >
            Download my data
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-low">
            Closes your store and stops your assistant now. Your data is erased after 30 days; log in before then to restore it.
            Invoices CartHedge issued to you are kept, as tax law requires.
          </p>
          <Button size="sm" variant="ghost" className="text-danger-ink" icon={<Trash2 className="size-4" />} onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-mid">
            Your store link stops working right away and buyers can no longer order. Download your data first: GST rules expect you
            to keep your invoices and accounts for 72 months, and after 30 days we can no longer give them back.
          </p>
          <Field label="Your password">
            <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label={`Type ${business.code} to confirm`}>
            <Input autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" loading={deleting} disabled={!password || confirm.trim().toLowerCase() !== business.code} onClick={onDelete}>
              Delete my account
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function AccountTab() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <NotificationsCard />
      <div className="flex min-w-0 flex-col gap-5">
        <SecurityCard />
        <DataCard />
      </div>
    </div>
  );
}
