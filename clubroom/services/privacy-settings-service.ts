import { apiClient, apiFetch } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('PrivacySettingsService');

export interface PrivacySettings {
  userId: string;
  profileVisible: boolean;
  showLocation: boolean;
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  shareAnalytics: boolean;
  personalizedAds: boolean;
  shareWithPartners: boolean;
  showEarnings: boolean;
  showClientList: boolean;
  createdAt: string;
  updatedAt: string;
}

function changedFieldNames(input: Partial<PrivacySettings>): string[] {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .sort();
}

class PrivacySettingsService {
  private readonly settingKeys: Array<
    keyof Omit<PrivacySettings, 'userId' | 'createdAt' | 'updatedAt'>
  > = [
    'profileVisible',
    'showLocation',
    'showOnlineStatus',
    'showActivityStatus',
    'shareAnalytics',
    'personalizedAds',
    'shareWithPartners',
    'showEarnings',
    'showClientList',
  ];

  private createDefaults(userId: string): PrivacySettings {
    const now = new Date().toISOString();
    return {
      userId,
      profileVisible: true,
      showLocation: true,
      showOnlineStatus: true,
      showActivityStatus: false,
      shareAnalytics: true,
      personalizedAds: false,
      shareWithPartners: false,
      showEarnings: false,
      showClientList: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async loadAll(): Promise<PrivacySettings[]> {
    return apiClient.get<PrivacySettings[]>(STORAGE_KEYS.PRIVACY_SETTINGS, []);
  }

  private async saveOne(userId: string, settings: PrivacySettings): Promise<void> {
    const all = await this.loadAll();
    const index = all.findIndex((entry) => entry.userId === userId);
    if (index >= 0) {
      all[index] = settings;
    } else {
      all.push(settings);
    }
    await apiClient.set(STORAGE_KEYS.PRIVACY_SETTINGS, all);
  }

  private async getValue(userId: string): Promise<PrivacySettings> {
    const all = await this.loadAll();
    const existing = all.find((entry) => entry.userId === userId);
    if (existing) {
      return existing;
    }

    const defaults = this.createDefaults(userId);
    await this.saveOne(userId, defaults);
    return defaults;
  }

  async getSettings(userId: string): Promise<Result<PrivacySettings, ServiceError>> {
    try {
      if (!api.useMock) {
        const result = await apiFetch<{ settings: PrivacySettings }>('/v1/me/privacy-settings', {
          method: 'GET',
        });
        return result.success ? ok(result.data.settings) : err(result.error);
      }

      return ok(await this.getValue(userId));
    } catch (error) {
      logger.error('Failed to load privacy settings', { userId, error });
      return err(storageError('Failed to load privacy settings'));
    }
  }

  async updateSettings(
    userId: string,
    updates: Partial<PrivacySettings>,
  ): Promise<Result<PrivacySettings, ServiceError>> {
    try {
      if (!api.useMock) {
        const payload: Partial<
          Pick<
            PrivacySettings,
            | 'profileVisible'
            | 'showLocation'
            | 'showOnlineStatus'
            | 'showActivityStatus'
            | 'shareAnalytics'
            | 'personalizedAds'
            | 'shareWithPartners'
            | 'showEarnings'
            | 'showClientList'
          >
        > = {};
        for (const key of this.settingKeys) {
          if (updates[key] !== undefined) {
            payload[key] = updates[key];
          }
        }

        const result = await apiFetch<{ settings: PrivacySettings }>('/v1/me/privacy-settings', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return result.success ? ok(result.data.settings) : err(result.error);
      }

      const current = await this.getValue(userId);
      const updated: PrivacySettings = {
        ...current,
        ...updates,
        userId,
        updatedAt: new Date().toISOString(),
      };
      await this.saveOne(userId, updated);
      return ok(updated);
    } catch (error) {
      const changedFields = changedFieldNames(updates);
      logger.error('Failed to update privacy settings', {
        userId,
        changedFields,
        changedFieldCount: changedFields.length,
        error,
      });
      return err(storageError('Failed to update privacy settings'));
    }
  }
}

export const privacySettingsService = new PrivacySettingsService();
