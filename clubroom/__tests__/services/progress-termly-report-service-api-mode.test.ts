import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TermlyProgressReport } from '@/services/progress/progress-termly-report-service';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function makeReport(): TermlyProgressReport {
  return {
    id: 'termly_report_api_guard',
    athleteId: 'ath_api_termly',
    athleteName: 'API Athlete',
    generatedAt: '2026-07-05T10:00:00.000Z',
    range: {
      startDate: '2026-04-13T00:00:00.000Z',
      endDate: '2026-07-05T10:00:00.000Z',
      label: '13 Apr 2026 - 5 Jul 2026',
    },
    summary: {
      sessionsAttended: 0,
      attendanceRate: 0,
      averageEffort: 0,
      averagePerformance: 0,
      skillsImproved: 0,
      goalsCompleted: 0,
      badgesEarned: 0,
      practiceMinutes: 0,
      selfAssessmentsSubmitted: 0,
    },
    focusAreas: [],
    highlights: [],
    attendanceByWeek: [],
    coachHighlights: [],
    skillSnapshot: [],
    goalSnapshot: [],
    generatedFrom: 'termly_v1',
  };
}

describe('progressTermlyReportService API mode', () => {
  it('does not generate a zeroed report when self-assessment history fails', async () => {
    const [
      { progressTermlyReportService },
      { bookingAuthorityService },
      { bookingService },
      { progressFeedbackService },
      { badgeService },
      { progressPracticeLogService },
      { progressSelfAssessmentService },
      { progressSkillsService },
      { progressGoalsService },
    ] = await Promise.all([
      import('@/services/progress/progress-termly-report-service'),
      import('@/services/booking/booking-authority-service'),
      import('@/services/booking'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/badge-service'),
      import('@/services/progress/progress-practice-log-service'),
      import('@/services/progress/progress-self-assessment-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-goals-service'),
    ]);

    const original = {
      listAuthoritativeBookings: bookingAuthorityService.listBookings,
      listBookings: bookingService.list,
      getFeedback: progressFeedbackService.getFeedbackForAthlete,
      listAwards: badgeService.listAwardsForAthlete,
      listPracticeLogs: progressPracticeLogService.listAthleteLogs,
      listSelfAssessments: progressSelfAssessmentService.listAssessmentsForAthlete,
      getSkillLevels: progressSkillsService.getAthleteSkillLevels,
      getGoals: progressGoalsService.getGoalsForAthlete,
    };

    bookingAuthorityService.listBookings = async () =>
      ({ success: true, data: [] }) as Awaited<
        ReturnType<typeof original.listAuthoritativeBookings>
      >;
    bookingService.list = async () => {
      throw new Error('legacy booking facade should not be used in API mode');
    };
    progressFeedbackService.getFeedbackForAthlete = async () => [];
    badgeService.listAwardsForAthlete = async () => [];
    progressPracticeLogService.listAthleteLogs = async () => [];
    progressSelfAssessmentService.listAssessmentsForAthlete = async () => {
      throw new Error('self assessments down');
    };
    progressSkillsService.getAthleteSkillLevels = async () => null;
    progressGoalsService.getGoalsForAthlete = async () => ({
      active: [],
      completed: [],
      paused: [],
    });

    try {
      const result = await progressTermlyReportService.generateTermlyReport({
        athleteId: 'ath_api_termly',
        athleteName: 'API Athlete',
        now: new Date('2026-07-05T10:00:00.000Z'),
      });

      assert.equal(result.success, false);
      assert.match(result.success ? '' : result.error.message, /failed to generate termly report/i);
    } finally {
      bookingAuthorityService.listBookings = original.listAuthoritativeBookings;
      bookingService.list = original.listBookings;
      progressFeedbackService.getFeedbackForAthlete = original.getFeedback;
      badgeService.listAwardsForAthlete = original.listAwards;
      progressPracticeLogService.listAthleteLogs = original.listPracticeLogs;
      progressSelfAssessmentService.listAssessmentsForAthlete = original.listSelfAssessments;
      progressSkillsService.getAthleteSkillLevels = original.getSkillLevels;
      progressGoalsService.getGoalsForAthlete = original.getGoals;
    }
  });

  it('fails closed when live booking authority cannot build attendance inputs', async () => {
    const [
      { progressTermlyReportService },
      { bookingAuthorityService },
      { bookingService },
      { progressFeedbackService },
      { badgeService },
      { progressPracticeLogService },
      { progressSelfAssessmentService },
      { progressSkillsService },
      { progressGoalsService },
    ] = await Promise.all([
      import('@/services/progress/progress-termly-report-service'),
      import('@/services/booking/booking-authority-service'),
      import('@/services/booking'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/badge-service'),
      import('@/services/progress/progress-practice-log-service'),
      import('@/services/progress/progress-self-assessment-service'),
      import('@/services/progress/progress-skills-service'),
      import('@/services/progress/progress-goals-service'),
    ]);

    const original = {
      listAuthoritativeBookings: bookingAuthorityService.listBookings,
      listBookings: bookingService.list,
      getFeedback: progressFeedbackService.getFeedbackForAthlete,
      listAwards: badgeService.listAwardsForAthlete,
      listPracticeLogs: progressPracticeLogService.listAthleteLogs,
      listSelfAssessments: progressSelfAssessmentService.listAssessmentsForAthlete,
      getSkillLevels: progressSkillsService.getAthleteSkillLevels,
      getGoals: progressGoalsService.getGoalsForAthlete,
    };

    bookingAuthorityService.listBookings = async () =>
      ({
        success: false,
        error: { code: 'NETWORK', message: 'booking authority down' },
      }) as Awaited<ReturnType<typeof original.listAuthoritativeBookings>>;
    bookingService.list = async () => {
      throw new Error('legacy booking facade should not be used in API mode');
    };
    progressFeedbackService.getFeedbackForAthlete = async () => [];
    badgeService.listAwardsForAthlete = async () => [];
    progressPracticeLogService.listAthleteLogs = async () => [];
    progressSelfAssessmentService.listAssessmentsForAthlete = async () => [];
    progressSkillsService.getAthleteSkillLevels = async () => null;
    progressGoalsService.getGoalsForAthlete = async () => ({
      active: [],
      completed: [],
      paused: [],
    });

    try {
      const result = await progressTermlyReportService.generateTermlyReport({
        athleteId: 'ath_api_termly',
        athleteName: 'API Athlete',
        now: new Date('2026-07-05T10:00:00.000Z'),
      });

      assert.equal(result.success, false);
      assert.match(result.success ? '' : result.error.message, /failed to generate termly report/i);
    } finally {
      bookingAuthorityService.listBookings = original.listAuthoritativeBookings;
      bookingService.list = original.listBookings;
      progressFeedbackService.getFeedbackForAthlete = original.getFeedback;
      badgeService.listAwardsForAthlete = original.listAwards;
      progressPracticeLogService.listAthleteLogs = original.listPracticeLogs;
      progressSelfAssessmentService.listAssessmentsForAthlete = original.listSelfAssessments;
      progressSkillsService.getAthleteSkillLevels = original.getSkillLevels;
      progressGoalsService.getGoalsForAthlete = original.getGoals;
    }
  });

  it('uses /v1 termly report snapshot contracts instead of local storage', async () => {
    const [{ progressTermlyReportService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/progress/progress-termly-report-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = global.fetch;
    const originalGetCurrentUser = authService.getCurrentUser;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_parent_api',
        email: 'parent@example.test',
        firstName: 'Parent',
        lastName: 'User',
        accountType: 'PARENT',
        roles: ['parent'],
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;

    apiClient.get = async () => {
      throw new Error('local termly report reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local termly report writes should not run in API mode');
    };
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      const report = makeReport();
      if (url.pathname === '/v1/athletes/ath_api_termly/termly-reports' && method === 'POST') {
        return new Response(
          JSON.stringify({
            snapshot: {
              id: 'trs_api_1',
              athleteId: 'ath_api_termly',
              generatedAt: report.generatedAt,
              report,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.pathname === '/v1/athletes/ath_api_termly/termly-reports' && method === 'GET') {
        return new Response(
          JSON.stringify({
            snapshots: [
              {
                id: 'trs_api_1',
                athleteId: 'ath_api_termly',
                generatedAt: report.generatedAt,
                report,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const saveResult = await progressTermlyReportService.saveReportSnapshot(makeReport());
      assert.equal(saveResult.success, true);
      assert.equal(saveResult.success && saveResult.data.id, 'trs_api_1');

      const listResult = await progressTermlyReportService.listReportSnapshots('ath_api_termly');
      assert.equal(listResult.success, true);
      assert.equal(listResult.success && listResult.data.length, 1);
      assert.deepEqual(
        calls.map((call) => `${call.method} ${call.path}`),
        [
          'POST /v1/athletes/ath_api_termly/termly-reports',
          'GET /v1/athletes/ath_api_termly/termly-reports',
        ],
      );
      assert.equal(
        (calls[0]?.body as { report?: { athleteId?: string } } | undefined)?.report?.athleteId,
        'ath_api_termly',
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      global.fetch = originalFetch;
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });
});
