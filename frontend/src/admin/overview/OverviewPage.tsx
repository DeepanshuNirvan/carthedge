import { Link } from 'react-router-dom';
import { Building2, IndianRupee, Inbox, Mail, ShoppingBag } from 'lucide-react';
import { useAdminOverview, useAdminBusinesses } from '@/api/admin';
import { PageHeader } from '@/app/shell/PageHeader';
import { StatTile } from '@/ui/StatTile';
import { Card, CardHeader } from '@/ui/Card';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { SkeletonRows } from '@/ui/Skeleton';
import { timeAgo } from '@/lib/date';

export default function OverviewPage() {
  const { data: o, isLoading } = useAdminOverview();
  const { data: recent } = useAdminBusinesses({ page: 1 });

  return (
    <>
      <PageHeader title="Platform overview" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="MRR" value={<MoneyText paise={o?.mrr ?? 0} compact />} icon={<IndianRupee className="size-4.5" />} accent="jade" loading={isLoading} />
        <StatTile label="Revenue this month" value={<MoneyText paise={o?.revenueThisMonth ?? 0} compact />} hint={o ? `total ${'₹'}${Math.round((o.revenueTotal ?? 0) / 100).toLocaleString('en-IN')}` : undefined} loading={isLoading} />
        <StatTile label="GMV (30d)" value={<MoneyText paise={o?.gmvLast30Days ?? 0} compact />} hint={o ? `${o.ordersLast30Days} orders` : undefined} icon={<ShoppingBag className="size-4.5" />} loading={isLoading} />
        <StatTile label="Open plan requests" value={o?.openPlanRequests ?? 0} icon={<Inbox className="size-4.5" />} accent={o && o.openPlanRequests > 0 ? 'gold' : undefined} loading={isLoading} />
        <StatTile label="Website enquiries" value={o?.openEnquiries ?? 0} icon={<Mail className="size-4.5" />} accent={o && o.openEnquiries > 0 ? 'gold' : undefined} loading={isLoading} />
        <StatTile label="Businesses" value={o?.totalBusinesses ?? 0} hint={o ? `${o.newLast30Days} new in 30d` : undefined} icon={<Building2 className="size-4.5" />} loading={isLoading} />
        <StatTile label="Paying" value={o?.paying ?? 0} accent="jade" loading={isLoading} />
        <StatTile label="Trials" value={o?.trials ?? 0} loading={isLoading} />
        <StatTile label="Expired / suspended" value={`${o?.expired ?? 0} / ${o?.suspended ?? 0}`} accent={o && o.suspended > 0 ? 'danger' : undefined} loading={isLoading} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent signups"
          action={
            <Link to="/admin/businesses" className="text-sm font-medium text-jade-500 hover:underline">
              All businesses →
            </Link>
          }
        />
        <div className="p-5 pt-4">
          {!recent ? (
            <SkeletonRows rows={4} />
          ) : (
            <ul className="divide-y">
              {recent.businesses.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/businesses/${b.id}`} className="truncate text-sm font-medium text-hi hover:text-jade-500">
                      {b.name} <span className="font-mono text-xs text-low">/{b.code}</span>
                    </Link>
                    <p className="text-xs text-low">
                      {b.ownerName} · {b.city || '—'} · {timeAgo(b.createdAt)}
                    </p>
                  </div>
                  <StatusChip status={b.subscriptionStatus || b.status} />
                  <span className="w-16 text-right font-mono text-xs text-mid tnum">{b.ordersCount} ord</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
