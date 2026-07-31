import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useCan } from '@/api/plans';
import type { Capability } from '@/api/types';
import { capabilityLabels } from '@/strings/capabilities';
import { Card } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';
import { buttonLink } from '@/ui/buttonLink';
import { cn } from '@/lib/cn';

/**
 * Plan gate for a whole screen. The API refuses these routes anyway — this is
 * the seller-facing half, so a locked feature reads as an upsell instead of an
 * error toast.
 */
export function FeatureGate({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { allowed, planName, isLoading } = useCan(capability);
  if (isLoading) return <Skeleton className="h-64" />;
  if (allowed) return <>{children}</>;

  const meta = capabilityLabels[capability];
  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center p-6 text-center sm:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-gold-400/14 text-gold-500">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-hi">{meta.label} is not on your plan</h2>
      <p className="mt-2 text-sm leading-relaxed text-mid">
        {meta.blurb}. {planName ? `Your ${planName} plan does not include it — ` : ''}upgrade to switch it on right away.
      </p>
      <Link to="/app/billing" className={cn('mt-6', buttonLink('primary'))}>
        See plans
      </Link>
    </Card>
  );
}

/** Inline variant for a single control inside an otherwise-allowed screen. */
export function useFeatureLock(capability: Capability) {
  const { allowed } = useCan(capability);
  return {
    allowed,
    lockProps: allowed
      ? {}
      : { disabled: true, title: `${capabilityLabels[capability].label} needs a higher plan` },
  };
}
