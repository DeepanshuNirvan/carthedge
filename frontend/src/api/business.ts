import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from './http';
import type { AiProfile, AlertPrefs, BusinessProfile, CheckoutRules, GstProfile, StorePolicies } from './types';

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
    | 'freeShippingAbove'
    | 'codEnabled'
    | 'codTokenAmount'
    | 'baselineRtoPercent'
  >
>;

/** One settings document, saved whole (see internal/shop). */
export type SettingsSections = {
  policies: StorePolicies;
  ai: AiProfile;
  checkout: CheckoutRules;
  gst: GstProfile;
  alerts: AlertPrefs;
};

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

export function useUpdateSettings<K extends keyof SettingsSections>(section: K) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: SettingsSections[K]) => put<BusinessProfile>(`/api/v1/business/settings/${section}`, doc),
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
