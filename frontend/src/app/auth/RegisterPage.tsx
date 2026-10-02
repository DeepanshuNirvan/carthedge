import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Smartphone, X } from 'lucide-react';
import type { StoreCodeStatus } from '@/api/types';
import { Seo } from '@/lib/seo';
import { emailSchema, phoneSchema, pincodeSchema, storeCodeSchema, storeCodeSlug } from '@/lib/validators';
import { checkStoreCode, register as apiRegister, sendSignupOtp, verifySignupOtp } from '@/api/auth';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { AuthLayout } from './AuthLayout';
import { Field, Input, PasswordInput } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Stepper } from '@/ui/Stepper';
import { SuccessMark } from '@/ui/SuccessMark';
import { Spinner } from '@/ui/Spinner';

const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  storeCode: storeCodeSchema,
  ownerName: z.string().min(2, 'Your name is required'),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, 'At least 8 characters'),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: pincodeSchema.optional().or(z.literal('')),
  upiId: z.string().optional(),
});
type RegisterForm = z.infer<typeof registerSchema>;

// Verify sits between details and the rest because the trial is issued against
// a mobile number that answered an OTP — an unverified signup gets no trial.
const steps = ['Business', 'Verify', 'Reach', 'Done'];
const detailFields: Array<keyof RegisterForm> = ['businessName', 'storeCode', 'ownerName', 'email', 'phone', 'password'];

/**
 * The store link is the seller's public identity — it goes in every buyer URL,
 * QR and Instagram bio, and it cannot be changed later without breaking every
 * link already shared. So the seller picks it here, sees the result live, and
 * gets readable alternatives when it is taken. The old behaviour silently
 * appended four random characters on a name collision, which put
 * /s/ritika-closet-k7m2 on someone's packaging.
 */
