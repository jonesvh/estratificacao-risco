import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  setUser: (email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      isAuthenticated: false,
      setUser: (email) => set({ email, isAuthenticated: true }),
      logout: () => set({ email: null, isAuthenticated: false }),
    }),
    { name: 'er-auth' },
  ),
);
