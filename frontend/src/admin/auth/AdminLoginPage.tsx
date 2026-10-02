import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { adminLogin } from '@/api/admin';
import { ApiError } from '@/api/http';
import { toast } from '@/store/ui';
import { Wordmark } from '@/marketing/Wordmark';
import { Field, Input, PasswordInput } from '@/ui/Input';
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
      {/* the staff console: the same night lane, one lamp over a single pane of glass */}
      <div aria-hidden className="absolute inset-0">
        <img src="/demo/aurora-texture.webp" alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_40%,rgb(var(--bg)/0.55),rgb(var(--bg))_85%)]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="glass-nav sheen relative w-full max-w-sm rounded-xl p-6 shadow-float sm:p-8"
      >
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="flex items-center gap-1 rounded-full bg-gold-400/12 px-2.5 py-1 text-xs font-semibold text-gold-ink">
            <ShieldCheck className="size-3.5" /> Staff
          </span>
        </div>
        <h1 className="mt-7 text-d4 font-semibold text-hi">Platform console</h1>
        <p className="mt-1 text-sm text-mid">CartHedge staff only.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={busy} className="mt-1">
            Sign in
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
