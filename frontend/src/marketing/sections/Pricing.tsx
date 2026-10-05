import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { pricing } from '@/strings/marketing';
import { usePlans } from '@/api/plans';
import { formatPaise } from '@/lib/money';
import { buttonLink } from '@/ui/buttonLink';
import { Skeleton } from '@/ui/Skeleton';
import { Tilt } from '@/ui/Tilt';
import { cn } from '@/lib/cn';
import { Reveal, SectionHead } from '../Section';

// live prices from GET /api/v1/plans; static fallback keeps the page whole offline
const fallbackPlans = [
  { code: 'starter', name: 'Starter', priceMonthly: 49900, orderQuota: 100, perOrderFee: 300, features: ['Storefront and share links', 'Order board', 'COD confirmation', 'Phone OTP checkout'], isCustom: false, id: 'starter' },
  { code: 'growth', name: 'Growth', priceMonthly: 99900, orderQuota: 500, perOrderFee: 250, features: ['Everything in Starter', 'AI order capture from DMs', 'Broadcasts', 'Offers and reseller pricing', 'Invoices and reports'], isCustom: false, id: 'growth' },
  { code: 'pro', name: 'Pro', priceMonthly: 199900, orderQuota: 2000, perOrderFee: 200, features: ['Everything in Growth', 'AI sales assistant with auto-reply', 'Courier handoff', 'Back-in-stock waitlists', 'Priority support'], isCustom: false, id: 'pro' },
];

// Every public plan is shown (an admin-created fourth tier must not vanish);
// the slab splits into as many columns as there are plans, up to four.
const columnsFor = (count: number) =>
  ({ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' })[count] ?? 'md:grid-cols-2 xl:grid-cols-4';

/** What the plan stands in for, struck through one after another as it scrolls in. */
function Replaces() {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <Reveal className="mb-10 sm:mb-12">
      <p ref={ref} className="max-w-[60ch] text-base leading-relaxed text-mid sm:text-lg">
        <span className="font-medium text-hi">{pricing.replacesLead} </span>
        {pricing.replaces.map((r, i) => (
          <span key={r}>
            <span
              className={cn('whitespace-nowrap', inView && 'strike-out')}
              style={{ ['--strike-delay' as string]: `${300 + i * 160}ms` }}
            >
              {r}
            </span>
            {i < pricing.replaces.length - 2 ? ', ' : i === pricing.replaces.length - 2 ? ' and ' : '.'}
          </span>
        ))}
      </p>
    </Reveal>
  );
}

export function Pricing() {
  const { data, isLoading } = usePlans();
  const plans = data?.filter((p) => !p.isCustom) ?? fallbackPlans;

  return (
    <section id="pricing" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={pricing.title} sub={pricing.sub} className="mb-6 sm:mb-8" />
      <Replaces />

      <Reveal>
        <div className="glass sheen overflow-hidden rounded-xl">
          {isLoading && !data ? (
            <div className="grid gap-px md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-4 p-7">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-4/5 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className={cn('grid', columnsFor(plans.length))}>
              {plans.map((plan) => {
                const popular = plan.code === 'growth';
                return (
                  <article
                    key={plan.code}
                    className={cn('relative flex flex-col p-6 rule-br sm:p-7', popular && 'bg-bulb/6')}
                  >
                    {popular && (
                      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bulb/80 to-transparent" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-title font-semibold tracking-snug text-hi">{plan.name}</h3>
                      {popular && (
                        <span className="flex items-center gap-1.5 text-note font-medium text-gold-ink">
                          <span className="bulb size-1.5" data-lit="true" />
                          {pricing.popular}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="text-figure font-semibold tnum text-hi">
                        {formatPaise(plan.priceMonthly)}
                      </span>
                      <span className="text-sm text-low">{pricing.perMonth}</span>
                    </p>
                    <p className="mt-2 text-note text-low">
                      {pricing.quotaNote(plan.orderQuota, formatPaise(plan.perOrderFee))}
                    </p>
                    <ul className="mt-6 flex flex-col gap-2.5 border-t pt-5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-ui leading-snug text-mid">
                          <Check className="mt-0.5 size-4 shrink-0 text-jade-ink" strokeWidth={2.4} aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">
                      {popular ? (
                        <Tilt className="w-full">
                          <Link to="/app/register" className={cn(buttonLink('primary'), 'w-full')}>
                            {pricing.cta}
                          </Link>
                        </Tilt>
                      ) : (
                        <Link to="/app/register" className={cn(buttonLink('secondary'), 'w-full')}>
                          {pricing.cta}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-title font-semibold tracking-snug text-hi">{pricing.custom.title}</p>
              <p className="mt-0.5 text-sm text-mid">{pricing.custom.copy}</p>
            </div>
            <Link to="/contact" className={cn(buttonLink('ghost'), 'shrink-0 self-start text-gold-ink sm:self-auto')}>
              {pricing.custom.cta}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
