import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Clock3, Hourglass, Repeat, ShieldCheck, TrendingUp } from 'lucide-react';
import { useDashboard, useInsights } from '@/api/analytics';
import { PageHeader } from '../shell/PageHeader';
import { MoneyText } from '@/ui/MoneyText';
import { Skeleton } from '@/ui/Skeleton';
import type { ReactNode } from 'react';

function InsightCard({
  icon,
  tone,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  tone: 'jade' | 'gold' | 'danger' | 'info';
  title: string;
  children: ReactNode;
  action?: { to: string; label: string };
}) {
  const tones = {
    jade: 'bg-jade-500/12 text-jade-ink',
    gold: 'bg-gold-400/14 text-gold-ink',
    danger: 'bg-danger/12 text-danger-ink',
    info: 'bg-info/12 text-info-ink',
  };
  return (
    <li className="flex gap-4 border-b px-5 py-5 last:border-b-0 sm:px-6 xl:odd:border-r xl:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold tracking-snug text-hi">{title}</h2>
        <div className="mt-1 max-w-[68ch] text-sm leading-relaxed text-mid">{children}</div>
        {action && (
          <Link
            to={action.to}
            className="mt-2.5 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-jade-ink hover:underline"
          >
            {action.label} <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </li>
  );
}

/** Glanceable, actionable reads on the seller's numbers — not a wall of charts. */
export default function InsightsPage() {
  const { data: dash } = useDashboard();
  const { data: insights, isLoading } = useInsights();

  const bestSeller = insights?.bestSellers?.[0];
  const riskBuyers = insights?.codRiskBuyers ?? [];
  const meter = insights?.rtoTrend ?? dash?.rtoMeter;
  const window = insights?.suggestedBroadcastWindow;
  const repeat = insights?.repeatBuyers;

  if (isLoading) {
    return (
      <>
        <PageHeader title="AI insights" subtitle="What your numbers are telling you" />
        <div className="panel grid overflow-hidden rounded-xl xl:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b px-6 py-5 last:border-b-0 xl:odd:border-r">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3 rounded-full" />
                <Skeleton className="h-3 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="AI insights" subtitle="What your numbers are telling you, read from your own orders" />
      <ol className="panel grid overflow-hidden rounded-xl xl:grid-cols-2">
        <InsightCard icon={<TrendingUp className="size-5" />} tone="jade" title="Best seller this month" action={{ to: '/app/products', label: 'Manage products' }}>
          {bestSeller ? (
            <>
              <span className="font-medium text-hi">{bestSeller.name}</span> leads with {bestSeller.units} {bestSeller.units === 1 ? 'unit' : 'units'}{' '}
              (<MoneyText paise={bestSeller.revenue} compact />). Keep it in stock and pin it as trending on your
              storefront.
            </>
          ) : (
            'Once sales come in, your best performer shows up here with a restock nudge.'
          )}
        </InsightCard>

        <InsightCard icon={<ShieldCheck className="size-5" />} tone="jade" title="RTO defence" action={{ to: '/app/orders', label: 'See the board' }}>
          {meter && meter.codOutcomes > 0 ? (
            <>
              Your COD refusal rate is <span className="font-medium text-hi">{meter.actualPercent}%</span> against a{' '}
              {meter.baselinePercent}% baseline, that's <MoneyText paise={meter.savedThisMonth} compact /> protected this
              month.
              {insights?.rtoTrend?.lastMonthPercent !== undefined && (
                <>
                  {' '}
                  Last month it was {insights.rtoTrend.lastMonthPercent}%
                  {meter.actualPercent < insights.rtoTrend.lastMonthPercent
                    ? ', the confirmation flow is still pulling it down.'
                    : meter.actualPercent > insights.rtoTrend.lastMonthPercent
                      ? ', it has crept up, so tighten COD confirmation on risky buyers.'
                      : ', holding steady.'}
                </>
              )}
            </>
          ) : (
            'No COD outcomes yet this month. Once orders deliver (or bounce), your savings meter fills in.'
          )}
        </InsightCard>

        <InsightCard
          icon={<AlertTriangle className="size-5" />}
          tone={riskBuyers.length > 0 ? 'danger' : 'jade'}
          title="Buyers to watch"
          action={{ to: '/app/customers', label: 'Open ledger' }}
        >
          {riskBuyers.length > 0 ? (
            <>
              <span className="font-medium text-hi">{riskBuyers.length}</span> buyer
              {riskBuyers.length !== 1 && 's'} {riskBuyers.length === 1 ? 'carries' : 'carry'} a COD-risk flag. {riskBuyers[0].name} has{' '}
              {riskBuyers[0].codRefusals} refusal{riskBuyers[0].codRefusals !== 1 && 's'}
              {riskBuyers[0].openCodOrders > 0 && ` and ${riskBuyers[0].openCodOrders} COD order${riskBuyers[0].openCodOrders !== 1 ? 's' : ''} still open`}
              . Ask for a token payment before shipping them COD.
            </>
          ) : (
            'No risk-flagged buyers right now. Refused CODs automatically flag repeat offenders here.'
          )}
        </InsightCard>

        <InsightCard icon={<Repeat className="size-5" />} tone="jade" title="Repeat rate">
          {dash && dash.totalCustomers > 0 ? (
            <>
              <span className="font-medium text-hi">{dash.repeatRatePercent}%</span> of your {dash.totalCustomers} buyers
              have ordered more than once.{' '}
              {repeat && (repeat.thisMonth > 0 || repeat.lastMonth > 0) && (
                <>
                  {repeat.thisMonth} came back this month against {repeat.lastMonth} last month.{' '}
                </>
              )}
              {dash.repeatRatePercent >= 30
                ? 'That is strong, a reseller tier could compound it.'
                : 'A broadcast to past buyers is the cheapest revenue you can get this week.'}
            </>
          ) : (
            'Repeat-buyer rate appears after your first few orders.'
          )}
        </InsightCard>

        <InsightCard icon={<Clock3 className="size-5" />} tone="gold" title="Best time to drop" action={{ to: '/app/broadcasts', label: 'Compose a drop' }}>
          {window ? (
            <>
              Your buyers order most between <span className="font-medium text-hi">{window.label}</span>.{' '}
              {window.orders} order{window.orders !== 1 && 's'} in the last 90 days landed in that hour. Schedule
              your next collection broadcast just before it.
            </>
          ) : (
            'Once you have a few months of orders, the hour your own buyers actually order in shows up here.'
          )}
        </InsightCard>

        <InsightCard icon={<Hourglass className="size-5" />} tone="jade" title="Pending money" action={{ to: '/app/orders', label: 'Clear the queue' }}>
          {dash && dash.pendingOrders > 0 ? (
            <>
              <span className="font-medium text-hi">{dash.pendingOrders}</span> order
              {dash.pendingOrders !== 1 && 's'} sit in new/confirmed. Every day an order waits, RTO odds climb, pack
              and ship the oldest first.
            </>
          ) : (
            'Nothing stuck in the pipeline. New and confirmed orders that wait too long will be called out here.'
          )}
        </InsightCard>
      </ol>
    </>
  );
}
