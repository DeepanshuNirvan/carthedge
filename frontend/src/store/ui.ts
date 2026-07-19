import { create } from 'zustand';

export type Toast = {
  id: number;
  kind: 'success' | 'error' | 'info';
  title: string;
  message?: string;
};

type UiState = {
  toasts: Toast[];
  paywallOpen: boolean;
  toast: (kind: Toast['kind'], title: string, message?: string) => void;
  dismissToast: (id: number) => void;
  setPaywall: (open: boolean) => void;
};

let nextId = 1;

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  paywallOpen: false,
  toast: (kind, title, message) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, kind, title, message }] });
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setPaywall: (open) => set({ paywallOpen: open }),
}));

export const toast = (kind: Toast['kind'], title: string, message?: string) =>
  useUi.getState().toast(kind, title, message);
