import { useMemo } from 'react';

import type { BadgeAward, Goal } from '@/constants/types';
import type { MomentData, MomentType, SessionMedia } from '@/types/progress-types';
import type { AthleteProgress, SessionFeedback } from '@/services/progress-service';

interface StreakInfo {
  currentStreak: number;
  nextMilestone: number;
}

interface UseProgressMomentParams {
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  media: SessionMedia[];
  streakInfo: StreakInfo | null;
  isParentContext: boolean;
}

const STREAK_MILESTONES = [4, 8, 12, 26, 52] as const;

const ATHLETE_PRIORITY: MomentType[] = [
  'badge_earned',
  'challenge_completed',
  'streak_milestone',
  'skill_level_up',
  'feedback_received',
  'weekly_recap',
  'session_upcoming',
  'streak_active',
  'welcome',
];

const PARENT_PRIORITY: MomentType[] = [
  'feedback_received',
  'media_captured',
  'badge_earned',
  'skill_level_up',
  'goal_completed',
  'weekly_recap',
  'session_upcoming',
  'streak_active',
  'welcome',
];

function isWithinHours(dateString: string | undefined, hours: number): boolean {
  if (!dateString) {
    return false;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return Date.now() - parsed.getTime() <= hours * 60 * 60 * 1000;
}

function sortByNewest<T extends { createdAt?: string; awardedAt?: string; updatedAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    const leftDate = left.awardedAt ?? left.updatedAt ?? left.createdAt ?? '';
    const rightDate = right.awardedAt ?? right.updatedAt ?? right.createdAt ?? '';
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}

function resolveDefaultMilestone(currentStreak: number): number {
  return STREAK_MILESTONES.find((milestone) => milestone > currentStreak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

function resolveMomentType(
  priority: MomentType[],
  flags: Record<MomentType, boolean>,
): MomentType {
  for (const type of priority) {
    if (flags[type]) {
      return type;
    }
  }
  return 'welcome';
}

export function useProgressMoment({
  progress,
  feedback,
  badges,
  media,
  streakInfo,
  isParentContext,
}: UseProgressMomentParams): MomentData {
  return useMemo(
    () =>
      buildProgressMoment({
        progress,
        feedback,
        badges,
        media,
        streakInfo,
        isParentContext,
      }),
    [badges, feedback, isParentContext, media, progress, streakInfo],
  );
}

export function buildProgressMoment({
  progress,
  feedback,
  badges,
  media,
  streakInfo,
  isParentContext,
}: UseProgressMomentParams): MomentData {
  const sortedFeedback = sortByNewest(feedback);
  const sortedBadges = sortByNewest(badges);
  const sortedMedia = [...media].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const completedGoals: Goal[] = progress?.completedGoals ?? [];
  const sortedCompletedGoals = sortByNewest(completedGoals);
  const sortedSkills = [...(progress?.skills ?? [])].sort(
    (left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime(),
  );

  const latestFeedback = sortedFeedback[0];
  const latestBadge = sortedBadges[0];
  const latestMedia = sortedMedia[0];
  const latestCompletedGoal = sortedCompletedGoals[0];
  const latestSkillLevelUp = sortedSkills.find(
    (skill) => typeof skill.previousLevel === 'number' && skill.level > skill.previousLevel,
  );

  const currentStreak = streakInfo?.currentStreak ?? 0;
  const nextMilestone = streakInfo?.nextMilestone ?? resolveDefaultMilestone(currentStreak);

  const hasProgressData =
    (progress?.totalSessions ?? 0) > 0 ||
    feedback.length > 0 ||
    badges.length > 0 ||
    completedGoals.length > 0 ||
    media.length > 0;

  const flags: Record<MomentType, boolean> = {
    feedback_received: Boolean(latestFeedback && isWithinHours(latestFeedback.createdAt, 24)),
    media_captured: Boolean(latestMedia && isWithinHours(latestMedia.createdAt, 72)),
    badge_earned: Boolean(latestBadge && isWithinHours(latestBadge.awardedAt, 48)),
    goal_completed: Boolean(latestCompletedGoal && isWithinHours(latestCompletedGoal.updatedAt, 48)),
    challenge_completed: false,
    weekly_recap: (() => {
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue
      return (day === 1 || day === 2) && hasProgressData;
    })(),
    streak_milestone: STREAK_MILESTONES.includes(currentStreak as (typeof STREAK_MILESTONES)[number]),
    skill_level_up: Boolean(
      latestSkillLevelUp && isWithinHours(latestSkillLevelUp.lastUpdated, 48),
    ),
    session_upcoming: false,
    streak_active: hasProgressData,
    welcome: !hasProgressData,
  };

  const selectedType = resolveMomentType(
    isParentContext ? PARENT_PRIORITY : ATHLETE_PRIORITY,
    flags,
  );

  return {
    type: selectedType,
    feedback: selectedType === 'feedback_received' ? latestFeedback : undefined,
    badge: selectedType === 'badge_earned' ? latestBadge : undefined,
    goal: selectedType === 'goal_completed' ? latestCompletedGoal : undefined,
    media: selectedType === 'media_captured' ? latestMedia?.photos ?? [] : undefined,
    streakWeeks: currentStreak,
    nextStreakMilestone: nextMilestone,
    currentLevel: progress?.currentLevel ?? { level: 1, name: 'Rookie' },
    progressToNextLevel: progress?.progressToNextLevel ?? 0,
    nextSession: undefined,
  };
}
