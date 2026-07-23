import { Link } from 'react-router-dom';
import { motion, useSpring, useTransform } from 'framer-motion';
import { AlertTriangle, IndianRupee, KanbanSquare, Repeat, ShieldCheck, ShoppingBag, TrendingDown } from 'lucide-react';
import { useDashboard, useSales, useTopProducts } from '@/api/analytics';
import { useOrders } from '@/api/orders';
import { formatPaise } from '@/lib/money';
import { timeAgo } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { SalesAreaChart, TopProductsChart } from '../analytics/charts';
import { StatTile } from '@/ui/StatTile';
import { Card, CardHeader } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Progress } from '@/ui/Progress';
import { Skeleton, SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

function SavedAmount({ paise }: { paise: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  spring.set(paise);
  const text = useTransform(spring, (v) => formatPaise(Math.round(v)));
  return <motion.span className="font-display tnum">{text}</motion.span>;
}

/** The emotional hero of the whole app — money the seller kept, in rupees. */
function RtoMeterHero() {
  const { data, isLoading } = useDashboard();
  const meter = data?.rtoMeter;
  const baseline = meter?.baselinePercent ?? 30;
  const actual = meter?.actualPercent ?? 8;
  const reduction = baseline > 0 ? Math.round(((baseline - actual) / baseline) * 100) : 0;

  return (
    <Card glass className="relative overflow-hidden rounded-2xl p-6 shadow-float sm:p-8">
      <div aria-hidden className="absolute -right-20 -top-24 size-64 rounded-full bg-jade-500/20 blur-[90px]" />
      <div aria-hidden className="absolute -left-16 bottom-[-6rem] size-52 rounded-full bg-gold-400/12 blur-[80px]" />
      <div className="relative grid items-center gap-8 sm:grid-cols-[1.35fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jade-500/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-jade-400">
            <ShieldCheck className="size-3.5" /> RTO shield · this month
          </span>
          {isLoading ? (
            <Skeleton className="mt-4 h-14 w-56" />
          ) : (
            <p className="mt-4 font-display text-[3rem] font-semibold leading-none tracking-tight text-brand-grad sm:text-[3.75rem]">
              <SavedAmount paise={meter?.savedThisMonth ?? 0} />
            </p>
          )}
          <p className="mt-3 text-sm text-mid">
            You kept this from refused deliveries. RTO is down to{' '}
            <span className="font-semibold text-jade-400">{actual}%</span> from a{' '}
            <span className="font-semibold text-danger">{baseline}%</span> baseline
            {meter ? ` · ${meter.codOutcomes} COD outcomes` : ''}.
          </p>
        </div>

        {/* the reduction, visualised */}
        <div className="rounded-xl neu p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-hi">
              <TrendingDown className="size-4 text-jade-400" /> RTO cut
            </span>
            <span className="font-display text-2xl font-semibold tnum text-jade-400">{reduction}%</span>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-mid">
                <span>Baseline</span>
                <span className="tnum text-danger">{baseline}%</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full neu-inset">
                <div className="h-full rounded-full bg-gradient-to-r from-danger to-[rgb(210_78_66)]" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-mid">
                <span>With CartHedge</span>
                <span className="tnum text-jade-400">{actual}%</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full neu-inset">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-jade-400 to-jade-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${baseline > 0 ? (actual / baseline) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: dash, isLoading } = useDashboard();
  const { data: sales } = useSales(30);
  const { data: topProducts } = useTopProducts();
  const { data: recentOrders, isLoading: ordersLoading } = useOrders({ limit: 6 });

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Today at a glance" />

      <RtoMeterHero />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Today's sales"
          value={<MoneyText paise={dash?.todayRevenue ?? 0} />}
          hint={`${dash?.todayOrders ?? 0} orders today`}
          icon={<IndianRupee className="size-4.5" />}
          accent="jade"
          loading={isLoading}
        />
        <StatTile
          label="This month"
          value={<MoneyText paise={dash?.monthRevenue ?? 0} />}
          hint={`${dash?.monthOrders ?? 0} orders`}
          icon={<ShoppingBag className="size-4.5" />}
          loading={isLoading}
        />
        <StatTile
          label="Pending orders"
          value={dash?.pendingOrders ?? 0}
          hint="new + confirmed"
          icon={<KanbanSquare className="size-4.5" />}
          loading={isLoading}
        />
        <StatTile
          label="COD at risk"
          value={dash?.codAtRisk ?? 0}
          hint="unconfirmed or flagged"
          icon={<AlertTriangle className="size-4.5" />}
          accent={dash && dash.codAtRisk > 0 ? 'danger' : undefined}
          loading={isLoading}
        />
        <StatTile
          label="Repeat customers"
          value={`${dash?.repeatRatePercent ?? 0}%`}
          hint={`of ${dash?.totalCustomers ?? 0} buyers`}
          icon={<Repeat className="size-4.5" />}
          loading={isLoading}
        />
      </div>

      {dash?.quota && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-hi">
              Plan usage — <span className="capitalize">{dash.quota.plan}</span>
            </p>
            <p className="text-xs text-mid tnum">
              {dash.quota.used}/{dash.quota.included} orders
              {dash.quota.overageOrders > 0 && (
                <span className="text-gold-500">
                  {' '}
                  · {dash.quota.overageOrders} over · <MoneyText paise={dash.quota.overageFee} /> fee
                </span>
              )}
            </p>
          </div>
          <Progress
            className="mt-3"
            value={dash.quota.used}
            max={dash.quota.included}
            tone={dash.quota.overageOrders > 0 ? 'gold' : 'jade'}
          />
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Revenue" subtitle="Last 30 days" />
          <div className="p-3 pt-4">
            {sales ? <SalesAreaChart series={sales} /> : <Skeleton className="m-2 h-60" />}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Top products" subtitle="By revenue" />
          <div className="p-3 pt-4">
            {topProducts && topProducts.length > 0 ? (
              <TopProductsChart products={topProducts} />
            ) : topProducts ? (
              <EmptyState title="No sales yet" message="Your best sellers will rank here." />
            ) : (
              <Skeleton className="m-2 h-60" />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent orders"
          action={
            <Link to="/app/orders" className="text-sm font-medium text-jade-500 hover:underline">
              View board →
            </Link>
          }
        />
        <div className="p-5 pt-4">
          {ordersLoading ? (
            <SkeletonRows rows={4} />
          ) : recentOrders && recentOrders.length > 0 ? (
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-hi">
                      {o.customerName} <span className="font-mono text-xs text-low">#{o.code}</span>
                    </p>
                    <p className="text-xs text-low">
                      {o.items.length} item{o.items.length !== 1 && 's'} · {timeAgo(o.createdAt)}
                    </p>
                  </div>
                  <StatusChip status={o.status} />
                  <MoneyText paise={o.total} className="w-24 text-right text-sm" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No orders yet"
              message="Share your storefront link or paste a DM into the AI desk to create your first order."
              action={
                <Link to="/app/links" className="text-sm font-medium text-jade-500 hover:underline">
                  Create a share link →
                </Link>
              }
            />
          )}
        </div>
      </Card>
    </>
  );
}
