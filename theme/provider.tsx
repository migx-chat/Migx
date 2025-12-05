import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme, ThemeType, ThemeMode } from './index';

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeContextType {
  theme: ThemeType;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProviderCustom({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.log('Error loading theme mode:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemeMode = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.log('Error saving theme mode:', error);
    }
  };

  const getActiveTheme = useCallback((): ThemeType => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? DarkTheme : LightTheme;
    }
    return mode === 'dark' ? DarkTheme : LightTheme;
  }, [mode, systemColorScheme]);

  const isDark = useCallback((): boolean => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = isDark() ? 'light' : 'dark';
    setMode(newMode);
    saveThemeMode(newMode);
  }, [isDark]);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    saveThemeMode(newMode);
  }, []);

  const value: ThemeContextType = {
    theme: getActiveTheme(),
    mode,
    isDark: isDark(),
    toggleTheme,
    setThemeMode,
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeCustom(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeCustom must be used within a ThemeProviderCustom');
  }
  return context;
}