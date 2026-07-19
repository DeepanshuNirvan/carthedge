import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminSession } from '@/api/types';

// Fully separate from seller auth — tokens must never cross surfaces.
type AdminAuthState = {
  accessToken: string | null;
  name: string | null;
  email: string | null;
  setSession: (s: AdminSession) => void;
  clear: () => void;
};

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      name: null,
      email: null,
      setSession: (s) => set({ accessToken: s.accessToken, name: s.name, email: s.email }),
      clear: () => set({ accessToken: null, name: null, email: null }),
    }),
    { name: 'carthedge-admin-auth' },
  ),
);
