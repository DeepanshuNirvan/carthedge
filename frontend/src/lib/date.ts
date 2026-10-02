import type { SalesPoint } from '@/api/types';

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export function formatDate(iso: string) {
  if (!iso) return '-';
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function timeAgo(iso: string) {
  if (!iso) return '-';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
}

/** Days until an ISO timestamp, floored at 0. */
export function daysLeft(iso: string) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The sales endpoint returns only the days that had orders, and answers any
 * window other than 90 with 30 days. Charts need every day of the window the
 * seller picked, or a single sale draws as a lone dot: this fills the gaps with
 * zero days and clips to the last `days` days (plus today). It ends on the later
 * of today and the newest point, so no returned day is ever dropped off the end.
 */
export function fillDays(series: SalesPoint[], days: number, today = new Date()): SalesPoint[] {
  const byDate = new Map(series.map((p) => [p.date.slice(0, 10), p]));
  const last = series.reduce((m, p) => (p.date.slice(0, 10) > m ? p.date.slice(0, 10) : m), dayKey(today));
  const [y, m, d] = last.split('-').map(Number);
  const end = Date.UTC(y, m - 1, d);
  return Array.from({ length: days + 1 }, (_, i) => {
    const key = new Date(end - (days - i) * 86_400_000).toISOString().slice(0, 10);
    return byDate.get(key) ?? { date: key, orders: 0, revenue: 0 };
  });
}
