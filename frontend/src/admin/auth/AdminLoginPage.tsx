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
    <div className="grain relative flex min-h-dvh items-center justify-center overflow-hidden p-5">
      {/* Staff console reads as instrument panel, not marketing: a measured grid
          and one restrained warm light, rather than the pair of floating colour
          blobs this had — that pattern is the generic AI login background. */}
      <div aria-hidden className="absolute inset-0">
        <div className="cart-grid opacity-70" />
        <div className="absolute left-1/2 top-0 size-[38rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgb(var(--gold-400)/0.10),transparent_64%)] blur-2xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-xl bg-surface p-6 shadow-raised hairline sm:p-8"
      >
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="flex items-center gap-1 rounded-full bg-gold-400/12 px-2.5 py-1 text-xs font-semibold text-gold-ink">
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
