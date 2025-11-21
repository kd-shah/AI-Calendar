import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import type { DecodedToken, User } from '@/lib/types';

interface AuthState {
    user: User | null;
    setUser: (user: User) => void;
    handleLogin: (token: string) => void;
    logout: () => void;

}

export const authStore = create<AuthState>(
  (set) => ({
    user: null,
    setUser: (user: User) => set({ user }),
    logout: () => {
        set({ user: null });
        localStorage.removeItem('session');
    },
    handleLogin: (token: string) => {
      const decodedToken: DecodedToken = jwtDecode(token);
      const userDetail = {
        id: decodedToken.id,
        name: decodedToken.name,
        email: decodedToken.email,
        accessToken: token,
      };
      set({ user: userDetail });
      localStorage.setItem('session', token);
    },
  })
  
);
