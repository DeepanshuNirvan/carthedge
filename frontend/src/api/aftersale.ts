import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { Order, OrderAfterSale, Refund, RefundMethod, ReturnInput, ReturnRequest, ReturnStatus } from './types';

// Seller side of returns, exchanges and refunds.

export const useOrderAfterSale = (orderId: string | undefined) =>
  useQuery({
    queryKey: ['aftersale', orderId],
    queryFn: () => get<OrderAfterSale>(`/api/v1/orders/${orderId}/aftersale`),
    enabled: !!orderId,
  });

/** 'open' = everything still in motion. */
export const useReturns = (status = 'open') =>
  useQuery({
    queryKey: ['returns', status],
    queryFn: () => get<{ returns: ReturnRequest[] }>('/api/v1/returns', { status, limit: 100 }),
    select: (d) => d.returns,
  });

export const usePendingRefunds = () =>
  useQuery({
    queryKey: ['refunds', 'pending'],
    queryFn: () => get<{ refunds: Refund[] }>('/api/v1/refunds/pending'),
    select: (d) => d.refunds,
  });

export type ReturnStatusInput = {
  status: ReturnStatus;
  note?: string;
  pickupCourier?: string;
  pickupTracking?: string;
  restock?: number[];
};

export type RefundInput = {
  amount: number;
  method?: RefundMethod;
  reference?: string;
  reason?: string;
  returnId?: string;
  pending?: boolean;
};

export function useAfterSaleMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['aftersale'] });
    qc.invalidateQueries({ queryKey: ['returns'] });
    qc.invalidateQueries({ queryKey: ['refunds'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };
  return {
    createReturn: useMutation({
      mutationFn: ({ orderId, input }: { orderId: string; input: ReturnInput }) =>
        post<ReturnRequest>(`/api/v1/orders/${orderId}/returns`, input),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ReturnStatusInput }) =>
        post<ReturnRequest>(`/api/v1/returns/${id}/status`, input),
      onSuccess: invalidate,
    }),
    replacement: useMutation({
      mutationFn: ({ id, shipping, paymentMethod }: { id: string; shipping: number; paymentMethod?: 'cod' | 'prepaid' }) =>
        post<Order>(`/api/v1/returns/${id}/replacement`, { shipping, paymentMethod }),
      onSuccess: invalidate,
    }),
    refund: useMutation({
      mutationFn: ({ orderId, input }: { orderId: string; input: RefundInput }) =>
        post<Refund>(`/api/v1/orders/${orderId}/refunds`, input),
      onSettled: invalidate,
    }),
    processRefund: useMutation({
      mutationFn: ({ id, method, reference }: { id: string; method: RefundMethod; reference: string }) =>
        post<Refund>(`/api/v1/refunds/${id}/process`, { method, reference }),
      onSettled: invalidate,
    }),
    cancelRefund: useMutation({
      mutationFn: (id: string) => post<{ ok: boolean }>(`/api/v1/refunds/${id}/cancel`),
      onSettled: invalidate,
    }),
  };
}

export const returnReasonLabels: Record<string, string> = {
  size: 'Size issue',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item received',
  quality: 'Quality issue',
  not_as_described: 'Not as described',
  changed_mind: 'Changed mind',
  other: 'Other',
};

export const refundMethodLabels: Record<RefundMethod, string> = {
  razorpay: 'Razorpay (original payment)',
  upi: 'UPI transfer',
  bank: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};
