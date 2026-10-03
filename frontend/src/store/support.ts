import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SupportSession } from '@/api/types';

// A CartHedge admin viewing a seller's workspace, read-only. It lives in this
// tab only (sessionStorage), never touching the seller's own saved login.
type SupportState = {
  session: SupportSession | null;
  start: (s: SupportSession) => void;
  end: () => void;
};

export const useSupport = create<SupportState>()(
  persist(
    (set) => ({
      session: null,
      start: (session) => set({ session }),
      end: () => set({ session: null }),
    }),
    { name: 'carthedge-support', storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** The live support session, if one is open and not yet expired. */
export const activeSupport = () => {
  const s = useSupport.getState().session;
  return s && new Date(s.expiresAt).getTime() > Date.now() ? s : null;
};
