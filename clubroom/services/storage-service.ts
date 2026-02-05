import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('StorageService');

/**
 * Lightweight storage helper that delegates to apiClient and keeps
 * a tiny in-memory cache for mock/preview sessions.
 */
class StorageService {
  private memory: Record<string, string> = {};

  async setItem<T>(key: string, value: T) {
    const serialized = JSON.stringify(value);
    this.memory[key] = serialized;
    try {
      await apiClient.set(key, value);
    } catch (err) {
      logger.warn('Falling back to memory storage', { key, error: err });
    }
  }

  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await apiClient.get<T | null>(key, null);
      if (value !== null) return value;
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
      await apiClient.remove(key);
    } catch (err) {
      logger.warn('Remove failed, ignoring', { key, error: err });
    }
  }
}

export const storageService = new StorageService();
