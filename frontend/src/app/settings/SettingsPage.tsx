import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Instagram, Landmark, MessageCircle, ShieldCheck, Store } from 'lucide-react';
import { useBusiness, useUpdateBusiness, useUpdatePayments } from '@/api/business';
import { useChannels, useChannelMutations } from '@/api/messaging';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { pincodeSchema } from '@/lib/validators';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { PageHeader } from '../shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { Field, Input, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Switch } from '@/ui/Switch';
import { Avatar } from '@/ui/Avatar';
import { SkeletonRows } from '@/ui/Skeleton';

const channelMeta = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, idLabel: 'Phone number ID', hint: 'WhatsApp → API Setup in your Meta app' },
  instagram: { label: 'Instagram', Icon: Instagram, idLabel: 'Instagram account ID', hint: 'Your Instagram professional account id' },
} as const;

function ChannelRow({ channel }: { channel: 'whatsapp' | 'instagram' }) {
  const { data: channels } = useChannels();
  const { connect, disconnect } = useChannelMutations();
  const existing = channels?.find((c) => c.channel === channel);
  const [open, setOpen] = useState(false);
  const [externalId, setExternalId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const meta = channelMeta[channel];
  const Icon = meta.Icon;

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
    <div className="neu-inset rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-surface-2 text-hi">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-hi">{meta.label}</p>
          <p className="truncate text-xs text-low">{existing ? `Connected · id ${existing.externalId}` : 'Not connected'}</p>
        </div>
        {existing ? (
          <>
            <Badge tone="jade">
              <Check className="size-3" /> Connected
            </Badge>
            <Button variant="ghost" size="sm" loading={disconnect.isPending} onClick={() => disconnect.mutate(channel)}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'Connect'}
          </Button>
        )}
      </div>
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
  return (
    <Card>
      <CardHeader title="Connected channels" subtitle="Auto-capture orders from Instagram & WhatsApp DMs — no copy-paste" />
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
  gstin: z.string(),
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
      gstin: business.gstin,
    },
  });

  const onLogo = async (file: File) => {
    try {
      const logoUrl = await uploadFile(file);
      update.mutate({ logoUrl }, { onSuccess: () => toast('success', 'Logo updated') });
    } catch {
      toast('error', 'Logo upload failed');
    }
  };

  if (isLoading || !business) return <SkeletonRows rows={5} />;

  return (
    <Card>
      <CardHeader title="Business profile" subtitle={`Storefront: /s/${business.code}`} />
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
          <label className="cursor-pointer text-sm font-medium text-jade-500 hover:underline">
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
        <Field label="Phone">
          <Input type="tel" {...register('phone')} />
        </Field>
        <Field label="WhatsApp">
          <Input type="tel" {...register('whatsapp')} />
        </Field>
        <Field label="Instagram">
          <Input placeholder="@handle" {...register('instagram')} />
        </Field>
        <Field label="GSTIN" optional>
          <Input {...register('gstin')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Textarea rows={2} {...register('address')} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <Field label="City">
            <Input {...register('city')} />
          </Field>
          <Field label="State">
            <Input {...register('state')} />
          </Field>
          <Field label="Pincode" error={errors.pincode?.message}>
            <Input inputMode="numeric" {...register('pincode')} />
          </Field>
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
  const {
    register,
    handleSubmit,
    formState: { dirtyFields },
  } = useForm<{ razorpayKeyId: string; razorpayKeySecret: string; upiId: string }>({
    values: { razorpayKeyId: business?.razorpayKeyId ?? '', razorpayKeySecret: '', upiId: business?.upiId ?? '' },
  });

  if (!business) return null;

  return (
    <Card>
      <CardHeader
        title="Payments"
        subtitle="Buyer payments settle directly in your accounts"
        action={
          business.razorpayConfigured ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-jade-500">
              <ShieldCheck className="size-4" /> Razorpay connected
            </span>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6 p-5 pt-4">
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
          <Field label="Razorpay Key ID" hint="rzp_live_…">
            <Input {...register('razorpayKeyId')} autoComplete="off" />
          </Field>
          <Field label="Razorpay Key Secret" hint="Stored AES-encrypted, never shown again">
            <Input type="password" placeholder="••••••••" {...register('razorpayKeySecret')} autoComplete="off" />
          </Field>
          <Field label="UPI ID" hint="Fallback for direct UPI collection">
            <Input placeholder="you@upi" {...register('upiId')} />
          </Field>
          <Button type="submit" loading={updatePayments.isPending} className="self-end sm:justify-self-start">
            Save payment settings
          </Button>
        </form>

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
          <span className="flex items-center gap-2.5 text-sm text-hi">
            <Switch
              checked={business.codEnabled}
              label="COD enabled"
              onChange={(codEnabled) =>
                updateBusiness.mutate({ codEnabled }, { onSuccess: () => toast('success', codEnabled ? 'COD on' : 'COD off') })
              }
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
                if (paise !== business.codTokenAmount)
                  updateBusiness.mutate({ codTokenAmount: paise }, { onSuccess: () => toast('success', 'Token amount saved') });
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
                if (paise !== business.shippingFee)
                  updateBusiness.mutate({ shippingFee: paise }, { onSuccess: () => toast('success', 'Shipping fee saved') });
              }}
            />
          </Field>
          <Field label="Baseline RTO %" hint="Used by your savings meter — industry default 25">
            <Input
              inputMode="numeric"
              defaultValue={String(business.baselineRtoPercent)}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (!Number.isInteger(n) || n < 0 || n > 90) return toast('error', 'Enter 0–90');
                if (n !== business.baselineRtoPercent)
                  updateBusiness.mutate({ baselineRtoPercent: n }, { onSuccess: () => toast('success', 'Baseline saved') });
              }}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex max-w-3xl flex-col gap-4">
        <ProfileSection />
        <ChannelsSection />
        <PaymentsSection />
        <p className="flex items-center gap-2 px-1 text-xs text-low">
          <Landmark className="size-3.5" /> CartHedge never holds your money — Razorpay and UPI settle straight to you.
          <Store className="ml-3 size-3.5" /> Store pauses automatically if your subscription lapses.
        </p>
      </div>
    </>
  );
}
