import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AthleteProgress } from '@/services/progress/progress-report-service';
import type { ProgressChallenge } from '@/types/progress-types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function activeChallenge(): ProgressChallenge {
  return {
    id: 'challenge_api_metrics',
    athleteId: 'ath_api_challenge',
    type: 'journal',
    title: 'Reflect this week',
    description: 'Write one practice reflection.',
    targetValue: 1,
    currentValue: 0,
    progress: 0,
    rewardBadgeId: 'badge_challenge_reflection',
    rewardLabel: 'Reflective Player',
    status: 'active',
    assignedAt: '2026-07-01T00:00:00.000Z',
    expiresAt: '2030-07-01T00:00:00.000Z',
  };
}

function progressPayload(): AthleteProgress {
  return {
    athleteId: 'ath_api_challenge',
    athleteName: 'API Challenge',
    totalSessions: 3,
    sessionsThisMonth: 1,
    averagePerformance: 4,
    averageEffort: 4,
    attendanceRate: 100,
    skills: [],
    overallTrend: 'steady',
    improvementRate: 0,
    activeGoals: [],
    completedGoals: [],
    recentFeedback: [],
    totalBadges: 0,
    recentBadges: [],
    currentLevel: { level: 1, name: 'Foundation' },
    totalPoints: 0,
    progressToNextLevel: 0,
  };
}

describe('progressChallengeService API mode', () => {
  it('does not save challenge progress when practice-log metrics fail', async (t) => {
    const [
      { progressChallengeService },
      { progressReportService },
      { progressFeedbackService },
      { progressPracticeLogService },
      { badgeService },
      { authService },
    ] = await Promise.all([
      import('@/services/progress/progress-challenge-service'),
      import('@/services/progress/progress-report-service'),
      import('@/services/progress/progress-feedback-service'),
      import('@/services/progress/progress-practice-log-service'),
      import('@/services/badge-service'),
      import('@/services/auth-service'),
    ]);

    const original = {
      fetch: globalThis.fetch,
      getCurrentUser: authService.getCurrentUser,
      getAthleteProgress: progressReportService.getAthleteProgress,
      getStreakInfo: badgeService.getStreakInfo,
      listAwardsForAthlete: badgeService.listAwardsForAthlete,
      getFeedbackForAthlete: progressFeedbackService.getFeedbackForAthlete,
      listDefinitions: badgeService.listDefinitions,
      listAthleteLogs: progressPracticeLogService.listAthleteLogs,
    };
    const calls: Array<{ method: string; path: string }> = [];

    authService.getCurrentUser = async () =>
      ({
        id: 'usr_coach_challenge',
        email: 'coach.challenge@example.test',
        accountType: 'COACH',
        firstName: 'Coach',
        lastName: 'Challenge',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    progressReportService.getAthleteProgress = async () => progressPayload();
    badgeService.getStreakInfo = async () => ({
      currentStreak: 1,
      nextMilestone: 2,
      daysToNextMilestone: 1,
      streakLabel: 'Keep going',
    });
    badgeService.listAwardsForAthlete = async () => [];
    progressFeedbackService.getFeedbackForAthlete = async () => [];
    badgeService.listDefinitions = async () => [];
    progressPracticeLogService.listAthleteLogs = original.listAthleteLogs;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      if (
        method === 'GET' &&
        url.pathname === '/v1/athletes/ath_api_challenge/progress-challenge'
      ) {
        return new Response(JSON.stringify({ challenge: activeChallenge() }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'GET' && url.pathname === '/v1/athletes/ath_api_challenge/practice-logs') {
        return new Response(JSON.stringify({ message: 'practice logs down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `unexpected ${method} ${url.pathname}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      authService.getCurrentUser = original.getCurrentUser;
      progressReportService.getAthleteProgress = original.getAthleteProgress;
      badgeService.getStreakInfo = original.getStreakInfo;
      badgeService.listAwardsForAthlete = original.listAwardsForAthlete;
      progressFeedbackService.getFeedbackForAthlete = original.getFeedbackForAthlete;
      badgeService.listDefinitions = original.listDefinitions;
      progressPracticeLogService.listAthleteLogs = original.listAthleteLogs;
    });

    const result = await progressChallengeService.updateProgress('api_challenge');

    assert.equal(result.success, false);
    assert.match(result.success ? '' : result.error.message, /practice logs down/i);
    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/athletes/ath_api_challenge/progress-challenge' },
      { method: 'GET', path: '/v1/athletes/ath_api_challenge/practice-logs' },
    ]);
  });
});
