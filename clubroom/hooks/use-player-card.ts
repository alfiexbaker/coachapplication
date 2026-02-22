import { useMemo } from 'react';

import { POSITION_SKILLS, POSITION_SKILL_ICONS, mapSkillToCorner } from '@/constants/position-skills';
import type { BadgeAward } from '@/constants/types';
import type { AthleteProgress, SessionFeedback } from '@/services/progress-service';
import type { PlayerCardData, PositionRole, SessionMedia } from '@/types/progress-types';
import { toCardTier, toFifaScore } from '@/utils/fifa-score';

interface StreakInfo {
  currentStreak: number;
}

interface UsePlayerCardInput {
  athleteName: string;
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  media: SessionMedia[];
  streakInfo: StreakInfo | null;
  position?: PositionRole;
}

function toTimestamp(date: string | undefined): number | null {
  if (!date) {
    return null;
  }

  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatMemberSince(dateString: string): string {
  const timestamp = toTimestamp(dateString);
  if (timestamp === null) {
    return new Date().toISOString();
  }
  return new Date(timestamp).toISOString();
}

function toPercentDelta(previous: number, current: number): number {
  if (previous <= 0) {
    return 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function usePlayerCard({
  athleteName,
  progress,
  feedback,
  badges,
  media,
  streakInfo,
  position,
}: UsePlayerCardInput): PlayerCardData {
  return useMemo(() => {
    const skills = progress?.skills ?? [];
    const skillLookup = skills.reduce<Record<string, number>>((acc, skill) => {
      acc[skill.skill.toLowerCase()] = skill.level;
      return acc;
    }, {});

    const cornerBuckets: Record<'technical' | 'physical' | 'psychological' | 'social', number[]> = {
      technical: [],
      physical: [],
      psychological: [],
      social: [],
    };

    for (const skill of skills) {
      const corner = mapSkillToCorner(skill.skill);
      cornerBuckets[corner].push(toFifaScore(skill.level));
    }

    const cornerAverage = (values: number[]): number => {
      if (values.length === 0) {
        return toFifaScore(1);
      }
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    };

    const bestSkill = skills.length
      ? [...skills]
          .sort((left, right) => right.level - left.level)[0]
      : null;

    const mostImproved = skills
      .map((skill) => {
        const earliest = [...skill.history].sort((left, right) => {
          const leftTime = toTimestamp(left.date);
          const rightTime = toTimestamp(right.date);
          if (leftTime === null && rightTime === null) return 0;
          if (leftTime === null) return 1;
          if (rightTime === null) return -1;
          return leftTime - rightTime;
        })[0];
        const changePercent = earliest ? toPercentDelta(earliest.level, skill.level) : 0;
        return { name: skill.skill, changePercent };
      })
      .sort((left, right) => right.changePercent - left.changePercent)[0];

    const allPhotos = media
      .flatMap((entry) => entry.photos)
      .sort((left, right) => {
        const leftTime = toTimestamp(left.capturedAt) ?? 0;
        const rightTime = toTimestamp(right.capturedAt) ?? 0;
        return rightTime - leftTime;
      });
    const latestPhotoUri = allPhotos[0]?.thumbnailUri ?? null;

    const timelineDates: string[] = [];
    timelineDates.push(...feedback.map((item) => item.createdAt));
    timelineDates.push(...badges.map((item) => item.awardedAt));
    timelineDates.push(...media.map((item) => item.createdAt));
    const earliestDate =
      timelineDates
        .map((date) => ({ date, time: toTimestamp(date) }))
        .filter((entry): entry is { date: string; time: number } => entry.time !== null)
        .sort((left, right) => left.time - right.time)[0]?.date ?? new Date().toISOString();

    const currentLevel = progress?.currentLevel ?? { level: 1, name: 'Starting Out' };
    const positionalAttributes = position
      ? POSITION_SKILLS[position].map((skill) => ({
          key: skill
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          label: skill,
          icon: POSITION_SKILL_ICONS[skill] ?? 'ellipse-outline',
          value: toFifaScore(skillLookup[skill.toLowerCase()] ?? 1),
        }))
      : undefined;

    return {
      name: athleteName,
      levelNumber: currentLevel.level,
      levelName: currentLevel.name,
      tier: toCardTier(currentLevel.level),
      position,
      corners: {
        technical: cornerAverage(cornerBuckets.technical),
        physical: cornerAverage(cornerBuckets.physical),
        psychological: cornerAverage(cornerBuckets.psychological),
        social: cornerAverage(cornerBuckets.social),
      },
      attributes: positionalAttributes,
      memberSince: formatMemberSince(earliestDate),
      streakWeeks: streakInfo?.currentStreak ?? 0,
      totalSessions: progress?.totalSessions ?? 0,
      totalBadges: badges.length,
      bestSkill: bestSkill
        ? {
            name: bestSkill.skill,
            level: bestSkill.level,
          }
        : null,
      mostImproved:
        mostImproved && mostImproved.changePercent > 0
          ? {
              name: mostImproved.name,
              changePercent: mostImproved.changePercent,
            }
          : null,
      latestPhotoUri,
    };
  }, [athleteName, badges, feedback, media, position, progress, streakInfo?.currentStreak]);
}
