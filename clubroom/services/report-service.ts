/**
 * Report Service — Handles user reporting functionality.
 *
 * Allows users to report profiles, messages, and reviews for
 * inappropriate content, safety concerns, fake profiles, or spam.
 *
 * Usage:
 *   import { reportService } from './report-service';
 *   await reportService.submitReport({ ... });
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { blockService } from './block-service';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('ReportService');

/** Report categories that trigger automatic safeguarding actions */
export const SERIOUS_REPORT_CATEGORIES = [
  'safety_concern',
  'inappropriate',
] as const;

export interface Report {
  id: string;
  reportedUserId: string;
  reportedByUserId: string;
  type: 'inappropriate' | 'safety_concern' | 'fake_profile' | 'spam' | 'other';
  description?: string;
  context: 'profile' | 'message' | 'review';
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export const reportService = {
  /**
   * Submit a new report against a user.
   * Serious categories auto-block the reported user and emit safeguarding events.
   */
  async submitReport(
    report: Omit<Report, 'id' | 'createdAt' | 'status'>,
  ): Promise<Result<Report, ServiceError>> {
    try {
      const newReport: Report = {
        ...report,
        id: apiClient.generateId('report'),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      const existing = await apiClient.get<Report[]>(STORAGE_KEYS.REPORTS, []);
      existing.push(newReport);
      await apiClient.set(STORAGE_KEYS.REPORTS, existing);

      logger.info('Report submitted', {
        reportId: newReport.id,
        category: newReport.type,
        reportedUserId: newReport.reportedUserId,
      });

      // Auto-block for serious categories
      const isSerious = (SERIOUS_REPORT_CATEGORIES as readonly string[]).includes(report.type);
      if (isSerious) {
        const blockResult = await blockService.blockUser(
          report.reportedByUserId,
          report.reportedUserId,
        );
        if (blockResult.success) {
          logger.warn('User auto-blocked due to serious report', {
            reportId: newReport.id,
            category: newReport.type,
            reportedUserId: newReport.reportedUserId,
          });
        }
      }

      // Emit safeguarding event for admin notification
      emitTyped(ServiceEvents.SAFEGUARDING_REPORT_SUBMITTED, {
        reportId: newReport.id,
        reporterId: report.reportedByUserId,
        reportedUserId: report.reportedUserId,
        category: report.type,
        severity: isSerious ? 'high' : 'medium',
        autoBlocked: isSerious,
        timestamp: newReport.createdAt,
      });

      return ok(newReport);
    } catch (error) {
      logger.error('Failed to submit report', { report, error });
      return err(storageError('Failed to submit report'));
    }
  },

  /**
   * Get all reports submitted by the current user or against a user.
   */
  async getReports(): Promise<Result<Report[], ServiceError>> {
    try {
      const reports = await apiClient.get<Report[]>(STORAGE_KEYS.REPORTS, []);
      return ok(reports);
    } catch (error) {
      logger.error('Failed to get reports', error);
      return err(storageError('Failed to load reports'));
    }
  },
};
