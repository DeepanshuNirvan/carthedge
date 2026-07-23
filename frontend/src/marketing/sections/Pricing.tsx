import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { pricing } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { usePlans } from '@/api/plans';
import { formatPaise } from '@/lib/money';
import { buttonLink } from '@/ui/buttonLink';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { cn } from '@/lib/cn';

// live prices from GET /api/v1/plans; static fallback keeps the page whole offline
const fallbackPlans = [
  { code: 'starter', name: 'Starter', priceMonthly: 49900, orderQuota: 100, perOrderFee: 300, features: ['Storefront + share links', 'Order board', 'COD confirmation', 'Phone OTP checkout'], isCustom: false, id: 'starter' },
  { code: 'growth', name: 'Growth', priceMonthly: 99900, orderQuota: 400, perOrderFee: 250, features: ['Everything in Starter', 'AI order capture', 'Broadcasts', 'Reseller pricing', 'Analytics'], isCustom: false, id: 'growth' },
  { code: 'pro', name: 'Pro', priceMonthly: 199900, orderQuota: 1500, perOrderFee: 200, features: ['Everything in Growth', 'Courier handoff', 'GST-lite invoices', 'AI reply assistant', 'Priority support'], isCustom: false, id: 'pro' },
];

export function Pricing() {
  const { data, isLoading } = usePlans();
  const plans = (data?.filter((p) => !p.isCustom) ?? fallbackPlans).slice(0, 3);

  return (
    <Section id="pricing">
      <SectionHead eyebrow={pricing.eyebrow} title={pricing.title} sub={pricing.sub} />
      <div className="grid gap-5 lg:grid-cols-4">
        {isLoading && !data
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96" />)
          : plans.map((plan, i) => {
              const popular = plan.code === 'growth';
              return (
                <Reveal key={plan.code} delay={i * 0.07}>
                  <article
                    className={cn(
                      'relative flex h-full flex-col rounded-2xl p-7 transition-transform duration-std ease-enter hover:-translate-y-1',
                      popular ? 'glass sheen shadow-glow' : 'glass sheen shadow-float',
                    )}
                  >
                    {popular && (
                      <Badge tone="jade" className="absolute -top-3 left-1/2 -translate-x-1/2">
                        {pricing.popular}
                      </Badge>
                    )}
                    <h3 className="font-display text-lg font-semibold text-hi">{plan.name}</h3>
                    <p className="mt-3">
                      <span className="font-display text-4xl font-semibold tracking-tight text-hi tnum">
                        {formatPaise(plan.priceMonthly)}
                      </span>
                      <span className="text-sm text-low">{pricing.perMonth}</span>
                    </p>
                    <p className="mt-1.5 text-xs text-low">
                      {pricing.quotaNote(plan.orderQuota, formatPaise(plan.perOrderFee))}
                    </p>
                    <ul className="mt-6 flex flex-col gap-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-mid">
                          <Check className="mt-0.5 size-4 shrink-0 text-jade-500" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/app/register"
                      className={cn('mt-8', buttonLink(popular ? 'primary' : 'secondary'), 'w-full')}
                    >
                      {pricing.cta}
                    </Link>
                  </article>
                </Reveal>
              );
            })}

        <Reveal delay={0.21}>
          <article className="glass sheen relative flex h-full flex-col overflow-hidden rounded-2xl p-7 shadow-soft">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_0%,rgb(var(--gold-400)/0.14),transparent_55%)]"
            />
            <h3 className="relative font-display text-lg font-semibold text-gold-500">{pricing.custom.title}</h3>
            <p className="relative mt-3 text-sm leading-relaxed text-mid">{pricing.custom.copy}</p>
            <Link to="/contact" className={cn('relative mt-8', buttonLink('gold'), 'w-full')}>
              {pricing.custom.cta}
            </Link>
          </article>
        </Reveal>
      </div>
      <p className="mt-10 text-center text-sm text-low">{pricing.roi}</p>
    </Section>
  );
}
