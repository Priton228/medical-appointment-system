import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, phone: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { accessToken, role, userId, fullName } = response.data;
          
          const user = { id: userId, email, fullName, role };
          
          set({
            accessToken,
            user,
            isAuthenticated: true
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          toast.success('Добро пожаловать!');
          return user;
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Ошибка входа');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (fullName: string, email: string, phone: string, password: string, confirmPassword: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', { fullName, email, phone, password, confirmPassword });
          const { accessToken, role, userId } = response.data;
          
          set({
            accessToken,
            user: { id: userId, email, fullName, role },
            isAuthenticated: true
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          toast.success('Регистрация успешна!');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Ошибка регистрации');
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
        toast.success('Вы вышли из системы');
      },

      setToken: (token: string) => {
        set({ accessToken: token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);