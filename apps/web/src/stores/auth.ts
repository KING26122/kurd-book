import { create } from 'zustand';
import type { AuthPayload, User } from '@/types';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  ready: boolean;
  setSession: (payload: AuthPayload) => void;
  setUser: (user: User) => void;
  patchUser: (patch: Partial<User>) => void;
  setReady: (ready: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: (payload) => set({ user: payload.user, accessToken: payload.accessToken, ready: true }),
  setUser: (user) => set({ user }),
  patchUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  setReady: (ready) => set({ ready }),
  clear: () => set({ user: null, accessToken: null, ready: true }),
}));
