import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Lightweight storage helper that hides AsyncStorage errors and keeps
 * a tiny in-memory cache for mock/preview sessions.
 */
class StorageService {
  private memory: Record<string, string> = {};

  async setItem(key: string, value: any) {
    const serialized = JSON.stringify(value);
    this.memory[key] = serialized;
    try {
      await AsyncStorage.setItem(key, serialized);
    } catch (err) {
      console.warn('[storage] falling back to memory', err);
    }
  }

  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) return JSON.parse(value) as T;
    } catch (err) {
      console.warn('[storage] read failed, using memory', err);
    }
    if (this.memory[key]) {
      return JSON.parse(this.memory[key]) as T;
    }
    return fallback;
  }

  async removeItem(key: string) {
    delete this.memory[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('[storage] remove failed, ignoring', err);
    }
  }
}

export const storageService = new StorageService();
