import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from './http';
import type { ConsentEvent, Customer } from './types';

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

/** The buyer's WhatsApp-offers record: every yes and no, with what they agreed to. */
export const useCustomerConsents = (id: string | undefined) =>
  useQuery({
    queryKey: ['customers', id, 'consents'],
    queryFn: () => get<{ consents: ConsentEvent[] }>(`/api/v1/customers/${id}/consents`),
    select: (d) => d.consents,
    enabled: !!id,
  });

/** Stops offers for a buyer who asked; a seller can never turn them on. */
export function useStopMarketing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/api/v1/customers/${id}/marketing/stop`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['broadcastAudience'] });
    },
  });
}

/** A buyer's DPDP erasure request: their personal data goes, the order money stays. */
export function useEraseCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<{ ok: boolean }>(`/api/v1/customers/${id}/erase`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
