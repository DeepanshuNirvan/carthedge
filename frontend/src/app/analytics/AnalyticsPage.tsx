import { useState } from 'react';
import { useMonthlyReport, useSales, useTopProducts } from '@/api/analytics';
import { PageHeader } from '../shell/PageHeader';
import { SalesAreaChart, OrdersBarChart, TopProductsChart } from './charts';
import { Card, CardHeader } from '@/ui/Card';
import { Tabs } from '@/ui/Tabs';
import { MoneyText } from '@/ui/MoneyText';
import { StatusChip } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { Button } from '@/ui/Button';

const ranges = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const [month, setMonth] = useState('');
  const { data: sales } = useSales(Number(range));
  const { data: top } = useTopProducts(Number(range));
  const { data: report } = useMonthlyReport(month || undefined);

  const exportReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carthedge-report-${report.month}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Analytics"
        actions={<Tabs tabs={[...ranges]} value={range} onChange={setRange} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue" subtitle={`Last ${range} days`} />
          <div className="p-3 pt-4">{sales ? <SalesAreaChart series={sales} /> : <Skeleton className="m-2 h-60" />}</div>
        </Card>
        <Card>
          <CardHeader title="Orders" subtitle={`Last ${range} days`} />
          <div className="p-3 pt-4">{sales ? <OrdersBarChart series={sales} /> : <Skeleton className="m-2 h-60" />}</div>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top products" subtitle="By revenue" />
          <div className="p-3 pt-4">
            {top ? <TopProductsChart products={top} /> : <Skeleton className="m-2 h-60" />}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Monthly report"
            subtitle="Accountant-ready summary"
            action={
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  aria-label="Report month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-9 rounded-md bg-surface-2 px-3 text-sm text-hi hairline focus:outline-none"
                />
                <Button variant="secondary" size="sm" onClick={exportReport} disabled={!report}>
                  Export
                </Button>
              </div>
            }
          />
          <div className="p-5 pt-4">
            {report ? (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-low">Orders</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold tnum text-hi">{report.orders}</dd>
                </div>
                <div>
                  <dt className="text-xs text-low">Revenue</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold text-hi">
                    <MoneyText paise={report.revenue} compact />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-low">RTO saved</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold text-jade-500">
                    <MoneyText paise={report.rtoMeter?.savedThisMonth ?? 0} compact />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-low">COD revenue</dt>
                  <dd className="mt-0.5 font-mono text-sm text-hi tnum">
                    <MoneyText paise={report.codRevenue} compact />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-low">Prepaid revenue</dt>
                  <dd className="mt-0.5 font-mono text-sm text-hi tnum">
                    <MoneyText paise={report.prepaidRevenue} compact />
                  </dd>
                </div>
                {report.quota && (
                  <div>
                    <dt className="text-xs text-low">Quota used</dt>
                    <dd className="mt-0.5 font-mono text-sm text-hi tnum">
                      {report.quota.used}/{report.quota.included}
                    </dd>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-3">
                  <dt className="mb-2 text-xs text-low">Orders by status</dt>
                  <dd className="flex flex-wrap gap-2">
                    {Object.entries(report.ordersByStatus ?? {}).map(([status, count]) => (
                      <span key={status} className="flex items-center gap-1.5">
                        <StatusChip status={status} />
                        <span className="font-mono text-xs text-mid tnum">{count}</span>
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
