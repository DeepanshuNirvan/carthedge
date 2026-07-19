import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { CheckoutInfo, Plan, Subscription } from './types';

export const usePlans = () =>
  useQuery({
    queryKey: ['plans'],
    queryFn: () => get<{ plans: Plan[] }>('/api/v1/plans', undefined, 'none'),
    select: (d) => d.plans,
    staleTime: 5 * 60_000,
  });

export const useSubscription = () =>
  useQuery({
    queryKey: ['subscription'],
    queryFn: () => get<Subscription>('/api/v1/subscription'),
  });

export const subscriptionCheckout = (planCode: string) =>
  post<CheckoutInfo>('/api/v1/subscription/checkout', { planCode });

export const subscriptionVerify = (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) => post<{ ok: boolean }>('/api/v1/subscription/verify', payload);

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ ok: boolean }>('/api/v1/subscription/cancel'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  });
}

export const requestCustomPlan = (message: string, expectedOrders: number) =>
  post<{ ok: boolean }>('/api/v1/plans/custom-request', { message, expectedOrders });
