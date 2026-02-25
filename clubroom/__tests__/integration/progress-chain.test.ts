/**
 * Integration: Progress Chain
 *
 * Tests the skill rating flow: addSessionFeedback -> verify skill levels updated
 * Exercises progressFeedbackService and progressSkillsService together.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';

describe('Integration: Progress Chain (Feedback -> Skill Levels)', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
    await apiClient.remove(STORAGE_KEYS.SESSION_NOTES);
    await apiClient.remove(STORAGE_KEYS.BADGE_AWARDS);
  });

  it('addSessionFeedback with skill ratings updates skill levels', async () => {
    const athleteId = 'athlete-prog1';
    const coachId = 'coach-prog1';

    // Step 1: Add session feedback with skill ratings
    const feedback = await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-001',
      coachId,
      coachName: 'Coach Marcus',
      athleteId,
      athleteName: 'Alex',
      publicSummary: 'Great session working on passing and dribbling.',
      skillsWorkedOn: ['Passing', 'Dribbling'],
      skillRatings: [
        { skill: 'Passing', rating: 4 },
        { skill: 'Dribbling', rating: 3 },
      ],
      improvements: 'Work on weak foot passing.',
      homework: 'Practice wall passes for 10 minutes daily.',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'athlete',
    });

    assert.ok(feedback.id, 'feedback should have an id');
    assert.equal(feedback.athleteId, athleteId);
    assert.equal(feedback.skillRatings.length, 2);

    // Step 2: Verify skill levels were updated
    const skillLevels = await progressSkillsService.getAthleteSkillLevels(athleteId);
    assert.ok(skillLevels, 'athlete should have skill levels after feedback');
    assert.ok(skillLevels!.skills['Passing'], 'Passing skill should exist');
    assert.ok(skillLevels!.skills['Dribbling'], 'Dribbling skill should exist');

    // Ratings are mapped: rating * 2 = level (1-10 scale), so rating 4 -> level 8
    assert.equal(skillLevels!.skills['Passing'].level, 8, 'Passing level should be 8 (4 * 2)');
    assert.equal(skillLevels!.skills['Dribbling'].level, 6, 'Dribbling level should be 6 (3 * 2)');
    assert.equal(skillLevels!.skills['Passing'].updatedBy, coachId);
  });

  it('subsequent feedback updates skill levels and tracks trend', async () => {
    const athleteId = 'athlete-trend1';
    const coachId = 'coach-trend1';

    // First feedback: Passing = 3
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-t1',
      coachId,
      coachName: 'Coach A',
      athleteId,
      athleteName: 'Bob',
      publicSummary: 'First session.',
      skillsWorkedOn: ['Passing'],
      skillRatings: [{ skill: 'Passing', rating: 3 }],
      improvements: '',
      homework: '',
      effortRating: 3,
      overallPerformance: 3,
      visibility: 'athlete',
    });

    // Second feedback: Passing = 4 (improvement)
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-t2',
      coachId,
      coachName: 'Coach A',
      athleteId,
      athleteName: 'Bob',
      publicSummary: 'Second session - improved passing.',
      skillsWorkedOn: ['Passing'],
      skillRatings: [{ skill: 'Passing', rating: 4 }],
      improvements: '',
      homework: '',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'athlete',
    });

    // Verify skill level updated and trend is improving
    const skillLevels = await progressSkillsService.getAthleteSkillLevels(athleteId);
    assert.ok(skillLevels);
    const passing = skillLevels!.skills['Passing'];
    assert.equal(passing.level, 8, 'Passing level should be 8 (latest rating 4 * 2)');
    assert.equal(passing.previousLevel, 6, 'previousLevel should be 6 (rating 3 * 2)');
    assert.equal(passing.trend, 'improving', 'trend should be improving');
    assert.ok(passing.history.length >= 2, 'should have at least 2 history entries');
  });

  it('getSkillHistory returns chronological entries', async () => {
    const athleteId = 'athlete-hist1';
    const coachId = 'coach-hist1';

    // Add two feedbacks for same skill
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-h1',
      coachId,
      coachName: 'Coach H',
      athleteId,
      athleteName: 'Charlie',
      publicSummary: 'First.',
      skillsWorkedOn: ['Shooting'],
      skillRatings: [{ skill: 'Shooting', rating: 2 }],
      improvements: '',
      homework: '',
      effortRating: 3,
      overallPerformance: 3,
      visibility: 'athlete',
    });

    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-h2',
      coachId,
      coachName: 'Coach H',
      athleteId,
      athleteName: 'Charlie',
      publicSummary: 'Second.',
      skillsWorkedOn: ['Shooting'],
      skillRatings: [{ skill: 'Shooting', rating: 5 }],
      improvements: '',
      homework: '',
      effortRating: 5,
      overallPerformance: 5,
      visibility: 'athlete',
    });

    const history = await progressSkillsService.getSkillHistory(athleteId, 'Shooting');
    assert.ok(history.length >= 2, 'should have at least 2 history entries');
    // levels: rating 2 -> level 4, rating 5 -> level 10
    assert.equal(history[0].level, 4);
    assert.equal(history[1].level, 10);
  });

  it('feedback for unknown athlete creates new skill record', async () => {
    const athleteId = 'brand-new-athlete';

    // Verify no skill data exists
    const before = await progressSkillsService.getAthleteSkillLevels(athleteId);
    assert.equal(before, null, 'should have no skill data initially');

    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session-new1',
      coachId: 'coach-new',
      coachName: 'New Coach',
      athleteId,
      athleteName: 'New Athlete',
      publicSummary: 'Initial assessment.',
      skillsWorkedOn: ['Speed'],
      skillRatings: [{ skill: 'Speed', rating: 3 }],
      improvements: '',
      homework: '',
      effortRating: 3,
      overallPerformance: 3,
      visibility: 'athlete',
    });

    const after = await progressSkillsService.getAthleteSkillLevels(athleteId);
    assert.ok(after, 'skill record should exist after feedback');
    assert.ok(after!.skills['Speed'], 'Speed skill should exist');
    assert.equal(after!.skills['Speed'].level, 6);
  });
});
