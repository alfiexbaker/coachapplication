import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { authService } from '@/services/auth-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';

describe('progressFeedbackService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.SESSION_NOTES);
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
  });

  it('adds and retrieves session feedback (happy path)', async () => {
    const feedback = await progressFeedbackService.addSessionFeedback({
      sessionId: 'session_pf_1',
      coachId: 'coach_pf_1',
      coachName: 'Coach PF',
      athleteId: 'athlete_pf_1',
      athleteName: 'Athlete PF',
      publicSummary: 'Solid technical work',
      skillsWorkedOn: ['Passing'],
      skillRatings: [{ skill: 'Passing', rating: 7 }],
      improvements: 'Release ball earlier',
      homework: 'Wall passing 20 mins',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'parent',
      privateNotes: 'Monitor posture under pressure',
    });

    const fetched = await progressFeedbackService.getSessionFeedback('session_pf_1');
    assert.equal(fetched?.id, feedback.id);
    assert.equal(fetched?.athleteId, 'athlete_pf_1');
  });

  it('filters out coach-only feedback for parent view (empty path for parent-visible set)', async () => {
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session_pf_2',
      coachId: 'coach_pf_1',
      coachName: 'Coach PF',
      athleteId: 'athlete_pf_2',
      athleteName: 'Athlete PF2',
      publicSummary: 'Coach-only note',
      skillsWorkedOn: ['Defending'],
      skillRatings: [{ skill: 'Defending', rating: 6 }],
      improvements: 'Body orientation',
      homework: 'Mirror footwork',
      effortRating: 3,
      overallPerformance: 3,
      visibility: 'coach_only',
      privateNotes: 'Not parent visible',
    });

    const parentView = await progressFeedbackService.getFeedbackForAthlete('athlete_pf_2', 'parent');
    assert.deepEqual(parentView, []);
  });

  it('API mode uses signed-in guardian scope for athlete feedback history', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedHeaders: unknown[] = [];

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    authService.getCurrentUser = async () => ({
      id: 'parent_api_feedback',
      email: 'parent.api.feedback@example.test',
      accountType: 'PARENT',
      firstName: 'API',
      lastName: 'Parent',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T10:00:00.000Z',
    });
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      requestedUrls.push(String(input));
      requestedHeaders.push(init?.headers ?? {});
      return new Response(
        JSON.stringify({
          feedback: [
            {
              id: 'feedback_api_parent',
              sessionId: 'session_api_feedback',
              coachId: 'coach_api_feedback',
              coachName: 'Coach API',
              athleteId: 'ath_api_feedback',
              athleteName: 'Athlete API',
              publicSummary: 'Parent-visible feedback',
              skillsWorkedOn: ['Passing'],
              skillRatings: [{ skill: 'Passing', rating: 7 }],
              improvements: 'Open body earlier',
              homework: 'Wall passing',
              effortRating: 4,
              overallPerformance: 4,
              visibility: 'parent',
              createdAt: '2026-07-05T10:00:00.000Z',
              updatedAt: '2026-07-05T10:00:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const parentView = await progressFeedbackService.getFeedbackForAthlete(
        'usr_api_feedback',
        'parent',
        3,
      );

      assert.equal(
        requestedUrls[0],
        'http://localhost:4000/v1/athletes/ath_api_feedback/session-feedback?viewerRole=parent&limit=3',
      );
      assert.equal((requestedHeaders[0] as Record<string, string>)['x-acting-role'], 'parent');
      assert.equal(
        (requestedHeaders[0] as Record<string, string>)['x-guardian-athlete-ids'],
        'ath_api_feedback',
      );
      assert.equal(
        (requestedHeaders[0] as Record<string, string>)['x-coach-athlete-ids'],
        undefined,
      );
      assert.equal(parentView[0].id, 'feedback_api_parent');
    } finally {
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      }
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });

  it('saves and returns session notes', async () => {
    await progressFeedbackService.saveSessionNote('booking_pf_1', {
      summary: 'Good rhythm',
      focus: ['Scanning'],
      improvements: 'Faster head checks',
      homework: '2 touch rondo',
      effort: 5,
      attendance: 'present',
    });

    const note = await progressFeedbackService.getSessionNote('booking_pf_1');
    assert.ok(note);
    assert.equal(note?.summary, 'Good rhythm');
  });
});
