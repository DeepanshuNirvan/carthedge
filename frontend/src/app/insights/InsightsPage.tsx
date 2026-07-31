import { Link } from 'react-router-dom';
import { AlertTriangle, Clock3, Repeat, ShieldCheck, TrendingUp } from 'lucide-react';
import { useDashboard, useInsights } from '@/api/analytics';
import { PageHeader } from '../shell/PageHeader';
import { Card } from '@/ui/Card';
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
    jade: 'bg-jade-500/12 text-jade-500',
    gold: 'bg-gold-400/14 text-gold-500',
    danger: 'bg-danger/12 text-danger',
    info: 'bg-info/12 text-info',
  };
  return (
    <Card className="flex h-full flex-col p-6">
      <span className={`flex size-10 items-center justify-center rounded-md ${tones[tone]}`}>{icon}</span>
      <h2 className="mt-4 font-display text-base font-semibold text-hi">{title}</h2>
      <div className="mt-2 flex-1 text-sm leading-relaxed text-mid">{children}</div>
      {action && (
        <Link to={action.to} className="mt-4 text-sm font-medium text-jade-500 hover:underline">
          {action.label} →
        </Link>
      )}
    </Card>
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="AI insights" subtitle="What your numbers are telling you" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <InsightCard icon={<TrendingUp className="size-5" />} tone="jade" title="Best seller this month" action={{ to: '/app/products', label: 'Manage products' }}>
          {bestSeller ? (
            <>
              <span className="font-medium text-hi">{bestSeller.name}</span> leads with {bestSeller.units} units
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
              {meter.baselinePercent}% baseline — that's <MoneyText paise={meter.savedThisMonth} compact /> protected this
              month.
              {insights?.rtoTrend?.lastMonthPercent !== undefined && (
                <>
                  {' '}
                  Last month it was {insights.rtoTrend.lastMonthPercent}%
                  {meter.actualPercent < insights.rtoTrend.lastMonthPercent
                    ? ' — the confirmation flow is still pulling it down.'
                    : meter.actualPercent > insights.rtoTrend.lastMonthPercent
                      ? ' — it has crept up, so tighten COD confirmation on risky buyers.'
                      : ' — holding steady.'}
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
              {riskBuyers.length !== 1 && 's'} carry a COD-risk flag — {riskBuyers[0].name} has{' '}
              {riskBuyers[0].codRefusals} refusal{riskBuyers[0].codRefusals !== 1 && 's'}
              {riskBuyers[0].openCodOrders > 0 && ` and ${riskBuyers[0].openCodOrders} COD order${riskBuyers[0].openCodOrders !== 1 ? 's' : ''} still open`}
              . Ask for a token payment before shipping them COD.
            </>
          ) : (
            'No risk-flagged buyers right now. Refused CODs automatically flag repeat offenders here.'
          )}
        </InsightCard>

        <InsightCard icon={<Repeat className="size-5" />} tone="info" title="Repeat rate">
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
                ? 'That is strong — a reseller tier could compound it.'
                : 'A broadcast to past buyers is the cheapest revenue you can get this week.'}
            </>
          ) : (
            'Repeat-buyer rate appears after your first few orders.'
          )}
        </InsightCard>

        <InsightCard icon={<Clock3 className="size-5" />} tone="gold" title="Best time to drop" action={{ to: '/app/broadcasts', label: 'Compose a drop' }}>
          {window ? (
            <>
              Your buyers order most between <span className="font-medium text-hi">{window.label}</span> —{' '}
              {window.orders} order{window.orders !== 1 && 's'} in the last 90 days landed in that hour. Schedule
              your next collection broadcast just before it.
            </>
          ) : (
            'Once you have a few months of orders, the hour your own buyers actually order in shows up here.'
          )}
        </InsightCard>

        <InsightCard icon={<TrendingUp className="size-5" />} tone="jade" title="Pending money" action={{ to: '/app/orders', label: 'Clear the queue' }}>
          {dash && dash.pendingOrders > 0 ? (
            <>
              <span className="font-medium text-hi">{dash.pendingOrders}</span> order
              {dash.pendingOrders !== 1 && 's'} sit in new/confirmed. Every day an order waits, RTO odds climb — pack
              and ship the oldest first.
            </>
          ) : (
            'Nothing stuck in the pipeline. New and confirmed orders that wait too long will be called out here.'
          )}
        </InsightCard>
      </div>
    </>
  );
}