function StoreLinkField({
  value,
  onChange,
  error,
  status,
  checking,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  status: StoreCodeStatus | null;
  checking: boolean;
}) {
  const taken = !!status && !status.available;
  const hint = error || (taken ? status.reason : '');

  return (
    <div>
      <Field label="Your store link" error={error}>
        <Input
          value={value}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="storeCodeState"
          placeholder="ritika-closet"
          onChange={(e) => onChange(storeCodeSlug(e.target.value))}
          className="font-mono"
        />
      </Field>

      <p id="storeCodeState" aria-live="polite" className="mt-1.5 flex items-start gap-1.5 text-xs">
        {checking ? (
          <>
            <Spinner className="mt-px size-3.5 shrink-0 text-low" />
            <span className="text-low">Checking</span>
          </>
        ) : status?.available ? (
          <>
            <Check className="mt-px size-3.5 shrink-0 text-jade-ink" aria-hidden />
            <span className="text-jade-ink">
              <span className="font-mono">
                {window.location.host}/s/{status.code}
              </span>{' '}
              is yours
            </span>
          </>
        ) : hint ? (
          <>
            <X className="mt-px size-3.5 shrink-0 text-danger-ink" aria-hidden />
            <span className="text-danger-ink">{hint === 'already taken' ? 'That link is already taken' : hint}</span>
          </>
        ) : (
          <span className="text-low">Buyers see this in every link you share. It cannot be changed later.</span>
        )}
      </p>

      {!!status?.suggestions?.length && !status.available && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-low">Available:</span>
          {status.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full bg-jade-500/12 px-2.5 py-1 font-mono text-xs text-jade-ink transition-colors hover:bg-jade-500/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AsidePitch() {
  return (
    <div className="max-w-md">
      <p className="text-d2 font-semibold text-hi">A few minutes from now, your DMs start becoming orders.</p>
      <ul className="mt-7 flex flex-col gap-3 text-[15px] text-mid">
        {['15-day free trial, no card', 'Your store link the moment you finish', 'An assistant that answers from your catalog'].map(
          (t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="bulb size-2" data-lit="true" />
              {t}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneToken, setPhoneToken] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const [codeStatus, setCodeStatus] = useState<StoreCodeStatus | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  // once the seller edits the link themselves, the business name stops driving it
  const codeTouched = useRef(false);
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { storeCode: '' },
  });

  const storeCode = watch('storeCode');
  const businessName = watch('businessName');

  // derive the link from the business name until the seller takes it over
  useEffect(() => {
    if (codeTouched.current) return;
    setValue('storeCode', storeCodeSlug(businessName ?? ''), { shouldValidate: false });
  }, [businessName, setValue]);

  // debounced availability lookup; the API is still the authority at submit
  useEffect(() => {
    if (!storeCode || !storeCodeSchema.safeParse(storeCode).success) {
      setCodeStatus(null);
      setCheckingCode(false);
      return;
    }
    setCheckingCode(true);
    const t = setTimeout(async () => {
      try {
        setCodeStatus(await checkStoreCode(storeCode, getValues('city')));
      } catch {
        setCodeStatus(null); // a failed lookup must not block signup; the API re-checks
      } finally {
        setCheckingCode(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [storeCode, getValues]);

  // phoneSchema normalises 10-digit / +91 / 0-prefixed input to the same string
  // the API stores, so the OTP and the registration agree on one number.
  const cleanPhone = () => phoneSchema.safeParse(getValues('phone') ?? '');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestOtp = async () => {
    const parsed = cleanPhone();
    if (!parsed.success) return;
    setBusy(true);
    try {
      await sendSignupOtp(parsed.data);
      setStep(1);
      setResendIn(30);
      setTimeout(() => otpRef.current?.focus(), 320);
    } catch (e) {
      toast('error', 'Could not send the code', e instanceof ApiError ? e.message : 'Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!(await trigger(detailFields))) return;
    // block on a link we know is taken; if the lookup never answered, let the
    // API decide rather than stranding the seller on a network hiccup
    if (codeStatus && !codeStatus.available) return;
    await requestOtp();
  };

  const confirmOtp = async () => {
    const parsed = cleanPhone();
    if (!parsed.success || otp.length < 4) return;
    setBusy(true);
    try {
      const { phoneToken: token } = await verifySignupOtp(parsed.data, otp);
      setPhoneToken(token);
      setStep(2);
    } catch (e) {
      toast('error', 'Wrong or expired code', e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setBusy(true);
    try {
      await apiRegister({ ...data, pincode: data.pincode || undefined, phoneToken });
      setStep(3);
      setTimeout(() => navigate('/app'), 1800);
    } catch (e) {
      toast('error', 'Registration failed', e instanceof ApiError ? e.message : 'Please retry.');
      // 409 = an email / mobile / handle already on another business
      if (e instanceof ApiError && e.status === 409) setStep(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout aside={<AsidePitch />}>
      <Seo title="Start your free trial | CartHedge" description="Create your CartHedge business in two minutes." path="/app/register" noIndex />
      <h1 className="text-d3 font-semibold text-hi">Start your free trial</h1>
      <p className="mt-2 text-sm text-mid">15 days on us. No credit card.</p>
      <div className="mt-7">
        <Stepper steps={steps} current={step} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              <Field label="Business name" error={errors.businessName?.message}>
                <Input placeholder="Ritika's Closet" {...register('businessName')} />
              </Field>
              <StoreLinkField
                value={storeCode ?? ''}
                error={errors.storeCode?.message}
                status={codeStatus}
                checking={checkingCode}
                onChange={(v) => {
                  codeTouched.current = true;
                  setValue('storeCode', v, { shouldValidate: true });
                }}
              />
              <Field label="Your name" error={errors.ownerName?.message}>
                <Input autoComplete="name" {...register('ownerName')} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" autoComplete="email" {...register('email')} />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <Input type="tel" autoComplete="tel" placeholder="98xxxxxxx0" {...register('phone')} />
              </Field>
              <Field label="Password" error={errors.password?.message} hint="8+ characters">
                <PasswordInput autoComplete="new-password" {...register('password')} />
              </Field>
              <Button type="button" size="lg" loading={busy} onClick={next}>
                Continue
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink">
                  <Smartphone className="size-6" aria-hidden />
                </span>
                <p className="text-sm text-mid">
                  Code sent to <span className="font-mono font-medium text-hi">+91 {cleanPhone().data ?? ''}</span>
                </p>
                <button type="button" onClick={() => setStep(0)} className="text-xs text-jade-ink hover:underline">
                  Change number
                </button>
              </div>
              <Field label="Enter the 6-digit code" hint="Verifying your number is what starts the free trial">
                <Input
                  ref={otpRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-14 text-center text-2xl font-semibold tracking-[0.55em] tnum"
                />
              </Field>
              <Button type="button" size="lg" loading={busy} disabled={otp.length < 4} onClick={confirmOtp}>
                Verify
              </Button>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={requestOtp}
                className="text-center text-xs text-mid transition-colors hover:text-hi disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4">
                <Field label="WhatsApp" optional>
                  <Input type="tel" {...register('whatsapp')} />
                </Field>
                <Field label="Instagram" optional>
                  <Input placeholder="@handle" {...register('instagram')} />
                </Field>
                <Field label="City" optional>
                  <Input {...register('city')} />
                </Field>
                <Field label="State" optional>
                  <Input {...register('state')} />
                </Field>
                <Field label="Pincode" optional error={errors.pincode?.message}>
                  <Input inputMode="numeric" {...register('pincode')} />
                </Field>
                <Field label="UPI ID" optional>
                  <Input placeholder="you@upi" {...register('upiId')} />
                </Field>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" size="lg" loading={busy} className="flex-1">
                  Create my business
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 py-10 text-center"
            >
              <SuccessMark />
              <h2 className="text-d3 font-semibold text-hi">You&apos;re in</h2>
              <p className="text-sm text-mid">Your trial has started. Taking you to your dashboard.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {step < 3 && (
        <p className="mt-6 text-sm text-mid">
          Already selling with us?{' '}
          <Link to="/app/login" className="-my-3 inline-block py-3 font-medium text-jade-ink hover:underline">
            Log in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
