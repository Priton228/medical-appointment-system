import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const applyThemeClass = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      
      toggleTheme: () => {
        const newTheme = !get().isDarkMode;
        set({ isDarkMode: newTheme });
        applyThemeClass(newTheme);
      },
      
      setTheme: (dark: boolean) => {
        set({ isDarkMode: dark });
        applyThemeClass(dark);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        applyThemeClass(Boolean(state?.isDarkMode));
      },
    }
  )
);
