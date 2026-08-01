import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/api/types';

type Tone = 'jade' | 'gold' | 'danger' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  jade: 'bg-jade-500/14 text-jade-ink shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.22)]',
  gold: 'bg-gold-400/16 text-gold-ink shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.28)]',
  danger: 'bg-danger/14 text-danger-ink shadow-[inset_0_0_0_1px_rgb(var(--danger)/0.24)]',
  info: 'bg-info/14 text-info-ink shadow-[inset_0_0_0_1px_rgb(var(--info)/0.24)]',
  neutral: 'bg-surface-3 text-mid shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]',
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
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  new: 'info',
  confirmed: 'jade',
  packed: 'gold',
  shipped: 'info',
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
  open: 'info',
  contacted: 'gold',
  closed: 'neutral',
  draft: 'neutral',
  sent: 'jade',
  sending: 'gold',
  scheduled: 'info',
};

const statusLabels: Partial<Record<OrderStatus, string>> = { rto: 'RTO' };

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const label = statusLabels[status as OrderStatus] ?? status.replace(/_/g, ' ');
  return (
    <Badge tone={statusTones[status] ?? 'neutral'} className={cn('capitalize', className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
