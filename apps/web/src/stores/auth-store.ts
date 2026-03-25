import { create } from 'zustand';
import type { User } from '@threatpad/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true, isLoading: false }),
  setToken: (token) => set({ accessToken: token }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
