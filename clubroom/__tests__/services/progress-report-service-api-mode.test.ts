import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

async function settleApiModePromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

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
      { authService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/api-client'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalFetch = globalThis.fetch;
    const originalAuth = authService.getCurrentUser;
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
    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_progress',
        email: 'parent.progress@example.test',
        accountType: 'PARENT',
        appRole: 'USER',
        roles: ['parent'],
        firstName: 'Parent',
        lastName: 'Progress',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    const fetchCalls: Array<{ path: string; guardianAthletes: string | null }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      fetchCalls.push({
        path: url.pathname,
        guardianAthletes: headers.get('x-guardian-athlete-ids'),
      });
      if (url.pathname === '/v1/athletes/ath_api_report/progress') {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api_report',
            sessionNotes: [
              {
                id: 'note_api_1',
                bookingId: 'booking_api_note_1',
                athleteId: 'ath_api_report',
                createdAt: '2026-07-01T10:00:00.000Z',
                noteText: 'Good movement.',
              },
            ],
            sessionFeedback: [
              {
                id: 'feedback_api_1',
                bookingId: 'booking_api_feedback_1',
                athleteId: 'ath_api_report',
                authorUserId: 'usr_coach_progress',
                rating: 4,
                publicComment: 'Sharp first touch.',
                visibility: 'parent',
                metadataJson: {
                  coachName: 'Coach API',
                  athleteName: 'Athlete API',
                  skillsWorkedOn: ['Passing'],
                  skillRatings: [{ skill: 'Passing', rating: 4 }],
                  improvements: 'Scan earlier',
                  homework: 'Wall passes',
                  effortRating: 5,
                  overallPerformance: 4,
                },
                createdAt: '2026-07-02T10:00:00.000Z',
              },
            ],
            skillAssessments: [
              {
                id: 'assess_api_1',
                athleteId: 'ath_api_report',
                skillDefinitionId: 'skill_passing',
                assessorUserId: 'usr_coach_progress',
                score: 4,
                assessedAt: '2026-06-01T10:00:00.000Z',
              },
              {
                id: 'assess_api_2',
                athleteId: 'ath_api_report',
                skillDefinitionId: 'skill_passing',
                assessorUserId: 'usr_coach_progress',
                score: 7,
                assessedAt: '2026-07-02T10:00:00.000Z',
              },
            ],
            skillDefinitions: [
              {
                id: 'skill_passing',
                code: 'passing',
                name: 'Passing',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    progressSkillsService.getAthleteSkillLevels = async () => {
      throw new Error('skills history should not be read in API mode');
    };
    progressFeedbackService.getFeedbackForAthlete = async () => {
      throw new Error('session feedback list should not be read in API mode');
    };
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
      const progress = await progressReportService.getAthleteProgress('ath_api_report');
      assert.equal(progress.athleteId, 'ath_api_report');
      assert.equal(progress.totalSessions, 2);
      assert.equal(progress.recentFeedback.length, 1);
      assert.equal(progress.recentFeedback[0]?.publicSummary, 'Sharp first touch.');
      assert.equal(progress.skills[0]?.skill, 'Passing');
      assert.equal(progress.skills[0]?.level, 7);
      assert.deepEqual(fetchCalls, [
        { path: '/v1/athletes/ath_api_report/progress', guardianAthletes: 'ath_api_report' },
      ]);
    } finally {
      await settleApiModePromises();
      apiClient.get = originalGet;
      globalThis.fetch = originalFetch;
      authService.getCurrentUser = originalAuth;
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
      { authService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
      import('@/services/auth-service'),
    ]);

    const originalFetch = globalThis.fetch;
    const originalAuth = authService.getCurrentUser;
    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalBookings = bookingAuthorityService.listBookings;

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_progress',
        email: 'parent.progress@example.test',
        accountType: 'PARENT',
        appRole: 'USER',
        roles: ['parent'],
        firstName: 'Parent',
        lastName: 'Progress',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/athletes/ath_api_report/progress') {
        return new Response(JSON.stringify({ message: 'progress api down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    progressSkillsService.getAthleteSkillLevels = async () => {
      throw new Error('skills history should not be read in API mode');
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
        () => progressReportService.getAthleteProgress('ath_api_report'),
        /progress api down/i,
      );
    } finally {
      await settleApiModePromises();
      globalThis.fetch = originalFetch;
      authService.getCurrentUser = originalAuth;
      progressSkillsService.getAthleteSkillLevels = originalSkills;
      progressFeedbackService.getFeedbackForAthlete = originalFeedback;
      progressGoalsService.getGoalsForAthlete = originalGoals;
      badgeService.getProgressToNextLevel = originalBadgeProgress;
      badgeService.listAwardsForAthlete = originalAwards;
      bookingAuthorityService.listBookings = originalBookings;
    }
  });

  it('fails closed when API-mode badge award reads fail', async () => {
    const [
      { progressReportService },
      { progressSkillsService },
      { progressFeedbackService },
      { progressGoalsService },
      { badgeService },
      { bookingAuthorityService },
      { authService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
      import('@/services/auth-service'),
    ]);

    const originalFetch = globalThis.fetch;
    const originalAuth = authService.getCurrentUser;
    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalAuthorityBookings = bookingAuthorityService.listBookings;

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_progress',
        email: 'parent.progress@example.test',
        accountType: 'PARENT',
        appRole: 'USER',
        roles: ['parent'],
        firstName: 'Parent',
        lastName: 'Progress',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/athletes/ath_api_report/progress') {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api_report',
            sessionNotes: [],
            sessionFeedback: [],
            skillAssessments: [],
            skillDefinitions: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    progressSkillsService.getAthleteSkillLevels = async () => {
      throw new Error('skills history should not be read in API mode');
    };
    progressFeedbackService.getFeedbackForAthlete = async () => {
      throw new Error('session feedback list should not be read in API mode');
    };
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
        success: true,
        data: [],
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;

    try {
      await assert.rejects(
        () => progressReportService.getAthleteProgress('ath_api_report'),
        /badges api down/i,
      );
    } finally {
      await settleApiModePromises();
      globalThis.fetch = originalFetch;
      authService.getCurrentUser = originalAuth;
      progressSkillsService.getAthleteSkillLevels = originalSkills;
      progressFeedbackService.getFeedbackForAthlete = originalFeedback;
      progressGoalsService.getGoalsForAthlete = originalGoals;
      badgeService.getProgressToNextLevel = originalBadgeProgress;
      badgeService.listAwardsForAthlete = originalAwards;
      bookingAuthorityService.listBookings = originalAuthorityBookings;
    }
  });

  it('fails closed when API-mode booking reads fail', async () => {
    const [
      { progressReportService },
      { progressSkillsService },
      { progressFeedbackService },
      { progressGoalsService },
      { badgeService },
      { bookingAuthorityService, bookingService },
      { authService },
    ] = await Promise.all([
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-goals-service'),
      import('@/services/badge-service'),
      import('@/services/booking'),
      import('@/services/auth-service'),
    ]);

    const originalFetch = globalThis.fetch;
    const originalAuth = authService.getCurrentUser;
    const originalSkills = progressSkillsService.getAthleteSkillLevels;
    const originalFeedback = progressFeedbackService.getFeedbackForAthlete;
    const originalGoals = progressGoalsService.getGoalsForAthlete;
    const originalBadgeProgress = badgeService.getProgressToNextLevel;
    const originalAwards = badgeService.listAwardsForAthlete;
    const originalAuthorityBookings = bookingAuthorityService.listBookings;
    const originalBookings = bookingService.list;

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_progress',
        email: 'parent.progress@example.test',
        accountType: 'PARENT',
        appRole: 'USER',
        roles: ['parent'],
        firstName: 'Parent',
        lastName: 'Progress',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/athletes/ath_api_report/progress') {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api_report',
            sessionNotes: [],
            sessionFeedback: [],
            skillAssessments: [],
            skillDefinitions: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    progressSkillsService.getAthleteSkillLevels = async () => {
      throw new Error('skills history should not be read in API mode');
    };
    progressFeedbackService.getFeedbackForAthlete = async () => {
      throw new Error('session feedback list should not be read in API mode');
    };
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
        success: false,
        error: { code: 'NETWORK', message: 'bookings api down' },
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
    bookingService.list = async () => {
      throw new Error('booking runtime mirror should not be read in API mode');
    };

    try {
      await assert.rejects(
        () => progressReportService.getAthleteProgress('ath_api_report'),
        /bookings api down/i,
      );
    } finally {
      await settleApiModePromises();
      globalThis.fetch = originalFetch;
      authService.getCurrentUser = originalAuth;
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
