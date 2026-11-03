import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeId } from '@/types';

export const THEMES: Array<{
  id: ThemeId;
  name: string;
  subtitle: string;
  swatch: string[];
}> = [
  {
    id: 'dark',
    name: 'Dark',
    subtitle: 'شەوی کوردی — سەوز و ئاڵتوونی نەرم',
    swatch: ['#07101d', '#39e0b2', '#f3cc6d'],
  },
  {
    id: 'moredark',
    name: 'More Dark',
    subtitle: 'ڕەشترین ڕەنگ — بۆ چاوی شەوانە',
    swatch: ['#000000', '#c8ff6b', '#f4f4f4'],
  },
  {
    id: 'rush',
    name: 'Rush',
    subtitle: 'وزە و خێرایی — وەنەوشەی کارەبایی',
    swatch: ['#0c0618', '#b45bff', '#3cf2e3'],
  },
  {
    id: 'gold',
    name: 'Gold',
    subtitle: 'شکۆی ئاڵتوونی — کلاسیکی کوردستان',
    swatch: ['#0b0905', '#e8c56b', '#fff1bf'],
  },
];

interface ThemeStore {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'kurdbook-theme' },
  ),
);

export function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
  const colors: Record<ThemeId, string> = {
    dark: '#07101d',
    moredark: '#000000',
    rush: '#0c0618',
    gold: '#0b0905',
  };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors[theme]);
}
