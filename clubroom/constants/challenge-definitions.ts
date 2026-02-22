import type { BadgeCategory } from '@/constants/user-types';
import type { ProgressChallenge, ProgressChallengeType } from '@/types/progress-types';

export interface ChallengeMetricsSnapshot {
  totalSessions: number;
  sessionsThisMonth: number;
  currentStreak: number;
  weakestCorner: {
    key: BadgeCategory;
    rating: number; // 1-5
  };
  weakestBadgeCategory: BadgeCategory;
  badgesInWeakestCategory: number;
  journalEntriesThisWeek: number;
  improvingSkills: number;
}

export interface ChallengeCandidate {
  type: ProgressChallengeType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  rewardBadgeId: string;
  rewardLabel: string;
  durationDays: number;
  probability: number; // 0-1 completion likelihood
}

const STREAK_MILESTONES = [4, 8, 12, 26, 52] as const;
const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  technical: 'Technical',
  physical: 'Physical',
  psychological: 'Psychological',
  social: 'Social',
};

function clampChallengeValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

export function clampChallengeProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function computeProbability(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, currentValue / targetValue));
}

function getNextStreakTarget(currentStreak: number): number {
  return (
    STREAK_MILESTONES.find((milestone) => milestone > currentStreak) ??
    STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
  );
}

function getAttendanceReward(targetValue: number): { badgeId: string; rewardLabel: string } {
  if (targetValue >= 6) {
    return {
      badgeId: 'badge_dedicated_athlete',
      rewardLabel: 'Dedicated Athlete',
    };
  }

  return {
    badgeId: 'badge_streak_starter',
    rewardLabel: 'Consistent Attender',
  };
}

function getStreakReward(targetValue: number): { badgeId: string; rewardLabel: string } {
  if (targetValue >= 12) {
    return {
      badgeId: 'badge_challenge_machine',
      rewardLabel: 'Machine',
    };
  }
  if (targetValue >= 8) {
    return {
      badgeId: 'badge_challenge_unstoppable',
      rewardLabel: 'Unstoppable',
    };
  }
  return {
    badgeId: 'badge_challenge_on_a_roll',
    rewardLabel: 'On a Roll',
  };
}

export function buildChallengeCandidates(
  metrics: ChallengeMetricsSnapshot,
): ChallengeCandidate[] {
  const attendanceTarget = Math.max(1, metrics.sessionsThisMonth + 1);
  const attendanceReward = getAttendanceReward(attendanceTarget);

  const streakTarget = getNextStreakTarget(metrics.currentStreak);
  const streakReward = getStreakReward(streakTarget);

  const skillCurrent = Math.max(1, metrics.weakestCorner.rating);
  const skillTarget = Math.min(5, skillCurrent + 1);
  const weakestCornerLabel = CATEGORY_LABELS[metrics.weakestCorner.key];

  const badgeTarget = metrics.badgesInWeakestCategory + 1;
  const badgeCategoryLabel = CATEGORY_LABELS[metrics.weakestBadgeCategory];

  const journalTarget = metrics.journalEntriesThisWeek >= 2 ? 3 : 2;
  const improvementTarget = Math.max(1, metrics.improvingSkills + 1);

  const candidates: ChallengeCandidate[] = [
    {
      type: 'attendance',
      title: `Attend ${attendanceTarget} sessions this month`,
      description: "You're one session away from another consistency step.",
      targetValue: attendanceTarget,
      currentValue: metrics.sessionsThisMonth,
      rewardBadgeId: attendanceReward.badgeId,
      rewardLabel: attendanceReward.rewardLabel,
      durationDays: 30,
      probability: computeProbability(metrics.sessionsThisMonth, attendanceTarget),
    },
    {
      type: 'streak',
      title: `Keep your streak for ${streakTarget} weeks`,
      description: 'Stay consistent and hit the next streak milestone.',
      targetValue: streakTarget,
      currentValue: metrics.currentStreak,
      rewardBadgeId: streakReward.badgeId,
      rewardLabel: streakReward.rewardLabel,
      durationDays: 30,
      probability: computeProbability(metrics.currentStreak, streakTarget),
    },
    {
      type: 'skill',
      title: `Get your weakest corner to ${skillTarget}/5`,
      description: `${weakestCornerLabel} is currently at ${skillCurrent}/5.`,
      targetValue: skillTarget,
      currentValue: skillCurrent,
      rewardBadgeId: 'badge_challenge_levelling_up',
      rewardLabel: 'Levelling Up',
      durationDays: 30,
      probability: computeProbability(skillCurrent, skillTarget),
    },
    {
      type: 'badge_collection',
      title: `Earn a ${badgeCategoryLabel} badge`,
      description: `${badgeCategoryLabel} has the most room for growth right now.`,
      targetValue: badgeTarget,
      currentValue: metrics.badgesInWeakestCategory,
      rewardBadgeId: 'badge_challenge_collector',
      rewardLabel: 'Collector',
      durationDays: 30,
      probability: computeProbability(metrics.badgesInWeakestCategory, badgeTarget),
    },
    {
      type: 'journal',
      title: `Journal after ${journalTarget} sessions this week`,
      description: 'Reflection builds long-term improvement habits.',
      targetValue: journalTarget,
      currentValue: metrics.journalEntriesThisWeek,
      rewardBadgeId: 'badge_challenge_reflector',
      rewardLabel: 'Reflector',
      durationDays: 7,
      probability: computeProbability(metrics.journalEntriesThisWeek, journalTarget),
    },
    {
      type: 'improvement',
      title: 'Improve any skill this month',
      description: 'Push at least one skill into improving trend.',
      targetValue: improvementTarget,
      currentValue: metrics.improvingSkills,
      rewardBadgeId: 'badge_growth_mindset',
      rewardLabel: 'Growth Mindset',
      durationDays: 30,
      probability: computeProbability(metrics.improvingSkills, improvementTarget),
    },
  ];

  return candidates.map((candidate) => ({
    ...candidate,
    currentValue: clampChallengeValue(candidate.currentValue),
    targetValue: Math.max(1, clampChallengeValue(candidate.targetValue)),
  }));
}

export function selectNextChallenge(
  candidates: ChallengeCandidate[],
  lastType: ProgressChallengeType | null,
): ChallengeCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const filtered = lastType
    ? candidates.filter((candidate) => candidate.type !== lastType)
    : candidates;

  const source = filtered.length > 0 ? filtered : candidates;
  const sorted = [...source].sort((left, right) => right.probability - left.probability);
  return sorted[0] ?? null;
}

function addDays(isoDate: string, days: number): string {
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) {
    return isoDate;
  }

  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function buildChallengeFromCandidate(
  athleteId: string,
  challengeId: string,
  candidate: ChallengeCandidate,
  assignedAt: string,
): ProgressChallenge {
  const progress =
    candidate.targetValue > 0
      ? clampChallengeProgress((candidate.currentValue / candidate.targetValue) * 100)
      : 0;

  return {
    id: challengeId,
    athleteId,
    type: candidate.type,
    title: candidate.title,
    description: candidate.description,
    targetValue: candidate.targetValue,
    currentValue: candidate.currentValue,
    progress,
    rewardBadgeId: candidate.rewardBadgeId,
    rewardLabel: candidate.rewardLabel,
    status: 'active',
    assignedAt,
    expiresAt: addDays(assignedAt, candidate.durationDays),
  };
}

export function calculateDaysRemaining(expiresAt: string): number {
  const expiryTimestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTimestamp)) {
    return 0;
  }
  const diff = expiryTimestamp - Date.now();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
