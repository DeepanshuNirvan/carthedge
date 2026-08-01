import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { emailSchema, phoneSchema, pincodeSchema } from '@/lib/validators';
import { register as apiRegister } from '@/api/auth';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { AuthLayout } from './AuthLayout';
import { Field, Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Stepper } from '@/ui/Stepper';

const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
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

const steps = ['Business', 'Reach', 'Done'];
const stepFields: Array<Array<keyof RegisterForm>> = [
  ['businessName', 'ownerName', 'email', 'phone', 'password'],
  ['whatsapp', 'instagram', 'city', 'state', 'pincode', 'upiId'],
];

function AsidePitch() {
  return (
    <div className="max-w-md">
      <p className="font-display text-d3 font-semibold text-[#F5F3EE]">
        Two minutes from now, your DMs become an order desk.
      </p>
      <ul className="mt-6 flex flex-col gap-2.5 text-sm text-[#A9A6A0]">
        <li>· 15-day free trial, no card</li>
        <li>· Storefront link the moment you finish</li>
        <li>· AI order capture from any chat</li>
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), mode: 'onTouched' });

  const next = async () => {
    if (await trigger(stepFields[0])) setStep(1);
  };

  const onSubmit = async (data: RegisterForm) => {
    setBusy(true);
    try {
      await apiRegister({ ...data, pincode: data.pincode || undefined });
      setStep(2);
      setTimeout(() => navigate('/app'), 1800);
    } catch (e) {
      toast('error', 'Registration failed', e instanceof ApiError ? e.message : 'Please retry.');
      if (e instanceof ApiError && e.status === 409) setStep(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout aside={<AsidePitch />}>
      <Seo title="Start your free trial — CartHedge" description="Create your CartHedge business in two minutes." path="/app/register" noIndex />
      <h1 className="font-display text-d3 font-semibold text-hi">Start your free trial</h1>
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
                <Input type="password" autoComplete="new-password" {...register('password')} />
              </Field>
              <Button type="button" size="lg" onClick={next}>
                Continue
              </Button>
            </motion.div>
          )}

          {step === 1 && (
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
                <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="submit" size="lg" loading={busy} className="flex-1">
                  Create my business
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 py-10 text-center"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-jade-500/15">
                <PartyPopper className="size-8 text-jade-ink" />
              </span>
              <h2 className="font-display text-d3 font-semibold text-hi">You're in!</h2>
              <p className="text-sm text-mid">Trial started — taking you to your dashboard…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {step < 2 && (
        <p className="mt-6 text-sm text-mid">
          Already selling with us?{' '}
          <Link to="/app/login" className="font-medium text-jade-ink hover:underline">
            Log in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
