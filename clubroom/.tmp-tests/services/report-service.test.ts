import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { reportService } from '@/services/report-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ReportService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.REPORTS);
  });

  describe('submitReport', () => {
    it('should create a report successfully', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'inappropriate' as const,
        description: 'Test inappropriate content',
        context: 'profile' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.ok(result.id);
      assert.equal(result.reportedUserId, reportData.reportedUserId);
      assert.equal(result.reportedByUserId, reportData.reportedByUserId);
      assert.equal(result.type, 'inappropriate');
      assert.equal(result.context, 'profile');
      assert.equal(result.status, 'pending');
      assert.ok(result.createdAt);
    });

    it('should handle safety_concern type', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'safety_concern' as const,
        description: 'Safety issue',
        context: 'message' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.equal(result.type, 'safety_concern');
      assert.equal(result.context, 'message');
    });

    it('should handle fake_profile type', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'fake_profile' as const,
        context: 'profile' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.equal(result.type, 'fake_profile');
    });

    it('should handle spam type', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'spam' as const,
        context: 'review' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.equal(result.type, 'spam');
      assert.equal(result.context, 'review');
    });

    it('should handle other type', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'other' as const,
        description: 'Other issue',
        context: 'message' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.equal(result.type, 'other');
      assert.ok(result.description);
    });

    it('should work without optional description', async () => {
      const reportData = {
        reportedUserId: 'test-user-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'spam' as const,
        context: 'profile' as const,
      };

      const result = await reportService.submitReport(reportData);

      assert.ok(result.id);
      assert.equal(result.status, 'pending');
    });
  });

  describe('getReports', () => {
    it('should return empty array when no reports exist', async () => {
      const reports = await reportService.getReports();

      assert.equal(reports.length, 0);
    });

    it('should return all submitted reports', async () => {
      const reportData1 = {
        reportedUserId: 'test-user-1-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'spam' as const,
        context: 'profile' as const,
      };

      const reportData2 = {
        reportedUserId: 'test-user-2-' + Math.random().toString(36).slice(2),
        reportedByUserId: 'test-reporter-' + Math.random().toString(36).slice(2),
        type: 'inappropriate' as const,
        context: 'message' as const,
      };

      await reportService.submitReport(reportData1);
      await reportService.submitReport(reportData2);

      const reports = await reportService.getReports();

      assert.equal(reports.length, 2);
    });
  });
});
