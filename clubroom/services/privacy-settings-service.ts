import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
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

class PrivacySettingsService {
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
      logger.error('Failed to update privacy settings', { userId, updates, error });
      return err(storageError('Failed to update privacy settings'));
    }
  }
}

export const privacySettingsService = new PrivacySettingsService();
