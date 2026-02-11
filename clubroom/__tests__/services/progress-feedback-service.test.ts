import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
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
