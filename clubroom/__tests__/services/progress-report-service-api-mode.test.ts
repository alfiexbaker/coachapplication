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
      { bookingAuthorityService, bookingService },
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
    const originalAuthorityBookings = bookingAuthorityService.listBookings;
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
    bookingAuthorityService.listBookings = async () =>
      ({
        success: true,
        data: [],
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
    bookingService.list = async () => {
      throw new Error('booking runtime mirror should not be read in API mode');
    };

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
      bookingAuthorityService.listBookings = originalAuthorityBookings;
      bookingService.list = originalBookings;
    }
  });

  it('fails closed when a live progress subresource fails', async () => {
    const [
      { progressReportService },
      { progressSkillsService },
      { progressFeedbackService },
      { progressGoalsService },
      { badgeService },
      { bookingAuthorityService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
    ]);

    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalBookings = bookingAuthorityService.listBookings;

    progressSkillsService.getAthleteSkillLevels = async () => {
      throw new Error('skills api down');
    };
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
    bookingAuthorityService.listBookings = async () =>
      ({
        success: true,
        data: [],
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;

    try {
      await assert.rejects(
        () => progressReportService.getAthleteProgress('athlete_api_report'),
        /skills api down/i,
      );
    } finally {
      progressSkillsService.getAthleteSkillLevels = originalSkills;
      progressFeedbackService.getFeedbackForAthlete = originalFeedback;
      progressGoalsService.getGoalsForAthlete = originalGoals;
      badgeService.getProgressToNextLevel = originalBadgeProgress;
      badgeService.listAwardsForAthlete = originalAwards;
      bookingAuthorityService.listBookings = originalBookings;
    }
  });

  it('keeps optional API-mode badges and bookings out of the critical progress path', async () => {
    const [
      { progressReportService },
      { progressSkillsService },
      { progressFeedbackService },
      { progressGoalsService },
      { badgeService },
      { bookingAuthorityService, bookingService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
    ]);

    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalAuthorityBookings = bookingAuthorityService.listBookings;
    const originalBookings = bookingService.list;

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
    badgeService.listAwardsForAthlete = async () => {
      throw new Error('badges api down');
    };
    bookingAuthorityService.listBookings = async () =>
      ({
        success: false,
        error: { code: 'NETWORK', message: 'bookings api down' },
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
    bookingService.list = async () => {
      throw new Error('booking runtime mirror should not be read in API mode');
    };

    try {
      const progress = await progressReportService.getAthleteProgress('athlete_api_report');

      assert.equal(progress.athleteId, 'athlete_api_report');
      assert.equal(progress.totalSessions, 0);
      assert.equal(progress.totalBadges, 0);
      assert.deepEqual(progress.recentBadges, []);
    } finally {
      progressSkillsService.getAthleteSkillLevels = originalSkills;
      progressFeedbackService.getFeedbackForAthlete = originalFeedback;
      progressGoalsService.getGoalsForAthlete = originalGoals;
      badgeService.getProgressToNextLevel = originalBadgeProgress;
      badgeService.listAwardsForAthlete = originalAwards;
      bookingAuthorityService.listBookings = originalAuthorityBookings;
      bookingService.list = originalBookings;
    }
  });
});
