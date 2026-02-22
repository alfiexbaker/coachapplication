import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { emitTyped, onTyped, ServiceEvents } from '@/services/event-bus';
import { progressChallengeService } from '@/services/progress/progress-challenge-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import type { ProgressChallenge } from '@/types/progress-types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createSession(athleteId: string, sessionId: string, daysAgo: number) {
  const completedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: sessionId,
    athleteId,
    completedAt,
    attendance: 'ATTENDED',
    performanceRating: 4,
    status: 'COMPLETED',
  };
}

async function seedCoachSessions(athleteId: string, count: number): Promise<void> {
  const sessions = Array.from({ length: count }).map((_, index) =>
    createSession(athleteId, `session_${index + 1}`, index),
  );
  await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, sessions);
}

async function setActiveChallenge(challenge: ProgressChallenge): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE, {
    [challenge.athleteId]: challenge,
  });
}

describe('progressChallengeService', () => {
  beforeEach(async () => {
    await Promise.all([
      apiClient.remove(STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE),
      apiClient.remove(STORAGE_KEYS.PROGRESS_CHALLENGE_HISTORY),
      apiClient.remove(STORAGE_KEYS.COACH_SESSIONS),
      apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK),
      apiClient.remove(STORAGE_KEYS.SESSION_JOURNAL),
      apiClient.remove(STORAGE_KEYS.BADGE_AWARDS),
      apiClient.remove(STORAGE_KEYS.SKILL_LEVELS),
      apiClient.remove(STORAGE_KEYS.GOALS),
      apiClient.remove(STORAGE_KEYS.COACH_SESSIONS),
    ]);
  });

  it('returns null active challenge for a brand-new athlete with no sessions', async () => {
    const result = await progressChallengeService.getActiveChallenge('athlete_new');
    assert.equal(result.success, true);
    assert.equal(result.success ? result.data : null, null);
  });

  it('assigns and stores an active challenge when athlete has session history', async () => {
    const athleteId = 'athlete_assign';
    await seedCoachSessions(athleteId, 2);

    let assignedChallengeId: string | undefined;
    const unsub = onTyped(ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED, (payload) => {
      if (payload.athleteId === athleteId) {
        assignedChallengeId = payload.challengeId;
      }
    });

    const result = await progressChallengeService.getActiveChallenge(athleteId);
    unsub();

    assert.equal(result.success, true);
    assert.ok(result.success && result.data);
    assert.equal(result.success ? result.data?.athleteId : '', athleteId);

    const stored = await apiClient.get<Record<string, ProgressChallenge>>(
      STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE,
      {},
    );
    assert.ok(stored[athleteId]);
    assert.equal(stored[athleteId].id, result.success && result.data ? result.data.id : '');
    assert.equal(assignedChallengeId, stored[athleteId].id);
  });

  it('maps latest Quick Rate fourCorners into skill challenge progress representation', async () => {
    const athleteId = 'athlete_quick_rate';
    const coachId = 'coach_quick_rate';
    await seedCoachSessions(athleteId, 3);

    const firstRate = await progressFeedbackService.createFeedbackFromQuickRate(
      {
        athleteId,
        athleteName: 'Athlete QA',
        sessionId: 'session_qr_1',
        coachId,
        technical: 4,
        physical: 4,
        psychological: 4,
        social: 1,
        effort: 4,
      },
      'Coach QA',
      'Athlete QA',
    );
    assert.equal(firstRate.success, true);

    await delay(5);

    const secondRate = await progressFeedbackService.createFeedbackFromQuickRate(
      {
        athleteId,
        athleteName: 'Athlete QA',
        sessionId: 'session_qr_2',
        coachId,
        technical: 5,
        physical: 3,
        psychological: 5,
        social: 4,
        effort: 5,
      },
      'Coach QA',
      'Athlete QA',
    );
    assert.equal(secondRate.success, true);

    const activeChallenge: ProgressChallenge = {
      id: 'challenge_skill_repr',
      athleteId,
      type: 'skill',
      title: 'Get your weakest corner to 4/5',
      description: 'Data representation check',
      targetValue: 4,
      currentValue: 1,
      progress: 25,
      rewardBadgeId: 'badge_challenge_levelling_up',
      rewardLabel: 'Levelling Up',
      status: 'active',
      assignedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await setActiveChallenge(activeChallenge);
    const updateResult = await progressChallengeService.updateProgress(athleteId);

    assert.equal(updateResult.success, true);
    assert.ok(updateResult.success && updateResult.data);
    assert.equal(updateResult.success ? updateResult.data?.type : '', 'skill');
    assert.equal(updateResult.success ? updateResult.data?.currentValue : 0, 3);
    assert.equal(updateResult.success ? updateResult.data?.progress : 0, 75);
  });

  it('updates challenge from SESSION_FEEDBACK_SAVED event trigger', async () => {
    const athleteId = 'athlete_event_update';
    const coachId = 'coach_event_update';
    await seedCoachSessions(athleteId, 2);

    const challenge: ProgressChallenge = {
      id: 'challenge_event_1',
      athleteId,
      type: 'skill',
      title: 'Skill event challenge',
      description: 'Event path test',
      targetValue: 5,
      currentValue: 1,
      progress: 20,
      rewardBadgeId: 'badge_challenge_levelling_up',
      rewardLabel: 'Levelling Up',
      status: 'active',
      assignedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await setActiveChallenge(challenge);

    // Ensures event handlers are registered for this process.
    await progressChallengeService.getActiveChallenge(athleteId);

    const feedbackResult = await progressFeedbackService.createFeedbackFromQuickRate(
      {
        athleteId,
        athleteName: 'Athlete Event',
        sessionId: 'session_event_1',
        coachId,
        technical: 5,
        physical: 4,
        psychological: 4,
        social: 3,
        effort: 4,
      },
      'Coach Event',
      'Athlete Event',
    );
    assert.equal(feedbackResult.success, true);

    emitTyped(ServiceEvents.SESSION_FEEDBACK_SAVED, {
      sessionId: 'session_event_1',
      bookingId: undefined,
      coachId,
      athleteId,
      skillCount: 4,
    });

    await delay(50);

    const activeMap = await apiClient.get<Record<string, ProgressChallenge>>(
      STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE,
      {},
    );
    assert.ok(activeMap[athleteId]);
    assert.equal(activeMap[athleteId].currentValue, 3);
    assert.equal(activeMap[athleteId].progress, 60);
  });

  it('completes challenge, stores history, emits completion event, and assigns next', async () => {
    const athleteId = 'athlete_complete';
    await seedCoachSessions(athleteId, 4);

    const activeChallenge: ProgressChallenge = {
      id: 'challenge_complete_1',
      athleteId,
      type: 'badge_collection',
      title: 'Earn a Social badge',
      description: 'Completion flow',
      targetValue: 1,
      currentValue: 1,
      progress: 100,
      rewardBadgeId: 'badge_challenge_collector',
      rewardLabel: 'Collector',
      status: 'active',
      assignedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await setActiveChallenge(activeChallenge);

    let completedChallengeId: string | undefined;
    const unsub = onTyped(ServiceEvents.PROGRESS_CHALLENGE_COMPLETED, (payload) => {
      if (payload.athleteId === athleteId) {
        completedChallengeId = payload.challengeId;
      }
    });

    const result = await progressChallengeService.completeChallenge(activeChallenge.id);
    unsub();

    assert.equal(result.success, true);
    assert.ok(result.success && result.data);
    assert.equal(result.success ? result.data.completed.status : 'active', 'completed');
    assert.equal(result.success ? result.data.completed.progress : 0, 100);
    assert.ok(result.success && result.data.badgeAwarded);
    assert.equal(result.success ? result.data.badgeAwarded?.badgeId : '', 'badge_challenge_collector');
    assert.ok(result.success ? result.data.nextChallenge : null);
    const nextChallengeIdFromResult =
      result.success && result.data.nextChallenge ? result.data.nextChallenge.id : undefined;

    const history = await apiClient.get<ProgressChallenge[]>(STORAGE_KEYS.PROGRESS_CHALLENGE_HISTORY, []);
    assert.equal(history.length, 1);
    assert.equal(history[0].id, activeChallenge.id);
    assert.equal(history[0].status, 'completed');
    assert.equal(completedChallengeId, activeChallenge.id);

    const activeMap = await apiClient.get<Record<string, ProgressChallenge>>(
      STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE,
      {},
    );
    assert.equal(activeMap[athleteId]?.id, nextChallengeIdFromResult);
  });

  it('expires outdated active challenge and assigns a replacement', async () => {
    const athleteId = 'athlete_expired';
    await seedCoachSessions(athleteId, 2);

    const expiredChallenge: ProgressChallenge = {
      id: 'challenge_expired_1',
      athleteId,
      type: 'attendance',
      title: 'Attend 2 sessions',
      description: 'Expiry path',
      targetValue: 2,
      currentValue: 1,
      progress: 50,
      rewardBadgeId: 'badge_streak_starter',
      rewardLabel: 'Consistent Attender',
      status: 'active',
      assignedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await setActiveChallenge(expiredChallenge);

    const checkResult = await progressChallengeService.checkExpired(athleteId);
    assert.equal(checkResult.success, true);
    assert.equal(checkResult.success ? checkResult.data.length : 0, 1);
    assert.equal(checkResult.success ? checkResult.data[0].status : 'active', 'expired');

    const activeMap = await apiClient.get<Record<string, ProgressChallenge>>(
      STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE,
      {},
    );
    assert.ok(activeMap[athleteId]);
    assert.notEqual(activeMap[athleteId].id, expiredChallenge.id);
  });
});
