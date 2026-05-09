import { create } from 'zustand';
import { patientApi, doctorApi, adminApi } from '../services/api';

interface AvatarState {
  avatarUrl: string | null;
  isLoading: boolean;
  loadAvatar: (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => Promise<void>;
  setAvatarUrl: (url: string) => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatarUrl: null,
  isLoading: false,

  loadAvatar: async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
    try {
      set({ isLoading: true });
      let profile;
      if (role === 'PATIENT') {
        profile = await patientApi.getProfile();
      } else if (role === 'DOCTOR') {
        profile = await doctorApi.getProfile();
      } else {
        profile = await adminApi.getProfile();
      }
      set({ avatarUrl: profile.avatarUrl || null });
    } catch (error) {
      console.error('Failed to load avatar');
    } finally {
      set({ isLoading: false });
    }
  },

  setAvatarUrl: (url: string) => {
    set({ avatarUrl: url });
  }
}));
