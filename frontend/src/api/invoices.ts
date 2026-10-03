import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { Invoice, InvoiceCreateInput, PlatformInvoice } from './types';

export const useInvoices = () =>
  useQuery({
    queryKey: ['invoices'],
    queryFn: () => get<{ invoices: Invoice[] }>('/api/v1/invoices'),
    select: (d) => d.invoices,
  });

export const useInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: ['invoices', id],
    queryFn: () => get<Invoice>(`/api/v1/invoices/${id}`),
    enabled: !!id,
  });

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceCreateInput) => post<Invoice>('/api/v1/invoices', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orders'] }); // the drawer swaps "Create invoice" for "Open invoice"
    },
  });
}

/** CartHedge's own GST invoices for the seller's subscription payments. */
export const usePlatformInvoices = () =>
  useQuery({
    queryKey: ['subscription', 'invoices'],
    queryFn: () => get<{ invoices: PlatformInvoice[] }>('/api/v1/subscription/invoices'),
    select: (d) => d.invoices,
  });
