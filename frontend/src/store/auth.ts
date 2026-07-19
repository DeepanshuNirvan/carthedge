import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/api/types';

// Access token lives in memory only; refresh token + identity persist.
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  businessId: string | null;
  businessCode: string | null;
  businessName: string | null;
  trialEndsAt: string | null;
  setSession: (s: Session) => void;
  setTokens: (access: string, refresh: string) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      businessId: null,
      businessCode: null,
      businessName: null,
      trialEndsAt: null,
      setSession: (s) =>
        set({
          accessToken: s.accessToken,
          refreshToken: s.refreshToken,
          businessId: s.businessId,
          businessCode: s.businessCode,
          businessName: s.businessName,
          trialEndsAt: s.trialEndsAt ?? null,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          businessId: null,
          businessCode: null,
          businessName: null,
          trialEndsAt: null,
        }),
    }),
    {
      name: 'carthedge-auth',
      partialize: (s) => ({
        refreshToken: s.refreshToken,
        businessId: s.businessId,
        businessCode: s.businessCode,
        businessName: s.businessName,
        trialEndsAt: s.trialEndsAt,
      }),
    },
  ),
);
