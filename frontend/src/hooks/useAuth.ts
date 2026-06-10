import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const { email, isAuthenticated, setUser, logout } = useAuthStore();
  return { email, isAuthenticated, setUser, logout };
}
