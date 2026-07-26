import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SalesPoint, TopProduct } from '@/api/types';
import { formatPaiseCompact, formatPaise } from '@/lib/money';
import { useIsMobile } from '@/hooks/useMediaQuery';

// tokens, not hardcoded colors — charts follow the active theme
const jade = 'rgb(var(--jade-500))';
const grid = 'rgb(var(--line) / var(--line-a))';
const tickStyle = { fill: 'rgb(var(--text-low))', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' };

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-surface px-3 py-2 text-xs shadow-raised hairline">
      <p className="text-low">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 font-mono font-medium text-hi tnum">
          {money ? formatPaise(p.value) : p.value.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function SalesAreaChart({ series, height = 260 }: { series: SalesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={jade} stopOpacity={0.28} />
            <stop offset="100%" stopColor={jade} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tickFormatter={(v: number) => formatPaiseCompact(v)} tick={tickStyle} axisLine={false} tickLine={false} width={54} />
        <Tooltip content={<ChartTooltip money />} cursor={{ stroke: grid, strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={jade}
          strokeWidth={2}
          fill="url(#salesFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({ series, height = 260 }: { series: SalesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barCategoryGap="35%">
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: grid }} />
        <Bar dataKey="orders" name="Orders" fill={jade} radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ products, height = 260 }: { products: TopProduct[]; height?: number }) {
  const data = products.slice(0, 6);
  const mobile = useIsMobile(); // a 120px label gutter eats half a phone screen
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }} barCategoryGap="30%">
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" tickFormatter={(v: number) => formatPaiseCompact(v)} tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={mobile ? 76 : 120}
          tick={{ ...tickStyle, fontFamily: 'Satoshi, sans-serif', fill: 'rgb(var(--text-mid))' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip money />} cursor={{ fill: grid }} />
        <Bar dataKey="revenue" name="Revenue" fill={jade} radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fillOpacity={1 - i * 0.11} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
