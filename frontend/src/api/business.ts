import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from './http';
import type { BusinessProfile } from './types';

export type BusinessUpdate = Partial<
  Pick<
    BusinessProfile,
    | 'name'
    | 'ownerName'
    | 'phone'
    | 'whatsapp'
    | 'instagram'
    | 'address'
    | 'city'
    | 'state'
    | 'pincode'
    | 'gstin'
    | 'logoUrl'
    | 'shippingFee'
    | 'codEnabled'
    | 'codTokenAmount'
    | 'baselineRtoPercent'
  >
>;

export type PaymentSettings = { razorpayKeyId?: string; razorpayKeySecret?: string; upiId?: string };

export type AiSettings = { autoReply?: boolean; autoOrder?: boolean; notes?: string };

export const useBusiness = () =>
  useQuery({ queryKey: ['business'], queryFn: () => get<BusinessProfile>('/api/v1/business') });

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessUpdate) => put<BusinessProfile>('/api/v1/business', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }),
  });
}

export function useUpdateAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AiSettings) => put<BusinessProfile>('/api/v1/business/ai', input),
    onSuccess: (profile) => qc.setQueryData(['business'], profile),
  });
}

export function useUpdatePayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentSettings) => put<{ ok: boolean }>('/api/v1/business/payments', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }),
  });
}
