import { STORAGE_KEYS, getUserKey } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingSelfSettingService');

class BookingSelfSettingService {
  async isEnabled(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }
    try {
      const key = getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, userId);
      return await apiClient.get<boolean>(key, false);
    } catch (error) {
      logger.error('Failed to load allow-book-self setting', { userId, error });
      return false;
    }
  }

  async setEnabled(userId: string, enabled: boolean): Promise<boolean> {
    if (!userId) {
      return false;
    }
    try {
      const key = getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, userId);
      await apiClient.set(key, enabled);
      return true;
    } catch (error) {
      logger.error('Failed to save allow-book-self setting', { userId, enabled, error });
      return false;
    }
  }
}

export const bookingSelfSettingService = new BookingSelfSettingService();
