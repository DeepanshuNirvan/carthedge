import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, put } from './http';
import type {
  AdminBusinessDetail,
  AdminBusinessRow,
  AdminOverview,
  AdminPayment,
  AdminSession,
  Capability,
  ContactMessage,
  Plan,
  PlanRequest,
  SiteSettings,
} from './types';
import { useAdminAuth } from '@/store/adminAuth';

export async function adminLogin(email: string, password: string) {
  const session = await post<AdminSession>('/api/v1/admin/login', { email, password }, 'none');
  useAdminAuth.getState().setSession(session);
  return session;
}

export const adminChangePassword = (currentPassword: string, newPassword: string) =>
  put<{ ok: boolean }>('/api/v1/admin/password', { currentPassword, newPassword }, 'admin');

export const useAdminOverview = () =>
  useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => get<AdminOverview>('/api/v1/admin/overview', undefined, 'admin'),
  });

export const useAdminBusinesses = (filters: { search?: string; status?: string; page?: number } = {}) =>
  useQuery({
    queryKey: ['admin', 'businesses', filters],
    queryFn: () =>
      get<{ businesses: AdminBusinessRow[]; total: number }>('/api/v1/admin/businesses', { ...filters }, 'admin'),
  });

export const useAdminBusiness = (id: string | undefined) =>
  useQuery({
    queryKey: ['admin', 'businesses', id],
    queryFn: () => get<AdminBusinessDetail>(`/api/v1/admin/businesses/${id}`, undefined, 'admin'),
    enabled: !!id,
  });

export function useAdminBusinessMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'businesses'] });
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
        patch<{ ok: boolean }>(`/api/v1/admin/businesses/${id}/status`, { status }, 'admin'),
      onSuccess: invalidate,
    }),
    assignPlan: useMutation({
      mutationFn: ({
        id,
        planCode,
        customPrice,
        extendDays,
      }: {
        id: string;
        planCode: string;
        customPrice?: number;
        extendDays: number;
      }) =>
        post<{ ok: boolean }>(`/api/v1/admin/businesses/${id}/plan`, { planCode, customPrice, extendDays }, 'admin'),
      onSuccess: invalidate,
    }),
  };
}

// the response also carries the capability vocabulary the editor picks from,
// so the entitlement list stays defined in one place — the Go API
export const useAdminPlans = () =>
  useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => get<{ plans: Plan[]; capabilities: Capability[] }>('/api/v1/admin/plans', undefined, 'admin'),
  });

export function useAdminPlanMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
  return {
    create: useMutation({
      mutationFn: (input: Partial<Plan>) => post<{ ok: boolean }>('/api/v1/admin/plans', input, 'admin'),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<Plan> }) =>
        put<{ ok: boolean }>(`/api/v1/admin/plans/${id}`, input, 'admin'),
      onSuccess: invalidate,
    }),
  };
}

export const useAdminPlanRequests = (status?: string) =>
  useQuery({
    queryKey: ['admin', 'planRequests', status],
    queryFn: () => get<{ requests: PlanRequest[] }>('/api/v1/admin/plan-requests', { status }, 'admin'),
    select: (d) => d.requests ?? [],
  });

export function useUpdatePlanRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote: string }) =>
      patch<{ ok: boolean }>(`/api/v1/admin/plan-requests/${id}`, { status, adminNote }, 'admin'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'planRequests'] }),
  });
}

export const useAdminEnquiries = (status?: string) =>
  useQuery({
    queryKey: ['admin', 'enquiries', status],
    queryFn: () => get<{ messages: ContactMessage[] }>('/api/v1/admin/enquiries', { status }, 'admin'),
    select: (d) => d.messages ?? [],
  });

export function useUpdateEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote: string }) =>
      patch<{ ok: boolean }>(`/api/v1/admin/enquiries/${id}`, { status, adminNote }, 'admin'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enquiries'] }),
  });
}

export const useAdminPayments = (page = 1) =>
  useQuery({
    queryKey: ['admin', 'payments', page],
    queryFn: () => get<{ payments: AdminPayment[] }>('/api/v1/admin/payments', { page }, 'admin'),
    select: (d) => d.payments ?? [],
  });

export const useAdminSettings = () =>
  useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => get<SiteSettings>('/api/v1/admin/settings', undefined, 'admin'),
  });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<SiteSettings>) =>
      put<{ ok: boolean }>('/api/v1/admin/settings', settings, 'admin'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['site'] });
    },
  });
}
