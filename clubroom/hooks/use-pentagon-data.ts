import { useMemo } from 'react';

import {
  POSITION_SKILLS,
  POSITION_SKILL_COLORS,
  POSITION_SKILL_ICONS,
  RATING_LABELS,
  UNIVERSAL_SKILLS,
} from '@/constants/position-skills';
import type { SessionFeedback, SkillLevel } from '@/services/progress-service';
import type {
  PentagonAttribute,
  PentagonData,
  PositionRole,
  SkillTrendDirection,
  UniversalSkillRating,
} from '@/types/progress-types';

interface PositionAvailability {
  role: PositionRole;
  sessionCount: number;
}

interface UsePentagonDataResult {
  pentagonData: PentagonData;
  availablePositions: PositionAvailability[];
  universalSkills: UniversalSkillRating[];
}

const MAX_RECENT_SNAPSHOTS = 5;
const COMPARISON_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

function toSkillKey(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function clampRating(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}

function toRatingFromLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  return clampRating(Math.ceil(level / 2));
}

function toTrend(trend: SkillLevel['trend'] | null | undefined): SkillTrendDirection {
  if (trend === 'improving') {
    return 'improving';
  }
  if (trend === 'declining') {
    return 'declining';
  }
  return 'consistent';
}

function formatShortDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Session';
  }
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function sortByCreatedAtDesc(left: { createdAt: string }, right: { createdAt: string }): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function buildSkillLevelMap(skills: SkillLevel[]): Map<string, SkillLevel> {
  return skills.reduce((map, entry) => {
    map.set(entry.skill.toLowerCase(), entry);
    return map;
  }, new Map<string, SkillLevel>());
}

function getSkillRating(
  feedback: SessionFeedback | undefined,
  skill: string,
): number | null {
  if (!feedback) {
    return null;
  }
  const match = feedback.skillRatings.find(
    (entry) => entry.skill.toLowerCase() === skill.toLowerCase(),
  );
  if (!match) {
    return null;
  }
  return clampRating(match.rating);
}

export function usePentagonData(
  skills: SkillLevel[],
  feedback: SessionFeedback[],
  position: PositionRole,
): UsePentagonDataResult {
  return useMemo(() => {
    const skillMap = buildSkillLevelMap(skills);
    const positionSkills = POSITION_SKILLS[position];

    const attributes: PentagonAttribute[] = positionSkills.map((skill) => {
      const levelEntry = skillMap.get(skill.toLowerCase());
      const level = Math.max(0, Math.min(10, Math.round(levelEntry?.level ?? 0)));
      const rating = toRatingFromLevel(level);
      return {
        key: toSkillKey(skill),
        label: skill,
        value: level * 10,
        rating,
        ratingLabel: RATING_LABELS[rating],
        trend: toTrend(levelEntry?.trend),
        color: POSITION_SKILL_COLORS[position][skill] ?? '#3B82F6',
        icon: POSITION_SKILL_ICONS[skill] ?? 'ellipse-outline',
      };
    });

    const universalSkills: UniversalSkillRating[] = UNIVERSAL_SKILLS.map((skill) => {
      const levelEntry = skillMap.get(skill.toLowerCase());
      const level = Math.max(0, Math.min(10, Math.round(levelEntry?.level ?? 0)));
      const rating = toRatingFromLevel(level);
      return {
        skill,
        rating,
        ratingLabel: RATING_LABELS[rating],
        trend: toTrend(levelEntry?.trend),
      };
    });

    const positionFeedback = feedback
      .filter((entry) => entry.positionPlayed === position && entry.skillRatings.length > 0)
      .sort(sortByCreatedAtDesc);

    const snapshots = positionFeedback
      .slice(0, MAX_RECENT_SNAPSHOTS)
      .reverse()
      .map((entry) => {
        const values = attributes.reduce<Record<string, number>>((acc, attribute) => {
          const rating = getSkillRating(entry, attribute.label);
          acc[attribute.key] = rating ? rating * 20 : 0;
          return acc;
        }, {});

        return {
          id: entry.id,
          label: formatShortDate(entry.createdAt),
          values,
        };
      });

    const currentValues = attributes.reduce<Record<string, number>>((acc, attribute) => {
      acc[attribute.key] = attribute.value;
      return acc;
    }, {});

    const latestSnapshot = snapshots[snapshots.length - 1];
    const shouldAppendCurrent =
      !latestSnapshot ||
      attributes.some(
        (attribute) =>
          Math.abs((latestSnapshot.values[attribute.key] ?? 0) - currentValues[attribute.key]) >= 1,
      );
    if (shouldAppendCurrent) {
      snapshots.push({
        id: 'current',
        label: 'Now',
        values: currentValues,
      });
    }

    const newestFeedback = positionFeedback[0];
    const comparisonTargetTimestamp = Date.now() - COMPARISON_WINDOW_MS;
    const comparisonFeedback =
      positionFeedback.find(
        (entry) => new Date(entry.createdAt).getTime() <= comparisonTargetTimestamp,
      ) ?? positionFeedback[positionFeedback.length - 1];

    const deltas = attributes.reduce<Record<string, number>>((acc, attribute) => {
      const currentRating = getSkillRating(newestFeedback, attribute.label);
      const previousRating = getSkillRating(comparisonFeedback, attribute.label);
      if (currentRating === null || previousRating === null) {
        acc[attribute.key] = 0;
      } else {
        acc[attribute.key] = currentRating - previousRating;
      }
      return acc;
    }, {});

    const comparisonLabel =
      newestFeedback && comparisonFeedback && newestFeedback.id !== comparisonFeedback.id
        ? formatShortDate(comparisonFeedback.createdAt)
        : null;

    const availablePositions = (['MID', 'DEF', 'GK', 'ATT'] as const)
      .map((role) => ({
        role,
        sessionCount: feedback.filter((entry) => entry.positionPlayed === role).length,
      }))
      .filter((entry) => entry.sessionCount > 0);

    if (availablePositions.length === 0) {
      availablePositions.push({ role: position, sessionCount: 0 });
    } else if (!availablePositions.some((entry) => entry.role === position)) {
      availablePositions.unshift({ role: position, sessionCount: 0 });
    }

    return {
      pentagonData: {
        position,
        attributes,
        universalSkills,
        deltas,
        sessionCount: positionFeedback.length,
        sessionSnapshots: snapshots,
        comparisonLabel,
      },
      availablePositions,
      universalSkills,
    };
  }, [feedback, position, skills]);
}
