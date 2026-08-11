'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from '../../theme/theme';

interface ThemeContextType {
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  selectedThemePreference: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // Load initial theme preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme_preference') as 'light' | 'dark' | 'system' | null;
    if (saved) {
      setThemePreference(saved);
    }
  }, []);

  // Update resolved theme mode when preference or system theme changes
  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setResolvedMode(mediaQuery.matches ? 'dark' : 'light');
      };
      
      // Set initial
      handleChange();

      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setResolvedMode(themePreference);
    }
  }, [themePreference]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemePreference(mode);
    localStorage.setItem('theme_preference', mode);
  };

  const theme = React.useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    // Set data-theme attribute on document for global CSS support
    document.documentElement.setAttribute('data-theme', resolvedMode);
  }, [resolvedMode]);

  return (
    <ThemeContext.Provider value={{ themeMode: resolvedMode, setThemeMode, selectedThemePreference: themePreference }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a CustomThemeProvider');
  }
  return context;
};
