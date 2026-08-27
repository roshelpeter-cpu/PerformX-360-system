import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setInitialized: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
    }),
  setInitialized: (value) => set({ isInitialized: value }),
  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));
