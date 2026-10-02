import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox, Mail } from 'lucide-react';
import { useAdminOverview, useAdminBusinesses } from '@/api/admin';
import { PageHeader } from '@/app/shell/PageHeader';
import { Card, CardHeader } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Skeleton, SkeletonRows } from '@/ui/Skeleton';
import { timeAgo } from '@/lib/date';
import { cn } from '@/lib/cn';

export default function OverviewPage() {
  const { data: o, isLoading } = useAdminOverview();
  const { data: recent } = useAdminBusinesses({ page: 1 });

  const money = [
    { label: 'Revenue this month', paise: o?.revenueThisMonth ?? 0, hint: o ? <>total <MoneyText paise={o.revenueTotal ?? 0} /></> : null },
    { label: 'GMV, last 30 days', paise: o?.gmvLast30Days ?? 0, hint: o ? `${o.ordersLast30Days} ${o.ordersLast30Days === 1 ? 'order' : 'orders'}` : null },
  ];
  const attention = [
    { to: '/admin/requests', icon: Inbox, label: 'Open plan requests', value: o?.openPlanRequests ?? 0 },
    { to: '/admin/site', icon: Mail, label: 'Website enquiries', value: o?.openEnquiries ?? 0 },
  ];
  const fleet = [
    { label: 'Businesses', value: o?.totalBusinesses ?? 0, hint: o ? `${o.newLast30Days} new in 30 days` : '' },
    { label: 'Paying', value: o?.paying ?? 0, tone: 'text-jade-ink' },
    { label: 'Trials', value: o?.trials ?? 0, tone: 'text-gold-ink' },
    { label: 'Expired / suspended', value: `${o?.expired ?? 0} / ${o?.suspended ?? 0}`, tone: o && o.suspended > 0 ? 'text-danger-ink' : '' },
  ];

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Subscriptions, money through sellers, and what is waiting on staff" />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <p className="text-[13px] font-medium text-mid">Monthly recurring revenue</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-12 w-48 rounded-full" />
          ) : (
            <p className="mt-1 text-[3rem] font-semibold leading-none tracking-tightest text-hi">
              <MoneyText paise={o?.mrr ?? 0} />
            </p>
          )}
          <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2">
            {money.map((m) => (
              <div key={m.label}>
                <p className="text-xs text-low">{m.label}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-hi">
                  <MoneyText paise={m.paise} />
                </p>
                {m.hint && <p className="mt-0.5 text-xs text-low">{m.hint}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Waiting on staff" />
          <ul className="flex flex-1 flex-col divide-y px-2 pb-2 pt-2">
            {attention.map((a) => (
              <li key={a.label}>
                <Link
                  to={a.to}
                  className="group flex items-center gap-3 rounded-md px-3 py-3.5 transition-colors hover:bg-[rgb(var(--field)/0.05)]"
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full',
                      a.value > 0 ? 'bg-gold-400/14 text-gold-ink' : 'bg-[rgb(var(--field)/0.07)] text-low',
                    )}
                  >
                    <a.icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-medium text-hi">{a.label}</span>
                  <span className="text-xl font-semibold tnum text-hi">{a.value}</span>
                  <ArrowUpRight className="size-4 text-low opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4 grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
        {fleet.map((f) => (
          <div key={f.label} className="p-5">
            <p className="text-xs text-low">{f.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold tracking-tight tnum text-hi', f.tone)}>{isLoading ? '-' : f.value}</p>
            {f.hint && <p className="mt-0.5 text-xs text-low">{f.hint}</p>}
          </div>
        ))}
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Recent signups"
          action={
            <Link to="/admin/businesses" className="flex min-h-9 items-center gap-1 text-sm font-medium text-jade-ink hover:underline">
              All businesses <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <div className="px-2 pb-2 pt-3">
          {!recent ? (
            <SkeletonRows rows={4} className="px-3" />
          ) : (
            <ul className="divide-y">
              {recent.businesses.slice(0, 8).map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/admin/businesses/${b.id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-[rgb(var(--field)/0.04)]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--field)/0.07)] text-[12px] font-semibold text-mid">
                      {b.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-hi">
                        {b.name} <span className="font-mono text-xs text-low">/{b.code}</span>
                      </p>
                      <p className="truncate text-xs text-low">
                        {[b.ownerName, b.city, timeAgo(b.createdAt)].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <StatusChip status={b.subscriptionStatus || b.status} className="hidden sm:inline-flex" />
                    <span className="w-20 shrink-0 text-right text-xs text-mid tnum">
                      {b.ordersCount} {b.ordersCount === 1 ? 'order' : 'orders'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
