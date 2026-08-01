import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Seo } from '@/lib/seo';
import { emailSchema } from '@/lib/validators';
import { login, forgotPassword } from '@/api/auth';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { AuthLayout } from './AuthLayout';
import { Field, Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { MoneyText } from '@/ui/MoneyText';

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });
type LoginForm = z.infer<typeof loginSchema>;

function AsidePitch() {
  return (
    <div className="max-w-md">
      <p className="font-display text-d3 font-semibold text-[#F5F3EE]">
        Welcome back. Your orders kept moving.
      </p>
      <div className="mt-8 w-fit rounded-lg bg-white/[0.06] p-5 backdrop-blur hairline">
        <p className="text-xs uppercase tracking-wider text-[#A9A6A0]">Saved from RTO this month</p>
        <p className="mt-1 font-display text-3xl font-semibold text-jade-ink">
          <MoneyText paise={3124000} />
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setBusy(true);
    try {
      await login(data.email, data.password);
      navigate('/app');
    } catch (e) {
      toast('error', 'Could not sign in', e instanceof ApiError ? e.message : 'Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    const email = getValues('email');
    if (!email) {
      toast('info', 'Enter your email first', 'Type your account email, then tap forgot password.');
      return;
    }
    await forgotPassword(email).catch(() => {});
    toast('success', 'Reset link sent', 'If that email has an account, a reset link is on its way.');
  };

  return (
    <AuthLayout aside={<AsidePitch />}>
      <Seo title="Log in — CartHedge" description="Sign in to your CartHedge seller workspace." path="/app/login" noIndex />
      <h1 className="font-display text-d3 font-semibold text-hi">Log in</h1>
      <p className="mt-2 text-sm text-mid">The order desk missed you.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <button onClick={onForgot} className="text-mid transition-colors hover:text-hi">
          Forgot password?
        </button>
        <Link to="/app/register" className="font-medium text-jade-ink hover:underline">
          Start free trial
        </Link>
      </div>
    </AuthLayout>
  );
}
