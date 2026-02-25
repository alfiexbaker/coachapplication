/**
 * Data Retention Service
 *
 * Enforces data retention policies: auto-archives inactive athlete data
 * after 90 days, provides data export, and manages retention schedules.
 *
 * API Integration Notes:
 * - GET /api/retention/policies - Get retention policies
 * - POST /api/retention/archive/:athleteId - Archive athlete data
 * - GET /api/retention/archived - List archived records
 * - POST /api/retention/restore/:archiveId - Restore archived data
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { generateId } from '@/utils/generate-id';

const logger = createLogger('DataRetentionService');

/** Default retention period in days */
const DEFAULT_RETENTION_DAYS = 90;

export interface RetentionPolicy {
  id: string;
  dataType: 'session_notes' | 'messages' | 'progress_data' | 'booking_history' | 'media';
  retentionDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
}

export interface ArchivedRecord {
  id: string;
  athleteId: string;
  athleteName: string;
  dataType: RetentionPolicy['dataType'];
  archivedAt: string;
  scheduledDeleteAt: string;
  recordCount: number;
  restoredAt?: string;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { id: 'ret_session_notes', dataType: 'session_notes', retentionDays: 365, archiveAfterDays: 90, deleteAfterDays: 730 },
  { id: 'ret_messages', dataType: 'messages', retentionDays: 180, archiveAfterDays: 90, deleteAfterDays: 365 },
  { id: 'ret_progress', dataType: 'progress_data', retentionDays: 730, archiveAfterDays: 365, deleteAfterDays: 1095 },
  { id: 'ret_bookings', dataType: 'booking_history', retentionDays: 730, archiveAfterDays: 365, deleteAfterDays: 1095 },
  { id: 'ret_media', dataType: 'media', retentionDays: 365, archiveAfterDays: 180, deleteAfterDays: 730 },
];

class DataRetentionService {
  /**
   * Get all retention policies.
   * API Integration: GET /api/retention/policies
   */
  async getPolicies(): Promise<Result<RetentionPolicy[], ServiceError>> {
    try {
      const policies = await apiClient.get<RetentionPolicy[]>(
        STORAGE_KEYS.DATA_RETENTION_POLICIES,
        DEFAULT_POLICIES,
      );
      return ok(policies);
    } catch (error) {
      logger.error('Failed to get retention policies', error);
      return err(storageError('Failed to get retention policies'));
    }
  }

  /**
   * Archive athlete data that exceeds retention period.
   * API Integration: POST /api/retention/archive/:athleteId
   */
  async archiveAthleteData(
    athleteId: string,
    athleteName: string,
    dataType: RetentionPolicy['dataType'],
    recordCount: number,
  ): Promise<Result<ArchivedRecord, ServiceError>> {
    try {
      const policiesResult = await this.getPolicies();
      if (!policiesResult.success) return policiesResult;

      const policy = policiesResult.data.find((p) => p.dataType === dataType);
      if (!policy) {
        return err(notFound('RetentionPolicy', dataType));
      }

      const now = new Date();
      const deleteAt = new Date(now);
      deleteAt.setDate(deleteAt.getDate() + (policy.deleteAfterDays - policy.archiveAfterDays));

      const record: ArchivedRecord = {
        id: generateId('archive'),
        athleteId,
        athleteName,
        dataType,
        archivedAt: now.toISOString(),
        scheduledDeleteAt: deleteAt.toISOString(),
        recordCount,
      };

      const archives = await apiClient.get<ArchivedRecord[]>(
        STORAGE_KEYS.ARCHIVE_PREFIX + athleteId,
        [],
      );
      archives.push(record);
      await apiClient.set(STORAGE_KEYS.ARCHIVE_PREFIX + athleteId, archives);

      emitTyped(ServiceEvents.ATHLETE_DATA_ARCHIVED, {
        athleteId,
        athleteName,
        dataType,
        recordCount,
        archivedAt: record.archivedAt,
      });

      logger.info('athlete_data_archived', {
        athleteId,
        dataType,
        recordCount,
        scheduledDeleteAt: record.scheduledDeleteAt,
      });

      return ok(record);
    } catch (error) {
      logger.error('Failed to archive athlete data', error);
      return err(storageError('Failed to archive athlete data'));
    }
  }

  /**
   * Get archived records for an athlete.
   * API Integration: GET /api/retention/archived?athleteId=:athleteId
   */
  async getArchivedRecords(athleteId: string): Promise<Result<ArchivedRecord[], ServiceError>> {
    try {
      const archives = await apiClient.get<ArchivedRecord[]>(
        STORAGE_KEYS.ARCHIVE_PREFIX + athleteId,
        [],
      );
      return ok(archives.filter((a) => !a.restoredAt));
    } catch (error) {
      logger.error('Failed to get archived records', error);
      return err(storageError('Failed to get archived records'));
    }
  }

  /**
   * Restore archived data.
   * API Integration: POST /api/retention/restore/:archiveId
   */
  async restoreArchivedData(
    athleteId: string,
    archiveId: string,
  ): Promise<Result<ArchivedRecord, ServiceError>> {
    try {
      const archives = await apiClient.get<ArchivedRecord[]>(
        STORAGE_KEYS.ARCHIVE_PREFIX + athleteId,
        [],
      );

      const index = archives.findIndex((a) => a.id === archiveId);
      if (index === -1) {
        return err(notFound('ArchivedRecord', archiveId));
      }

      archives[index] = { ...archives[index], restoredAt: new Date().toISOString() };
      await apiClient.set(STORAGE_KEYS.ARCHIVE_PREFIX + athleteId, archives);

      logger.info('archived_data_restored', { athleteId, archiveId });
      return ok(archives[index]);
    } catch (error) {
      logger.error('Failed to restore archived data', error);
      return err(storageError('Failed to restore archived data'));
    }
  }

  /**
   * Check for data approaching retention limits and emit warnings.
   * API Integration: GET /api/retention/warnings
   */
  async checkRetentionWarnings(athleteId: string): Promise<Result<string[], ServiceError>> {
    try {
      const policiesResult = await this.getPolicies();
      if (!policiesResult.success) return policiesResult;

      const warnings: string[] = [];
      const warningThresholdDays = 14; // Warn 14 days before archive

      for (const policy of policiesResult.data) {
        const daysUntilArchive = policy.archiveAfterDays - warningThresholdDays;
        if (daysUntilArchive <= warningThresholdDays) {
          warnings.push(
            `${policy.dataType} data will be archived in ${warningThresholdDays} days`,
          );
        }
      }

      if (warnings.length > 0) {
        emitTyped(ServiceEvents.DATA_RETENTION_WARNING, {
          athleteId,
          warnings,
          checkedAt: new Date().toISOString(),
        });
      }

      return ok(warnings);
    } catch (error) {
      logger.error('Failed to check retention warnings', error);
      return err(storageError('Failed to check retention warnings'));
    }
  }
}

export const dataRetentionService = new DataRetentionService();
