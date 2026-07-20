import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, PackageCheck, ShieldAlert } from 'lucide-react';
import { confirmCod } from '@/api/storefront';
import { Seo } from '@/lib/seo';
import { Wordmark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { toast } from '@/store/ui';

/** The RTO-cutting screen: buyer confirms they will accept the COD delivery. */
export default function CodConfirmPage() {
  const { orderCode = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmCod(orderCode, token);
      setConfirmed(true);
    } catch (e) {
      toast('error', 'Could not confirm', e instanceof Error ? e.message : 'This link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <EmptyState
        className="min-h-dvh"
        icon={<ShieldAlert className="size-5" />}
        title="Confirmation link incomplete"
        message="Open the exact link the seller sent you on WhatsApp."
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <Seo title="Confirm your order — CartHedge" description="Confirm your cash-on-delivery order." noIndex />
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          <Wordmark />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl bg-surface p-6 text-center shadow-soft hairline"
        >
          {confirmed ? (
            <>
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-jade-500/15">
                <BadgeCheck className="size-8 text-jade-500" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-hi">Order confirmed</h1>
              <p className="mt-2 text-sm leading-relaxed text-mid">
                Thanks! Your order <span className="font-mono text-hi">{orderCode}</span> is being packed. Keep the
                cash ready at delivery.
              </p>
              <Link to={`/o/${orderCode}`} className="mt-5 inline-block text-sm font-medium text-jade-500 hover:underline">
                Track your order →
              </Link>
            </>
          ) : (
            <>
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold-400/15">
                <PackageCheck className="size-8 text-gold-500" />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-hi">Confirm your COD order</h1>
              <p className="mt-2 text-sm leading-relaxed text-mid">
                Order <span className="font-mono text-hi">{orderCode}</span> ships only after you confirm. Tap below if
                you will accept the delivery and pay cash at your door.
              </p>
              <Button size="lg" className="mt-6 w-full" loading={busy} onClick={confirm}>
                Yes, I&apos;ll accept the delivery
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-low">
                Confirming helps small sellers avoid the cost of refused deliveries. If you changed your mind, simply
                ignore this — nothing will ship.
              </p>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
