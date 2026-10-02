import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Seo } from '@/lib/seo';
import { resetPassword } from '@/api/auth';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { AuthLayout } from './AuthLayout';
import { Field, PasswordInput } from '@/ui/Input';
import { Button } from '@/ui/Button';

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type ResetForm = z.infer<typeof schema>;

/** Landing page for the link in the forgot-password email (/reset-password?token=…). */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetForm) => {
    setBusy(true);
    try {
      await resetPassword(token, data.password);
      toast('success', 'Password updated', 'Sign in with your new password.');
      navigate('/app/login');
    } catch (e) {
      toast('error', 'Could not reset', e instanceof ApiError ? e.message : 'The link may have expired, request a new one.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <Seo title="Reset password | CartHedge" description="Set a new CartHedge password." path="/reset-password" noIndex />
      <h1 className="text-d3 font-semibold text-hi">Set a new password</h1>
      {token ? (
        <>
          <p className="mt-2 text-sm text-mid">Pick something you have not used before.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
            <Field label="New password" error={errors.password?.message}>
              <PasswordInput autoComplete="new-password" {...register('password')} />
            </Field>
            <Field label="Confirm password" error={errors.confirm?.message}>
              <PasswordInput autoComplete="new-password" {...register('confirm')} />
            </Field>
            <Button type="submit" size="lg" loading={busy}>
              Update password
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-2 text-sm text-mid">
          This link is missing its token. Request a fresh reset link from the login page.
        </p>
      )}
      <Link to="/app/login" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-jade-ink hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}
