import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BadgeAward } from '@/constants/types';
import { buildProgressMoment } from '@/hooks/use-progress-moment';
import type { SessionFeedback, AthleteProgress, SkillLevel } from '@/services/progress-service';
import type { SessionMedia } from '@/types/progress-types';

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function makeProgress(skills: SkillLevel[] = []): AthleteProgress {
  return {
    athleteId: 'athlete_1',
    athleteName: 'Marcus',
    totalSessions: 8,
    sessionsThisMonth: 4,
    averagePerformance: 4,
    averageEffort: 4,
    attendanceRate: 100,
    skills,
    overallTrend: 'improving',
    improvementRate: 50,
    activeGoals: [],
    completedGoals: [],
    recentFeedback: [],
    totalBadges: 2,
    recentBadges: [],
    currentLevel: { level: 2, name: 'Progressing' },
    totalPoints: 90,
    progressToNextLevel: 40,
  };
}

function makeFeedback(createdAt: string): SessionFeedback {
  return {
    id: 'feedback_1',
    sessionId: 'session_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    athleteId: 'athlete_1',
    athleteName: 'Marcus',
    createdAt,
    publicSummary: 'Great focus and composure in tight spaces.',
    skillsWorkedOn: ['composure'],
    skillRatings: [],
    improvements: '',
    homework: '',
    effortRating: 4,
    overallPerformance: 4,
    visibility: 'athlete',
  };
}

function makeBadge(awardedAt: string): BadgeAward {
  return {
    id: 'award_1',
    badgeId: 'badge_1',
    badgeLabel: 'Vision & Passing',
    athleteId: 'athlete_1',
    coachId: 'coach1',
    reason: 'Strong passing quality',
    awardedBy: 'coach1',
    awardedAt,
    visibility: 'athlete',
  };
}

function makeMedia(createdAt: string): SessionMedia {
  return {
    sessionId: 'session_media_1',
    athleteId: 'athlete_1',
    coachId: 'coach1',
    photos: [
      {
        uri: 'file://photo-1.jpg',
        thumbnailUri: 'file://thumb-1.jpg',
        width: 1080,
        height: 720,
        capturedAt: createdAt,
      },
      {
        uri: 'file://photo-2.jpg',
        thumbnailUri: 'file://thumb-2.jpg',
        width: 1080,
        height: 720,
        capturedAt: createdAt,
      },
    ],
    video: null,
    createdAt,
  };
}

describe('buildProgressMoment', () => {
  it('prefers feedback over badge for parent context', () => {
    const feedback = [makeFeedback(isoHoursAgo(1))];
    const badges = [makeBadge(isoHoursAgo(1))];

    const moment = buildProgressMoment({
      progress: makeProgress(),
      feedback,
      badges,
      media: [],
      streakInfo: { currentStreak: 4, nextMilestone: 8 },
      isParentContext: true,
    });

    assert.equal(moment.type, 'feedback_received');
    assert.equal(moment.feedback?.id, 'feedback_1');
  });

  it('uses media_captured for parent context when feedback is not recent', () => {
    const staleFeedback = [makeFeedback(isoHoursAgo(96))];
    const media = [makeMedia(isoHoursAgo(2))];

    const moment = buildProgressMoment({
      progress: makeProgress(),
      feedback: staleFeedback,
      badges: [],
      media,
      streakInfo: { currentStreak: 2, nextMilestone: 4 },
      isParentContext: true,
    });

    assert.equal(moment.type, 'media_captured');
    assert.equal(moment.media?.length, 2);
  });

  it('prefers badge over feedback for athlete context', () => {
    const feedback = [makeFeedback(isoHoursAgo(1))];
    const badges = [makeBadge(isoHoursAgo(1))];

    const moment = buildProgressMoment({
      progress: makeProgress(),
      feedback,
      badges,
      media: [],
      streakInfo: { currentStreak: 3, nextMilestone: 4 },
      isParentContext: false,
    });

    assert.equal(moment.type, 'badge_earned');
    assert.equal(moment.badge?.id, 'award_1');
  });
});
