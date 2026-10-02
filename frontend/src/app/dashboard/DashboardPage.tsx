import { Link } from 'react-router-dom';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { AlertTriangle, ArrowUpRight, KanbanSquare, Link2, Repeat, ShieldCheck } from 'lucide-react';
import { useDashboard, useSales, useTopProducts } from '@/api/analytics';
import { useOrders } from '@/api/orders';
import { useAuth } from '@/store/auth';
import { formatPaise } from '@/lib/money';
import { timeAgo } from '@/lib/date';
import { cn } from '@/lib/cn';
import { PageHeader } from '../shell/PageHeader';
import { SalesAreaChart, TopProductsChart } from '../analytics/charts';
import { Card, CardHeader } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Progress } from '@/ui/Progress';
import { Skeleton, SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { buttonLink } from '@/ui/buttonLink';

function Rupees({ paise }: { paise: number }) {
  const spring = useSpring(0, { stiffness: 70, damping: 20 });
  useEffect(() => spring.set(paise), [paise, spring]);
  const text = useTransform(spring, (v) => formatPaise(Math.round(v)));
  return <motion.span className="tnum">{text}</motion.span>;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Below this many settled COD orders the rate is noise, not a trend. */
const minCodOutcomes = 5;

/** Money kept from refused COD deliveries this month, with the rate against baseline. */
function RtoMeter() {
  const { data, isLoading } = useDashboard();
  const meter = data?.rtoMeter;
  const baseline = meter?.baselinePercent ?? 30;
  const actual = meter?.actualPercent ?? 8;
  const outcomes = meter?.codOutcomes ?? 0;
  const enoughData = !meter || outcomes >= minCodOutcomes;
  const improved = actual <= baseline;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] font-medium text-mid">
          <ShieldCheck className="size-4 text-gold-ink" aria-hidden /> Kept from refused COD this month
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-10 w-40 rounded-full" />
      ) : (
        <p className="mt-2 text-[2.25rem] font-semibold leading-none tracking-tightest text-gold-ink">
          <Rupees paise={meter?.savedThisMonth ?? 0} />
        </p>
      )}
      <div className="mt-5 space-y-3">
        <div>
          <div className="flex justify-between text-xs text-mid">
            <span>Baseline refusals</span>
            <span className="tnum text-danger-ink">{baseline}%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-danger/70" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-mid">
            <span>Yours this month</span>
            <span className={cn('tnum', improved ? 'text-jade-ink' : 'text-danger-ink')}>
              {enoughData ? `${actual}%` : 'Measuring'}
            </span>
          </div>
          <motion.div
            className={cn('mt-1.5 h-1.5 rounded-full', improved ? 'bg-jade-500' : 'bg-danger')}
            initial={{ width: 0 }}
            animate={{ width: `${baseline > 0 ? Math.max(3, Math.min((actual / baseline) * 100, 100)) : 0}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-low">
        {enoughData
          ? `${outcomes} COD deliveries settled this month.`
          : `${outcomes} of ${minCodOutcomes} COD deliveries settled. The rate shows once there is enough to trust.`}
      </p>
    </Card>
  );
}

function NeedsYou() {
  const { data: dash, isLoading } = useDashboard();
  const rows = [
    {
      to: '/app/orders',
      icon: KanbanSquare,
      label: 'Pending orders',
      hint: 'New and confirmed',
      value: dash?.pendingOrders ?? 0,
      tone: 'text-hi',
    },
    {
      to: '/app/customers',
      icon: AlertTriangle,
      label: 'COD at risk',
      hint: 'Unconfirmed or flagged',
      value: dash?.codAtRisk ?? 0,
      tone: dash && dash.codAtRisk > 0 ? 'text-danger-ink' : 'text-hi',
    },
    {
      to: '/app/customers',
      icon: Repeat,
      label: 'Repeat customers',
      hint: `Of ${dash?.totalCustomers ?? 0} buyers`,
      value: `${dash?.repeatRatePercent ?? 0}%`,
      tone: 'text-hi',
    },
  ];
  return (
    <Card className="flex flex-col">
      <CardHeader title="Needs you" subtitle="What to look at next" />
      <ul className="mt-2 flex flex-1 flex-col divide-y px-2 pb-2">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="group flex items-center gap-3 rounded-md px-3 py-3.5 transition-colors hover:bg-[rgb(var(--field)/0.05)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--field)/0.07)] text-mid">
                <r.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-hi">{r.label}</span>
                <span className="block text-xs text-low">{r.hint}</span>
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-10 rounded-full" />
              ) : (
                <span className={cn('text-xl font-semibold tracking-tight tnum', r.tone)}>{r.value}</span>
              )}
              <ArrowUpRight className="size-4 text-low opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: dash, isLoading } = useDashboard();
  const { data: sales } = useSales(30);
  const { data: topProducts } = useTopProducts();
  const { data: recentOrders, isLoading: ordersLoading } = useOrders({ limit: 6 });
  const businessName = useAuth((s) => s.businessName);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHeader
        title={`${greeting()}${businessName ? `, ${businessName}` : ''}`}
        subtitle={today}
        actions={
          <>
            <Link to="/app/links" className={buttonLink('secondary')}>
              <Link2 className="size-4" aria-hidden /> New link
            </Link>
            <Link to="/app/orders" className={buttonLink('primary')}>
              <KanbanSquare className="size-4" aria-hidden /> Order board
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* today, with the month's revenue line under it */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 p-5 pb-0 sm:p-6 sm:pb-0">
            <div>
              <p className="text-[13px] font-medium text-mid">Today&apos;s sales</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-11 w-44 rounded-full" />
              ) : (
                <p className="mt-1 text-[2.75rem] font-semibold leading-none tracking-tightest text-hi">
                  <Rupees paise={dash?.todayRevenue ?? 0} />
                </p>
              )}
              <p className="mt-2 text-sm text-low">
                {dash?.todayOrders ?? 0} {dash?.todayOrders === 1 ? 'order' : 'orders'} today
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-low">This month</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight text-hi">
                  <MoneyText paise={dash?.monthRevenue ?? 0} />
                </p>
              </div>
              <div>
                <p className="text-xs text-low">Orders</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight tnum text-hi">{dash?.monthOrders ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="mt-auto px-2 pb-2 pt-4">
            {sales ? <SalesAreaChart series={sales} height={220} /> : <Skeleton className="m-3 h-52" />}
          </div>
        </Card>

        <div className="grid gap-4">
          <NeedsYou />
          <RtoMeter />
        </div>
      </div>

      {dash?.quota && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-hi">
              Plan usage <span className="text-low">·</span> <span className="capitalize">{dash.quota.plan}</span>
            </p>
            <p className="text-xs text-mid tnum">
              {dash.quota.used} of {dash.quota.included} orders
              {dash.quota.overageOrders > 0 && (
                <span className="text-gold-ink">
                  {' '}
                  ({dash.quota.overageOrders} over, <MoneyText paise={dash.quota.overageFee} /> fee)
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title="Top products" subtitle="By revenue, last 30 days" />
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

        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link to="/app/orders" className="flex min-h-9 items-center gap-1 text-sm font-medium text-jade-ink hover:underline">
                View board <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="px-2 pb-2 pt-3">
            {ordersLoading ? (
              <SkeletonRows rows={5} className="px-3" />
            ) : recentOrders && recentOrders.length > 0 ? (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 rounded-md px-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--field)/0.07)] text-[12px] font-semibold text-mid">
                      {o.customerName?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-hi">{o.customerName}</p>
                      <p className="truncate text-xs text-low">
                        <span className="font-mono">#{o.code}</span> · {o.items.length} item{o.items.length !== 1 && 's'},{' '}
                        {timeAgo(o.createdAt)}
                      </p>
                    </div>
                    <StatusChip status={o.status} className="hidden sm:inline-flex" />
                    <MoneyText paise={o.total} className="w-20 shrink-0 text-right text-sm font-semibold sm:w-24" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No orders yet"
                message="Share your store link, or connect Instagram and let the assistant start taking orders."
                action={
                  <Link to="/app/links" className={buttonLink('secondary')}>
                    Create a share link
                  </Link>
                }
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
