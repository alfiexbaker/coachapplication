import { apiClient, apiFetch } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import {
  err,
  ok,
  serviceError,
  storageError,
  type Result,
  type ServiceError,
} from '@/types/result';

const logger = createLogger('CoachTravelService');

export interface CoachTravelSettings {
  coachId: string;
  radiusMiles: number;
  acceptsTravelSessions: boolean;
  acceptsRemoteSessions: boolean;
  createdAt: string;
  updatedAt: string;
}

type CoachTravelSettingsPatch = Pick<
  Partial<CoachTravelSettings>,
  'radiusMiles' | 'acceptsTravelSessions' | 'acceptsRemoteSessions'
>;

interface CoachTravelSettingsResponse {
  settings: CoachTravelSettings;
}

class CoachTravelService {
  private createDefaults(coachId: string): CoachTravelSettings {
    const now = new Date().toISOString();
    return {
      coachId,
      radiusMiles: 10,
      acceptsTravelSessions: true,
      acceptsRemoteSessions: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async loadAll(): Promise<CoachTravelSettings[]> {
    return apiClient.get<CoachTravelSettings[]>(STORAGE_KEYS.COACH_TRAVEL_SETTINGS, []);
  }

  private async saveOne(coachId: string, settings: CoachTravelSettings): Promise<void> {
    const all = await this.loadAll();
    const index = all.findIndex((entry) => entry.coachId === coachId);
    if (index >= 0) {
      all[index] = settings;
    } else {
      all.push(settings);
    }
    await apiClient.set(STORAGE_KEYS.COACH_TRAVEL_SETTINGS, all);
  }

  private async getValue(coachId: string): Promise<CoachTravelSettings> {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<CoachTravelSettingsResponse>(
        '/v1/coaches/me/travel-settings',
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data.settings;
    }

    const all = await this.loadAll();
    const existing = all.find((entry) => entry.coachId === coachId);
    if (existing) {
      return existing;
    }

    const defaults = this.createDefaults(coachId);
    await this.saveOne(coachId, defaults);
    return defaults;
  }

  async getSettings(coachId: string): Promise<Result<CoachTravelSettings, ServiceError>> {
    try {
      return ok(await this.getValue(coachId));
    } catch (error) {
      logger.error('Failed to load coach travel settings', { coachId, error });
      return err(storageError('Failed to load coach travel settings'));
    }
  }

  async updateSettings(
    coachId: string,
    updates: Partial<CoachTravelSettings>,
  ): Promise<Result<CoachTravelSettings, ServiceError>> {
    if (!apiClient.isMockMode) {
      const body: CoachTravelSettingsPatch = {};
      if (updates.radiusMiles !== undefined) {
        body.radiusMiles = updates.radiusMiles;
      }
      if (updates.acceptsTravelSessions !== undefined) {
        body.acceptsTravelSessions = updates.acceptsTravelSessions;
      }
      if (updates.acceptsRemoteSessions !== undefined) {
        body.acceptsRemoteSessions = updates.acceptsRemoteSessions;
      }
      if (Object.keys(body).length === 0) {
        return err(serviceError('VALIDATION', 'Add at least one travel setting before saving.'));
      }
      const result = await apiFetch<CoachTravelSettingsResponse>(
        '/v1/coaches/me/travel-settings',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      if (!result.success) {
        logger.warn('Failed to update coach travel settings via API', {
          coachId,
          updates: body,
          error: result.error,
        });
        return err(result.error);
      }
      return ok(result.data.settings);
    }

    try {
      const current = await this.getValue(coachId);
      const updated: CoachTravelSettings = {
        ...current,
        ...updates,
        coachId,
        updatedAt: new Date().toISOString(),
      };
      await this.saveOne(coachId, updated);
      return ok(updated);
    } catch (error) {
      logger.error('Failed to update coach travel settings', { coachId, updates, error });
      return err(storageError('Failed to update coach travel settings'));
    }
  }

  canSaveTravelSettings(): boolean {
    return true;
  }
}

export const coachTravelService = new CoachTravelService();
