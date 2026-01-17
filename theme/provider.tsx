import { devLog } from '@/utils/devLog';
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme, ThemeType, ThemeMode } from './index';

const THEME_STORAGE_KEY = '@app_theme_mode';
const FONT_SIZE_STORAGE_KEY = '@app_font_size';
const BASE_FONT_SIZE = 16;

// Storage abstraction that works on web and mobile
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
};

interface ThemeContextType {
  theme: ThemeType;
  mode: ThemeMode;
  isDark: boolean;
  fontSize: number;
  fontScale: number;
  scaleSize: (size: number) => number;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProviderCustom({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [fontSize, setFontSizeState] = useState<number>(16);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedMode, savedFontSize] = await Promise.all([
        storage.getItem(THEME_STORAGE_KEY),
        storage.getItem(FONT_SIZE_STORAGE_KEY)
      ]);

      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setMode(savedMode as ThemeMode);
      }
      
      if (savedFontSize) {
        const size = parseInt(savedFontSize, 10);
        if (!isNaN(size)) {
          setFontSizeState(size);
        }
      }
    } catch (error) {
      devLog('Error loading settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemeMode = async (newMode: ThemeMode) => {
    try {
      await storage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      devLog('Error saving theme mode:', error);
    }
  };

  const saveFontSize = async (size: number) => {
    try {
      await storage.setItem(FONT_SIZE_STORAGE_KEY, size.toString());
    } catch (error) {
      devLog('Error saving font size:', error);
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

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    saveFontSize(size);
  }, []);

  const fontScale = fontSize / BASE_FONT_SIZE;

  const scaleSize = useCallback((size: number) => {
    return Math.round(size * fontScale);
  }, [fontScale]);

  const value: ThemeContextType = {
    theme: getActiveTheme(),
    mode,
    isDark: isDark(),
    fontSize,
    fontScale,
    scaleSize,
    toggleTheme,
    setThemeMode,
    setFontSize,
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

// Anda mungkin perlu mengimpor dan menggunakan hook/komponen ini di file lain
// Misalnya, di App.tsx:
// import { ThemeProviderCustom } from './theme/provider'; // Sesuaikan path
//
// function App() {
//   return (
//     <ThemeProviderCustom>
//       {/* Komponen aplikasi Anda yang lain */}
//     </ThemeProviderCustom>
//   );
// }