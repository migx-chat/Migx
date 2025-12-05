
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class Storage {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage not available:', e);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('localStorage not available:', e);
        return;
      }
    }
    return AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn('localStorage not available:', e);
        return;
      }
    }
    return AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.clear();
        return;
      } catch (e) {
        console.warn('localStorage not available:', e);
        return;
      }
    }
    return AsyncStorage.clear();
  }
}

export default new Storage();
