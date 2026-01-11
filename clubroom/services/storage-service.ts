import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse, safeJsonStringify } from '@/utils/safe-json';

/**
 * Lightweight storage helper that hides AsyncStorage errors and keeps
 * a tiny in-memory cache for mock/preview sessions.
 *
 * Uses safe JSON parsing to prevent crashes from corrupted storage data.
 */
class StorageService {
  private memory: Record<string, string> = {};

  async setItem(key: string, value: unknown): Promise<void> {
    const serialized = safeJsonStringify(value);
    if (serialized === null) {
      console.warn('[storage] Failed to serialize value for key:', key);
      return;
    }
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
      if (value) {
        return safeJsonParse(value, fallback);
      }
    } catch (err) {
      console.warn('[storage] read failed, using memory', err);
    }
    if (this.memory[key]) {
      return safeJsonParse(this.memory[key], fallback);
    }
    return fallback;
  }

  async removeItem(key: string): Promise<void> {
    delete this.memory[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('[storage] remove failed, ignoring', err);
    }
  }
}

export const storageService = new StorageService();
