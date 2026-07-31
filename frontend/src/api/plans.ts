import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { Capability, CheckoutInfo, Plan, Subscription } from './types';

type SubscriptionResponse = { subscription: Subscription; overageFee: number; overageOrders: number };

export const usePlans = () =>
  useQuery({
    queryKey: ['plans'],
    queryFn: () => get<{ plans: Plan[] }>('/api/v1/plans', undefined, 'none'),
    select: (d) => d.plans,
    staleTime: 5 * 60_000,
  });

// the endpoint wraps the subscription alongside the overage preview
export const useSubscriptionInfo = () =>
  useQuery({
    queryKey: ['subscription'],
    queryFn: () => get<SubscriptionResponse>('/api/v1/subscription'),
  });

export const useSubscription = () => {
  const { data, ...rest } = useSubscriptionInfo();
  return { ...rest, data: data?.subscription };
};

/**
 * Plan entitlements, straight from the subscription the API enforces — the UI
 * never keeps its own copy of who gets what.
 */
export const useCan = (capability: Capability) => {
  const { data: sub, isLoading } = useSubscription();
  return { allowed: !!sub?.capabilities?.includes(capability), planName: sub?.planName ?? '', isLoading };
};

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
