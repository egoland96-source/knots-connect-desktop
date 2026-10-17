import React, { createContext, useContext } from 'react';
import { theme } from './index';

interface ThemeContextValue {
  theme: Theme;
}

type Theme = typeof theme;

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme };
  }
  return ctx;
}
