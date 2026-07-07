import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('progressReportService API mode', () => {
  it('does not read local coach-session mirrors', async () => {
    const [
      { progressReportService },
      { apiClient },
      { progressSkillsService },
      { progressFeedbackService },
      { progressGoalsService },
      { badgeService },
      { bookingService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/api-client'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
    ]);

    const originalGet = apiClient.get;
    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalBookings = bookingService.list;

    apiClient.get = async (key, fallback) => {
      if (key === STORAGE_KEYS.COACH_SESSIONS) {
        throw new Error('COACH_SESSIONS should not be read in API mode');
      }
      return fallback;
    };
    progressSkillsService.getAthleteSkillLevels = async () => null;
    progressFeedbackService.getFeedbackForAthlete = async () => [];
    progressGoalsService.getGoalsForAthlete = async () => ({
      active: [],
      completed: [],
      paused: [],
    });
    badgeService.getProgressToNextLevel = async () => ({
      currentLevel: { level: 1, name: 'Foundation', pointsRequired: 0 },
      totalPoints: 0,
      progressPercent: 0,
      pointsToNext: 100,
      nextLevel: { level: 2, name: 'Developing', pointsRequired: 100 },
    });
    badgeService.listAwardsForAthlete = async () => [];
    bookingService.list = async () => [];

    try {
      const progress = await progressReportService.getAthleteProgress('athlete_api_report');
      assert.equal(progress.athleteId, 'athlete_api_report');
      assert.equal(progress.totalSessions, 0);
    } finally {
      apiClient.get = originalGet;
      progressSkillsService.getAthleteSkillLevels = originalSkills;
      progressFeedbackService.getFeedbackForAthlete = originalFeedback;
      progressGoalsService.getGoalsForAthlete = originalGoals;
      badgeService.getProgressToNextLevel = originalBadgeProgress;
      badgeService.listAwardsForAthlete = originalAwards;
      bookingService.list = originalBookings;
    }
  });
});
