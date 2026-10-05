import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Instagram, Landmark, MessageCircle, ShieldCheck, Store } from 'lucide-react';
import { useBusiness, useUpdateBusiness, useUpdatePayments } from '@/api/business';
import { getChannelConnectUrl, useChannelsInfo, useChannelMutations } from '@/api/messaging';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { pincodeSchema } from '@/lib/validators';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { cn } from '@/lib/cn';
import { PageHeader } from '../shell/PageHeader';
import { ShareActions, storeUrl } from '../shell/ShareActions';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Switch } from '@/ui/Switch';
import { Avatar } from '@/ui/Avatar';
import { SkeletonRows } from '@/ui/Skeleton';
import { Tabs } from '@/ui/Tabs';
import { PoliciesTab } from './PoliciesTab';
import { AssistantTab } from './AssistantTab';
import { CheckoutCharges } from './CheckoutCharges';
import { GstTab } from './GstTab';
import { AccountTab } from './AccountTab';

const channelMeta = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, idLabel: 'Phone number ID', hint: 'WhatsApp → API Setup in your Meta app' },
  instagram: { label: 'Instagram', Icon: Instagram, idLabel: 'Instagram account ID', hint: 'Your Instagram professional account id' },
} as const;

function ChannelRow({ channel }: { channel: 'whatsapp' | 'instagram' }) {
  const { data } = useChannelsInfo();
  const { data: business } = useBusiness();
  const { connect, disconnect } = useChannelMutations();
  const existing = data?.channels?.find((c) => c.channel === channel);
  // a failed token refresh flips status to 'error'; DMs stop until reconnect
  const broken = !!existing && existing.status !== 'connected';
  const oauthReady = !!data?.oauth?.[channel];
  // until sellers can connect WhatsApp, they answer from their own app
  const assisted = channel === 'whatsapp' && !existing && !data?.whatsappChannel;
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [externalId, setExternalId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const meta = channelMeta[channel];
  const Icon = meta.Icon;

  // full-page redirect: Meta refuses to render its consent screen in an iframe
  const startOauth = async () => {
    setStarting(true);
    try {
      const { url } = await getChannelConnectUrl(channel);
      window.location.href = url;
    } catch (e) {
      setStarting(false);
      toast('error', 'Could not start', e instanceof Error ? e.message : undefined);
    }
  };

  const doConnect = () => {
    if (!externalId.trim() || !accessToken.trim()) {
      toast('error', 'Missing details', `${meta.idLabel} and access token are required`);
      return;
    }
    connect.mutate(
      { channel, externalId: externalId.trim(), accessToken: accessToken.trim(), displayName: '' },
      {
        onSuccess: () => {
          toast('success', `${meta.label} connected`, 'DMs now become order drafts automatically.');
          setOpen(false);
          setExternalId('');
          setAccessToken('');
        },
        onError: (e) => toast('error', 'Could not connect', e.message),
      },
    );
  };

  return (
    <div className="rounded-xl bg-[rgb(var(--field)/0.04)] p-4 hairline">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-hi shadow-soft">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-sm font-medium text-hi">{meta.label}</p>
          <p className="truncate text-xs text-low">
            {assisted
              ? 'You reply from your own WhatsApp'
              : !existing
                ? 'Not connected'
                : broken
                ? 'Access expired, reconnect to keep capturing DMs'
                : `Connected · ${existing.displayName || `id ${existing.externalId}`}`}
          </p>
        </div>
        {existing ? (
          <>
            {!broken ? (
              <Badge tone="jade">
                <Check className="size-3" /> Connected
              </Badge>
            ) : oauthReady ? (
              <Button size="sm" loading={starting} onClick={startOauth}>
                Reconnect
              </Button>
            ) : (
              <Badge tone="danger">Needs reconnect</Badge>
            )}
            <Button variant="ghost" size="sm" loading={disconnect.isPending} onClick={() => disconnect.mutate(channel)}>
              Disconnect
            </Button>
          </>
        ) : assisted ? (
          <Badge tone="neutral">Auto-replies soon</Badge>
        ) : oauthReady ? (
          <Button size="sm" loading={starting} onClick={startOauth}>
            Connect {meta.label}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'Connect'}
          </Button>
        )}
      </div>
      {assisted && (
        <p className="mt-3 text-xs leading-relaxed text-low">
          {/* the store's chat buttons only show once the profile has a WhatsApp number */}
          {business?.whatsapp
            ? 'Buyers tap Chat on WhatsApp in your store and message you directly.'
            : 'Add your WhatsApp number to the business profile and your store shows buyers a Chat on WhatsApp button.'}{' '}
          Paste any chat on the AI desk and it becomes an order draft.{' '}
          <Link to="/app/ai" className="font-medium text-jade-ink hover:underline">
            Open AI desk
          </Link>
        </p>
      )}
      {!existing && oauthReady && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs text-low underline underline-offset-2 transition-colors hover:text-mid"
        >
          {open ? 'Hide manual setup' : 'Enter account details manually instead'}
        </button>
      )}
      {open && !existing && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={meta.idLabel} hint={meta.hint}>
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} />
          </Field>
          <Field label="Access token">
            <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
          </Field>
          <Button className="sm:col-span-2 sm:justify-self-start" loading={connect.isPending} onClick={doConnect}>
            Connect {meta.label}
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelsSection() {
  const { data } = useChannelsInfo();
  // the OAuth callback redirects back here with the outcome in the query string
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const connected = params.get('connected');
    const failure = params.get('connectError');
    if (!connected && !failure) return;
    if (connected) toast('success', `${channelMeta[connected as 'whatsapp' | 'instagram']?.label ?? connected} connected`, 'DMs now become order drafts automatically.');
    else toast('error', 'Could not connect', failure ?? undefined);
    params.delete('connected');
    params.delete('connectError');
    setParams(params, { replace: true });
  }, [params, setParams]);

  return (
    <Card>
      <CardHeader
        title="Connected channels"
        subtitle={data?.whatsappChannel ? 'Instagram and WhatsApp DMs become orders, no copy-paste' : 'Instagram DMs become orders on their own, no copy-paste'}
      />
      <div className="flex flex-col gap-3 p-5 pt-4">
        <ChannelRow channel="whatsapp" />
        <ChannelRow channel="instagram" />
        <p className="text-xs text-low">
          Connected DMs turn into order drafts on the AI desk for one-tap approval. You can still paste chats manually anytime.
        </p>
      </div>
    </Card>
  );
}

const profileSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: z.string(),
  whatsapp: z.string(),
  instagram: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: pincodeSchema.or(z.literal('')),
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfileSection() {
  const { data: business, isLoading } = useBusiness();
  const update = useUpdateBusiness();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: business && {
      name: business.name,
      ownerName: business.ownerName,
      phone: business.phone,
      whatsapp: business.whatsapp,
      instagram: business.instagram,
      address: business.address,
      city: business.city,
      state: business.state,
      pincode: business.pincode,
    },
  });

  const onLogo = async (file: File) => {
    try {
      const logoUrl = await uploadFile(file);
      update.mutate(
        { logoUrl },
        { onSuccess: () => toast('success', 'Logo updated'), onError: (e) => toast('error', 'Logo not saved', e.message) },
      );
    } catch {
      toast('error', 'Logo upload failed');
    }
  };

  if (isLoading || !business) return <SkeletonRows rows={5} />;

  return (
    <Card>
      <CardHeader
        title="Business profile"
        subtitle="Your name, contact and address. Buyers see this on every link."
        action={<ShareActions url={storeUrl(business.code)} title={`${business.name} | shop the full collection`} />}
      />
      <form
        onSubmit={handleSubmit((data) =>
          update.mutate(data, {
            onSuccess: () => toast('success', 'Profile saved'),
            onError: (e) => toast('error', 'Save failed', e.message),
          }),
        )}
        className="grid gap-4 p-5 pt-4 sm:grid-cols-2"
        noValidate
      >
        <div className="flex items-center gap-4 sm:col-span-2">
          <Avatar name={business.name} src={business.logoUrl || undefined} className="size-14" />
          <label className="cursor-pointer text-sm font-medium text-jade-ink hover:underline">
            Change logo
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
          </label>
        </div>
        <Field label="Business name" error={errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="Owner" error={errors.ownerName?.message}>
          <Input {...register('ownerName')} />
        </Field>
        <Field label="Phone" hint="Your verified login number. Contact support to change it.">
          <Input type="tel" readOnly {...register('phone')} />
        </Field>
        <Field label="WhatsApp">
          <Input type="tel" {...register('whatsapp')} />
        </Field>
        <Field label="Instagram">
          <Input placeholder="@handle" {...register('instagram')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Textarea rows={2} {...register('address')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          <Field label="City">
            <Input {...register('city')} />
          </Field>
          <Field label="State">
            <Input {...register('state')} />
          </Field>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input inputMode="numeric" {...register('pincode')} />
            </Field>
          </div>
        </div>
        <Button type="submit" loading={update.isPending} className="sm:justify-self-start">
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function PaymentsSection() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const updatePayments = useUpdatePayments();
  const quickSave = (input: Parameters<typeof updateBusiness.mutate>[0], done: string) =>
    updateBusiness.mutate(input, {
      onSuccess: () => toast('success', done),
      onError: (e) => toast('error', 'Could not save', e.message),
    });
  const {
    register,
    handleSubmit,
    formState: { dirtyFields },
  } = useForm<{ razorpayKeyId: string; razorpayKeySecret: string; upiId: string }>({
    values: { razorpayKeyId: business?.razorpayKeyId ?? '', razorpayKeySecret: '', upiId: business?.upiId ?? '' },
  });

  if (!business) return null;

  // Which rail buyers actually see at checkout. A gateway confirms itself; a
  // bare UPI ID means you verify each transfer from the order card.
  const mode = business.razorpayConfigured ? 'gateway' : business.upiId ? 'upi' : 'none';
  const modeNote = {
    gateway: 'Buyers pay by UPI or card through Razorpay and the order confirms itself.',
    upi: 'Buyers pay your UPI ID directly from GPay/PhonePe/Paytm and send you the reference. You confirm each one from the order card. Add Razorpay later if you want that to be automatic.',
    none: 'Buyers can only choose cash on delivery. Add a UPI ID below to start taking prepaid orders. That alone is enough; Razorpay is optional.',
  }[mode];

  return (
    <Card>
      <CardHeader
        title="Payments"
        subtitle="Buyer payments settle directly in your accounts"
        action={
          mode !== 'none' ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-jade-ink">
              <ShieldCheck className="size-4" /> {mode === 'gateway' ? 'Razorpay connected' : 'UPI collection on'}
            </span>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6 p-5 pt-4">
        <p
          className={cn(
            'rounded-lg p-3.5 text-xs leading-relaxed',
            mode === 'none' ? 'bg-gold-400/10 text-gold-ink' : 'bg-[rgb(var(--field)/0.05)] text-mid hairline',
          )}
        >
          {modeNote}
        </p>
        <form
          onSubmit={handleSubmit((data) =>
            updatePayments.mutate(
              {
                razorpayKeyId: dirtyFields.razorpayKeyId ? data.razorpayKeyId : undefined,
                razorpayKeySecret: dirtyFields.razorpayKeySecret ? data.razorpayKeySecret : undefined,
                upiId: dirtyFields.upiId ? data.upiId : undefined,
              },
              {
                onSuccess: () => toast('success', 'Payment settings saved', 'Keys are encrypted at rest.'),
                onError: (e) => toast('error', 'Save failed', e.message),
              },
            ),
          )}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Field label="UPI ID" hint="Enough on its own, no gateway account needed. GPay, PhonePe, Paytm and every UPI app can pay it.">
              <Input placeholder="you@okhdfcbank" {...register('upiId')} />
            </Field>
          </div>
          <Field label="Razorpay Key ID" optional hint="rzp_live_…, adds cards and auto-confirmation">
            <Input {...register('razorpayKeyId')} autoComplete="off" />
          </Field>
          <Field label="Razorpay Key Secret" optional hint="Stored AES-encrypted, never shown again">
            <Input type="password" placeholder="••••••••" {...register('razorpayKeySecret')} autoComplete="off" />
          </Field>
          <Button type="submit" loading={updatePayments.isPending} className="self-end sm:justify-self-start">
            Save payment settings
          </Button>
        </form>

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
          <span className="flex items-center gap-2.5 text-sm text-hi sm:col-span-3 lg:col-span-1">
            <Switch
              checked={business.codEnabled}
              label="COD enabled"
              onChange={(codEnabled) => quickSave({ codEnabled }, codEnabled ? 'COD on' : 'COD off')}
            />
            Accept COD
          </span>
          <Field label="COD token ₹" hint="Optional advance that filters refusers">
            <Input
              inputMode="decimal"
              defaultValue={business.codTokenAmount ? paiseToRupees(business.codTokenAmount) : ''}
              onBlur={(e) => {
                const paise = e.target.value === '' ? 0 : rupeesToPaise(e.target.value);
                if (paise === null) return toast('error', 'Invalid token amount');
                if (paise !== business.codTokenAmount) quickSave({ codTokenAmount: paise }, 'Token amount saved');
              }}
            />
          </Field>
          <Field label="Shipping fee ₹">
            <Input
              inputMode="decimal"
              defaultValue={business.shippingFee ? paiseToRupees(business.shippingFee) : '0'}
              onBlur={(e) => {
                const paise = rupeesToPaise(e.target.value);
                if (paise === null) return toast('error', 'Invalid shipping fee');
                if (paise !== business.shippingFee) quickSave({ shippingFee: paise }, 'Shipping fee saved');
              }}
            />
          </Field>
          <Field label="Baseline RTO %" hint="Used by your savings meter, industry default 25">
            <Input
              inputMode="numeric"
              defaultValue={String(business.baselineRtoPercent)}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (!Number.isInteger(n) || n < 0 || n > 90) return toast('error', 'Enter 0–90');
                if (n !== business.baselineRtoPercent) quickSave({ baselineRtoPercent: n }, 'Baseline saved');
              }}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}

const tabs = [
  { value: 'store', label: 'Store' },
  { value: 'policies', label: 'Policies' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'payments', label: 'Payments' },
  { value: 'gst', label: 'GST' },
  { value: 'account', label: 'Account' },
] as const;
type Tab = (typeof tabs)[number]['value'];

export default function SettingsPage() {
  // the tab lives in the URL: alerts and other pages can link straight to it
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');
  const tab: Tab = tabs.some((t) => t.value === asked) ? (asked as Tab) : 'store';
  const show = (t: Tab) => {
    params.set('tab', t);
    setParams(params, { replace: true });
  };

  return (
    <>
      <PageHeader title="Settings" actions={<Tabs tabs={[...tabs]} value={tab} onChange={show} className="max-w-full overflow-x-auto" />} />
      {/* every tab stays mounted, so unsaved edits survive a look at another tab */}
      <div hidden={tab !== 'store'}>
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <ProfileSection />
          <ChannelsSection />
        </div>
      </div>
      <div hidden={tab !== 'policies'}>
        <PoliciesTab />
      </div>
      <div hidden={tab !== 'assistant'}>
        <AssistantTab />
      </div>
      <div hidden={tab !== 'payments'}>
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <PaymentsSection />
          <CheckoutCharges />
        </div>
        <p className="mt-5 flex flex-wrap items-center gap-2 px-1 text-xs text-low">
          <Landmark className="size-3.5" /> CartHedge never holds your money, Razorpay and UPI settle straight to you.
          <Store className="ml-3 size-3.5" /> Store pauses automatically if your subscription lapses.
        </p>
      </div>
      <div hidden={tab !== 'gst'}>
        <GstTab />
      </div>
      <div hidden={tab !== 'account'}>
        <AccountTab />
      </div>
    </>
  );
}
