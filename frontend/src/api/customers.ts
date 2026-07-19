import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch } from './http';
import type { Customer } from './types';

type CustomerFilters = { search?: string; segment?: string; risk?: boolean };

export const useCustomers = (filters: CustomerFilters = {}) =>
  useQuery({
    queryKey: ['customers', filters],
    queryFn: () =>
      get<{ customers: Customer[] }>('/api/v1/customers', {
        search: filters.search,
        segment: filters.segment,
        risk: filters.risk ? 'true' : undefined,
      }),
    select: (d) => d.customers,
  });

export const useCustomer = (id: string | undefined) =>
  useQuery({
    queryKey: ['customers', id],
    queryFn: () => get<Customer>(`/api/v1/customers/${id}`),
    enabled: !!id,
  });

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, segment, riskFlagged }: { id: string; segment?: string; riskFlagged?: boolean }) =>
      patch<{ ok: boolean }>(`/api/v1/customers/${id}`, { segment, riskFlagged }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
