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
import { Field, Input, PasswordInput } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Bell, Check } from 'lucide-react';

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });
type LoginForm = z.infer<typeof loginSchema>;

function AsidePitch() {
  return (
    <div className="max-w-md">
      <p className="text-d2 font-semibold text-hi">Welcome back. The stall stayed open.</p>
      <div className="mt-8 flex flex-col gap-2">
        {[
          { icon: Check, text: 'The assistant answered while you were away' },
          { icon: Bell, text: 'Orders are waiting for your approval' },
        ].map((n) => (
          <div key={n.text} className="glass-nav sheen flex w-fit items-center gap-3 rounded-[20px] py-2.5 pl-2.5 pr-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-jade-500 text-[rgb(var(--text-on-accent))]">
              <n.icon className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-[13.5px] font-medium text-hi">{n.text}</span>
          </div>
        ))}
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
      <Seo title="Log in | CartHedge" description="Sign in to your CartHedge seller workspace." path="/app/login" noIndex />
      <h1 className="text-d3 font-semibold text-hi">Log in</h1>
      <p className="mt-2 text-[15px] text-mid">Pick up where the assistant left off.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={busy} className="mt-1">
          Log in
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button onClick={onForgot} className="min-h-11 text-mid transition-colors hover:text-hi">
          Forgot password?
        </button>
        <Link to="/app/register" className="flex min-h-11 items-center font-medium text-jade-ink hover:underline">
          Start free trial
        </Link>
      </div>
    </AuthLayout>
  );
}
