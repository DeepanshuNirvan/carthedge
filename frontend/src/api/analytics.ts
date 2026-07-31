import { useQuery } from '@tanstack/react-query';
import { get } from './http';
import type { Dashboard, Insights, MonthlyReport, SalesPoint, TopProduct } from './types';

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get<Dashboard>('/api/v1/dashboard'),
    refetchInterval: 60_000,
  });

export const useSales = (days: number) =>
  useQuery({
    queryKey: ['analytics', 'sales', days],
    queryFn: () => get<{ series: SalesPoint[] }>('/api/v1/analytics/sales', { days }),
    select: (d) => d.series,
  });

export const useTopProducts = (days = 30) =>
  useQuery({
    queryKey: ['analytics', 'products', days],
    queryFn: () => get<{ products: TopProduct[] }>('/api/v1/analytics/products', { days }),
    select: (d) => d.products ?? [],
  });

export const useInsights = () =>
  useQuery({
    queryKey: ['insights'],
    queryFn: () => get<Insights>('/api/v1/insights'),
    staleTime: 5 * 60_000,
  });

export const useMonthlyReport = (month?: string) =>
  useQuery({
    queryKey: ['analytics', 'monthly', month],
    queryFn: () => get<MonthlyReport>('/api/v1/reports/monthly', { month }),
  });
