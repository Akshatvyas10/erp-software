import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ROYAL_THEMES, type RoyalTheme } from '@/lib/royalThemes';
import { useQuery } from '@tanstack/react-query';
import { getSchoolConfig } from '@/features/school-config/api/schoolConfigApi';
import { useThemeMode } from '@/store/hooks';

interface ThemeContextType {
  activeTheme: RoyalTheme;
  themeId: string;
  setTheme: (id: string) => void;
  availableThemes: RoyalTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useThemeMode();
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('erp_active_theme') || 'royal-purple';
  });

  // Query server schoolConfig to sync persisted active theme
  const { data: config } = useQuery({
    queryKey: ['schoolConfig'],
    queryFn: getSchoolConfig,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (config?.activeTheme && config.activeTheme !== themeId) {
      setThemeId(config.activeTheme);
      localStorage.setItem('erp_active_theme', config.activeTheme);
    }
  }, [config?.activeTheme]);

  const activeTheme = useMemo(() => {
    return ROYAL_THEMES.find((t) => t.id === themeId) || ROYAL_THEMES[0];
  }, [themeId]);

  // Synchronize HTML element class with Redux persisted mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Apply CSS Variables dynamically on theme or dark-mode changes
  useEffect(() => {
    const root = document.documentElement;
    const tokens = isDark ? activeTheme.dark : activeTheme.light;

    root.style.setProperty('--primary', tokens.primary);
    root.style.setProperty('--primary-foreground', tokens.primaryForeground);
    root.style.setProperty('--ring', tokens.ring);
    root.style.setProperty('--accent', tokens.accent);
    root.style.setProperty('--accent-foreground', tokens.accentForeground);
  }, [activeTheme, isDark]);

  const setTheme = (newId: string) => {
    setThemeId(newId);
    localStorage.setItem('erp_active_theme', newId);
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, themeId, setTheme, availableThemes: ROYAL_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useRoyalTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useRoyalTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
