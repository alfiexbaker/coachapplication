import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressFeedbackService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.SESSION_FEEDBACK);
  });

  describe('addSessionFeedback', () => {
    it('should create session feedback', async () => {
      const feedback = {
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Young Athlete',
        publicSummary: 'Great session today',
        skillsWorkedOn: ['Passing', 'Dribbling'],
        skillRatings: [
          { skill: 'Passing', rating: 4 },
          { skill: 'Dribbling', rating: 3 },
        ],
        improvements: 'Much better passing accuracy',
        homework: 'Practice wall passes',
        effortRating: 5,
        overallPerformance: 4,
        visibility: 'parent' as const,
      };

      const result = await progressFeedbackService.addSessionFeedback(feedback);

      assert.ok(result.id);
      assert.equal(result.sessionId, feedback.sessionId);
      assert.equal(result.athleteId, feedback.athleteId);
      assert.equal(result.publicSummary, 'Great session today');
      assert.equal(result.effortRating, 5);
      assert.ok(result.createdAt);
    });

    it('should handle optional private notes', async () => {
      const feedback = {
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        coachId: 'coach1',
        coachName: 'Coach',
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        privateNotes: 'Consider different approach',
        publicSummary: 'Good session',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Good progress',
        homework: 'Practice drills',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'coach_only' as const,
      };

      const result = await progressFeedbackService.addSessionFeedback(feedback);

      assert.equal(result.privateNotes, 'Consider different approach');
      assert.equal(result.visibility, 'coach_only');
    });

    it('should handle video clip URLs', async () => {
      const feedback = {
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        coachId: 'coach1',
        coachName: 'Coach',
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        publicSummary: 'See videos',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Progress',
        homework: 'Practice',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'athlete' as const,
        videoClipUrls: ['https://example.com/video1.mp4', 'https://example.com/video2.mp4'],
      };

      const result = await progressFeedbackService.addSessionFeedback(feedback);

      assert.equal(result.videoClipUrls?.length, 2);
    });
  });

  describe('getSessionFeedback', () => {
    it('should return null for session with no feedback', async () => {
      const feedback = await progressFeedbackService.getSessionFeedback('nonexistent-session');

      assert.equal(feedback, null);
    });

    it('should return feedback for session', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);

      await progressFeedbackService.addSessionFeedback({
        sessionId,
        coachId: 'coach1',
        coachName: 'Coach',
        athleteId: 'athlete1',
        athleteName: 'Athlete',
        publicSummary: 'Good session',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Progress',
        homework: 'Practice',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent' as const,
      });

      const feedback = await progressFeedbackService.getSessionFeedback(sessionId);

      assert.ok(feedback);
      assert.equal(feedback.sessionId, sessionId);
    });
  });

  describe('getAthleteFeedback', () => {
    it('should return all feedback for athlete', async () => {
      const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);

      await progressFeedbackService.addSessionFeedback({
        sessionId: 'session1',
        coachId: 'coach1',
        coachName: 'Coach',
        athleteId,
        athleteName: 'Athlete',
        publicSummary: 'Session 1',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Progress',
        homework: 'Practice',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent' as const,
      });

      await progressFeedbackService.addSessionFeedback({
        sessionId: 'session2',
        coachId: 'coach1',
        coachName: 'Coach',
        athleteId,
        athleteName: 'Athlete',
        publicSummary: 'Session 2',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Progress',
        homework: 'Practice',
        effortRating: 5,
        overallPerformance: 5,
        visibility: 'parent' as const,
      });

      const feedback = await progressFeedbackService.getAthleteFeedback(athleteId);

      assert.equal(feedback.length, 2);
    });

    it('should return empty array for athlete with no feedback', async () => {
      const feedback = await progressFeedbackService.getAthleteFeedback('nonexistent-athlete');

      assert.equal(feedback.length, 0);
    });
  });

  describe('getCoachFeedback', () => {
    it('should return all feedback by coach', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await progressFeedbackService.addSessionFeedback({
        sessionId: 'session1',
        coachId,
        coachName: 'Coach',
        athleteId: 'athlete1',
        athleteName: 'Athlete 1',
        publicSummary: 'Session 1',
        skillsWorkedOn: [],
        skillRatings: [],
        improvements: 'Progress',
        homework: 'Practice',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent' as const,
      });

      const feedback = await progressFeedbackService.getCoachFeedback(coachId);

      assert.equal(feedback.length, 1);
    });
  });
});
