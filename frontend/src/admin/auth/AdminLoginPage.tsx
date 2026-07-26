import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { adminLogin } from '@/api/admin';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { Wordmark } from '@/marketing/Wordmark';
import { Field, Input } from '@/ui/Input';
import { Button } from '@/ui/Button';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminLogin(email, password);
      navigate('/admin');
    } catch (err) {
      toast('error', 'Access denied', err instanceof ApiError ? err.message : 'Check credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-5">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/3 top-1/4 size-96 rounded-full bg-gold-400/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 size-72 rounded-full bg-jade-500/10 blur-[110px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-raised hairline sm:p-8"
      >
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="flex items-center gap-1 rounded-full bg-gold-400/12 px-2.5 py-1 text-xs font-semibold text-gold-500">
            <ShieldCheck className="size-3.5" /> Staff
          </span>
        </div>
        <h1 className="mt-7 font-display text-xl font-semibold text-hi">Platform console</h1>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>
            Sign in
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
