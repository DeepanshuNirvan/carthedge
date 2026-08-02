import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from './http';
import type { Order, OrderBoard, OrderCreateInput, OrderStatus } from './types';

type OrderFilters = { status?: string; search?: string; payment?: string; page?: number; limit?: number };

export const useOrders = (filters: OrderFilters = {}) =>
  useQuery({
    queryKey: ['orders', filters],
    queryFn: () => get<{ orders: Order[] }>('/api/v1/orders', { ...filters }),
    select: (d) => d.orders,
  });

export const useOrderBoard = () =>
  useQuery({
    queryKey: ['orders', 'board'],
    queryFn: () => get<OrderBoard>('/api/v1/orders/board'),
    refetchInterval: 30_000,
  });

export const useOrder = (id: string | undefined) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: () => get<Order>(`/api/v1/orders/${id}`),
    enabled: !!id,
  });

export function useOrderMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: OrderCreateInput) => post<Order>('/api/v1/orders', input),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
        patch<Order>(`/api/v1/orders/${id}/status`, { status, note }),
      // optimistic board move — rollback on error
      onMutate: async ({ id, status }) => {
        await qc.cancelQueries({ queryKey: ['orders', 'board'] });
        const prev = qc.getQueryData<OrderBoard>(['orders', 'board']);
        if (prev) {
          const columns = Object.fromEntries(
            Object.entries(prev.columns).map(([col, orders]) => [col, orders.filter((o) => o.id !== id)]),
          ) as OrderBoard['columns'];
          const moved = Object.values(prev.columns)
            .flat()
            .find((o) => o.id === id);
          if (moved) columns[status] = [{ ...moved, status }, ...columns[status]];
          qc.setQueryData<OrderBoard>(['orders', 'board'], { ...prev, columns });
        }
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(['orders', 'board'], ctx.prev);
      },
      onSettled: invalidate,
    }),
    ship: useMutation({
      mutationFn: ({ id, courierName, trackingId }: { id: string; courierName: string; trackingId: string }) =>
        post<Order>(`/api/v1/orders/${id}/ship`, { courierName, trackingId }),
      onSuccess: invalidate,
    }),
    resendCodConfirmation: useMutation({
      mutationFn: (id: string) => post<{ ok: boolean }>(`/api/v1/orders/${id}/resend-confirmation`),
      onSuccess: invalidate,
    }),
    // seller's verdict on a UPI transfer the buyer reported
    confirmPayment: useMutation({
      mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
        post<{ ok: boolean }>(`/api/v1/orders/${id}/payment/confirm`, { approved }),
      onSuccess: invalidate,
    }),
  };
}
