import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressReportService } from '@/services/progress/progress-report-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressReportService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.PROGRESS_REPORTS);
  });

  describe('createReport', () => {
    it('should create a progress report', async () => {
      const report = {
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Young Athlete',
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: 'Great progress this month',
        skillProgress: [],
        attendance: { sessionsAttended: 8, sessionsScheduled: 10 },
        achievements: [],
      };

      const result = await progressReportService.createReport(report);

      assert.ok(result.id);
      assert.equal(result.athleteId, report.athleteId);
      assert.equal(result.summary, 'Great progress this month');
      assert.ok(result.createdAt);
    });

    it('should handle skill progress data', async () => {
      const report = {
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: 'Progress',
        skillProgress: [
          { skill: 'Passing', startLevel: 2, endLevel: 4, improvement: '+2' },
          { skill: 'Dribbling', startLevel: 3, endLevel: 4, improvement: '+1' },
        ],
        attendance: { sessionsAttended: 8, sessionsScheduled: 10 },
        achievements: [],
      };

      const result = await progressReportService.createReport(report);

      assert.equal(result.skillProgress.length, 2);
    });
  });

  describe('getAthleteReports', () => {
    it('should return empty array for athlete with no reports', async () => {
      const reports = await progressReportService.getAthleteReports('nonexistent-athlete');

      assert.equal(reports.length, 0);
    });

    it('should return all reports for athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressReportService.createReport({
        athleteId,
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        summary: 'Month 1',
        skillProgress: [],
        attendance: { sessionsAttended: 6, sessionsScheduled: 8 },
        achievements: [],
      });

      await progressReportService.createReport({
        athleteId,
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: 'Month 2',
        skillProgress: [],
        attendance: { sessionsAttended: 8, sessionsScheduled: 10 },
        achievements: [],
      });

      const reports = await progressReportService.getAthleteReports(athleteId);

      assert.equal(reports.length, 2);
    });
  });

  describe('getReportById', () => {
    it('should return null for non-existent report', async () => {
      const report = await progressReportService.getReportById('nonexistent-id');

      assert.equal(report, null);
    });

    it('should return report by ID', async () => {
      const created = await progressReportService.createReport({
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: 'Progress',
        skillProgress: [],
        attendance: { sessionsAttended: 8, sessionsScheduled: 10 },
        achievements: [],
      });

      const report = await progressReportService.getReportById(created.id);

      assert.ok(report);
      assert.equal(report.id, created.id);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      const report = await progressReportService.createReport({
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        coachId: 'coach1',
        coachName: 'Coach',
        reportPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        summary: 'Progress',
        skillProgress: [],
        attendance: { sessionsAttended: 8, sessionsScheduled: 10 },
        achievements: [],
      });

      const result = await progressReportService.deleteReport(report.id);

      assert.equal(result, true);

      const deleted = await progressReportService.getReportById(report.id);
      assert.equal(deleted, null);
    });

    it('should return false for non-existent report', async () => {
      const result = await progressReportService.deleteReport('nonexistent-id');

      assert.equal(result, false);
    });
  });
});
