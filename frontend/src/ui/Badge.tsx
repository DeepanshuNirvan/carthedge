import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'jade' | 'gold' | 'danger' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  jade: 'bg-jade-500/14 text-jade-ink shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.2)]',
  gold: 'bg-gold-400/16 text-gold-ink shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.26)]',
  danger: 'bg-danger/14 text-danger-ink shadow-[inset_0_0_0_1px_rgb(var(--danger)/0.22)]',
  info: 'bg-info/14 text-info-ink shadow-[inset_0_0_0_1px_rgb(var(--info)/0.22)]',
  neutral: 'bg-[rgb(var(--field)/0.07)] text-mid shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold leading-none tracking-[0.005em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  // gold = live / needs a move now, jade = settled; blue is not in the palette
  new: 'gold',
  confirmed: 'jade',
  packed: 'neutral',
  shipped: 'neutral',
  delivered: 'jade',
  rto: 'danger',
  cancelled: 'neutral',
  trial: 'gold',
  active: 'jade',
  expired: 'danger',
  suspended: 'danger',
  paid: 'jade',
  pending: 'gold',
  token_paid: 'gold',
  claimed: 'gold', // buyer says they sent a UPI transfer; seller has not verified it
  failed: 'danger',
  open: 'gold',
  contacted: 'gold',
  closed: 'neutral',
  draft: 'neutral',
  sent: 'jade',
  sending: 'gold',
  scheduled: 'neutral',
};

const statusLabels: Record<string, string> = { rto: 'RTO', claimed: 'payment reported' };
const labelOf = (s: string) => statusLabels[s] ?? s.replace(/_/g, ' ');

/**
 * Status pill that shows its own history: when the status changes, the old
 * word is struck through in place for a beat before it gives way, so a seller
 * sees "new" become "confirmed" rather than a pill silently changing colour.
 */
export function StatusChip({ status, className }: { status: string; className?: string }) {
  const prev = useRef(status);
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    if (prev.current === status) return;
    setLeaving(prev.current);
    prev.current = status;
    const t = setTimeout(() => setLeaving(null), 1100);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <Badge tone={statusTones[status] ?? 'neutral'} className={cn('capitalize', className)}>
      {leaving && (
        <span className="strike-out opacity-60" aria-hidden>
          {labelOf(leaving)}
        </span>
      )}
      <span className={leaving ? 'animate-rise' : undefined}>{labelOf(status)}</span>
    </Badge>
  );
}
