import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MonthSummary } from '@/types/progress-types';
import type { SessionFeedback, SkillLevel } from '@/services/progress-service';
import { monthlySummaryService } from '@/services/progress/monthly-summary-service';

const summary: MonthSummary = {
  sessionsAttended: 4,
  feedbackCount: 12,
  skillsImproved: 2,
  goalsCompleted: 1,
  badgesEarned: 3,
  photosCount: 5,
  videosCount: 2,
};

function makeSkill(level: number, previousLevel: number): SkillLevel {
  return {
    skill: 'Passing',
    level,
    previousLevel,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'coach1',
    trend: 'improving',
    history: [],
  };
}

function makeFeedback(publicSummary: string): SessionFeedback {
  return {
    id: 'feedback_1',
    sessionId: 'session_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    athleteId: 'athlete_1',
    athleteName: 'Marcus',
    createdAt: new Date().toISOString(),
    publicSummary,
    skillsWorkedOn: ['Passing'],
    skillRatings: [],
    improvements: '',
    homework: '',
    effortRating: 4,
    overallPerformance: 4,
    visibility: 'athlete',
  };
}

describe('monthlySummaryService.buildMonthlySummary', () => {
  it('generates narrative and value copy with skill + coach highlight', () => {
    const result = monthlySummaryService.buildMonthlySummary(
      'Marcus',
      summary,
      [makeSkill(6, 4)],
      [makeFeedback('Great composure and outstanding passing under pressure today.')],
    );

    assert.equal(result.success, true);
    assert.ok(result.success && result.data.monthTitle.endsWith('Summary'));
    assert.ok(result.success && result.data.narrative.includes('Marcus had a strong month.'));
    assert.ok(result.success && result.data.narrative.includes('Passing moved from Good to Very Good.'));
    assert.ok(result.success && result.data.narrative.includes('Coach Sarah noted:'));
    assert.ok(result.success && result.data.valueLine.includes('Your £20 this month:'));
    assert.ok(result.success && result.data.valueLine.includes('6 hours'));
  });

  it('falls back to generic month review copy when no standout signal exists', () => {
    const result = monthlySummaryService.buildMonthlySummary(
      'Ella',
      {
        sessionsAttended: 1,
        feedbackCount: 0,
        skillsImproved: 0,
        goalsCompleted: 0,
        badgesEarned: 0,
        photosCount: 0,
        videosCount: 0,
      },
      [],
      [],
    );

    assert.equal(result.success, true);
    assert.ok(result.success && result.data.narrative.includes("Here's Ella's month in review."));
  });
});
