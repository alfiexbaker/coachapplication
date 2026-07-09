import { STORAGE_KEYS, getUserKey } from '@/constants/storage-keys';
import { api } from '@/constants/config';
import { apiClient, apiFetch } from '@/services/api-client';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { isBrowserFetchFailure } from '@/utils/network-errors';

const logger = createLogger('BookingSelfSettingService');
const USE_MOCK = api.useMock;

interface ApiBookingPreferencesResponse {
  preferences: {
    userId: string;
    allowBookSelf: boolean;
  };
}

class BookingSelfSettingService {
  isSupported(): boolean {
    return true;
  }

  async isEnabled(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }
    if (!USE_MOCK) {
      const result = await apiFetch<ApiBookingPreferencesResponse>('/v1/me/booking-preferences', {
        method: 'GET',
      });
      if (!result.success) {
        const payload = {
          userId,
          error: result.error.message,
        };
        if (isBrowserFetchFailure(result.error)) {
          logger.warn('Failed to load allow-book-self setting from API', payload);
        } else {
          logger.error('Failed to load allow-book-self setting from API', payload);
        }
        throw new Error(result.error.message);
      }
      return result.data.preferences.allowBookSelf;
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
    if (!USE_MOCK) {
      const result = await apiFetch<ApiBookingPreferencesResponse>('/v1/me/booking-preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          allowBookSelf: enabled,
        }),
      });
      if (!result.success) {
        logger.error('Failed to save allow-book-self setting through API', {
          userId,
          enabled,
          error: result.error.message,
        });
        throw new Error(result.error.message);
      }
      emitTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, {
        userId: result.data.preferences.userId,
        enabled: result.data.preferences.allowBookSelf,
      });
      return result.data.preferences.allowBookSelf === enabled;
    }
    try {
      const key = getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, userId);
      await apiClient.set(key, enabled);
      emitTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, { userId, enabled });
      return true;
    } catch (error) {
      logger.error('Failed to save allow-book-self setting', { userId, enabled, error });
      return false;
    }
  }
}

export const bookingSelfSettingService = new BookingSelfSettingService();
