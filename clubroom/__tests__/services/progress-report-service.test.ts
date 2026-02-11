import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressReportService } from '@/services/progress/progress-report-service';

describe('progressReportService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.GOALS);
    await apiClient.remove(STORAGE_KEYS.BADGE_AWARDS);
  });

  it('aggregates athlete progress data (happy path)', async () => {
    await progressSkillsService.updateSkillLevel('athlete_pr_1', 'Passing', 6, 'coach_pr_1');
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session_pr_1',
      coachId: 'coach_pr_1',
      coachName: 'Coach PR',
      athleteId: 'athlete_pr_1',
      athleteName: 'Athlete PR',
      publicSummary: 'Good rhythm and body shape',
      skillsWorkedOn: ['Passing'],
      skillRatings: [{ skill: 'Passing', rating: 6 }],
      improvements: 'Release timing',
      homework: 'Wall passing',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'parent',
    });

    const progress = await progressReportService.getAthleteProgress('athlete_pr_1', 'parent');
    assert.equal(progress.athleteId, 'athlete_pr_1');
    assert.equal(progress.totalSessions, 1);
    assert.ok(progress.skills.length >= 1);
  });

  it('returns empty metrics for athlete with no activity (empty path)', async () => {
    const progress = await progressReportService.getAthleteProgress('athlete_pr_none', 'parent');
    assert.equal(progress.totalSessions, 0);
    assert.deepEqual(progress.skills, []);
    assert.equal(progress.recentFeedback.length, 0);
  });
});
