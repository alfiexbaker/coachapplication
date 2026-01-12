import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

const logger = createLogger('StorageService');

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
      logger.warn('Falling back to memory storage', { key, error: err });
    }
  }

  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) return JSON.parse(value) as T;
    } catch (err) {
      logger.warn('Read failed, using memory fallback', { key, error: err });
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
      logger.warn('Remove failed, ignoring', { key, error: err });
    }
  }
}

export const storageService = new StorageService();
