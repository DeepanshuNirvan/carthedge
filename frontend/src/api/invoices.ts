import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { Invoice } from './types';

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
    mutationFn: (input: { orderId: string; gstRate: number }) => post<Invoice>('/api/v1/invoices', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
