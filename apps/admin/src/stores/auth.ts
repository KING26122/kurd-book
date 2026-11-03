import { create } from 'zustand';
import type { AuthPayload, AdminUser } from '@/types';

interface AdminAuthStore {
  user: AdminUser | null;
  accessToken: string | null;
  ready: boolean;
  setSession: (payload: AuthPayload) => void;
  setReady: (ready: boolean) => void;
  clear: () => void;
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: (payload) => set({ user: payload.user, accessToken: payload.accessToken, ready: true }),
  setReady: (ready) => set({ ready }),
  clear: () => set({ user: null, accessToken: null, ready: true }),
}));
