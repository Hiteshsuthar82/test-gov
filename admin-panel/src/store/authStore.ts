import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => {
        localStorage.setItem('adminToken', token);
        set({ token, admin });
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        set({ token: null, admin: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

