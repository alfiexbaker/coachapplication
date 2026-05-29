import { useState } from 'react';

import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { mapSkillToCorner } from '@/constants/position-skills';
import type { SkillLevel, SessionFeedback } from '@/services/progress-service';
import type { FourCornerDisplay, FourCornerKey } from '@/types/progress-types';

const CORNER_ORDER: FourCornerKey[] = ['technical', 'physical', 'psychological', 'social'];

const CORNER_LABELS: Record<FourCornerKey, string> = {
  technical: 'Technical',
  physical: 'Physical',
  psychological: 'Psychological',
  social: 'Social',
};

const CORNER_ICONS: Record<FourCornerKey, string> = {
  technical: 'football-outline',
  physical: 'fitness-outline',
  psychological: 'bulb-outline',
  social: 'people-outline',
};

export interface FourCornerData {
  corners: FourCornerDisplay[];
  skillsByCorner: Record<FourCornerKey, SkillLevel[]>;
  previousCornerValues: Record<FourCornerKey, number> | null;
  deltas: Record<FourCornerKey, number>;
  comparisonLabel: string | null;
  sessionSnapshots: Array<{
    id: string;
    label: string;
    values: Record<FourCornerKey, number>;
  }>;
}

function levelToCornerValue(levels: number[]): number {
  if (levels.length === 0) {
    return 0;
  }

  const averageLevel = levels.reduce((sum, value) => sum + value, 0) / levels.length;
  return Math.max(0, Math.min(100, Math.round(averageLevel * 10)));
}

function sortNewest(first: { createdAt: string }, second: { createdAt: string }): number {
  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

function formatComparisonDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return 'baseline';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function toSnapshotValues(
  source: { technical: number; physical: number; psychological: number; social: number },
): Record<FourCornerKey, number> {
  return {
    technical: source.technical * 20,
    physical: source.physical * 20,
    psychological: source.psychological * 20,
    social: source.social * 20,
  };
}

export function useFourCorners(
  skills: SkillLevel[],
  feedback: SessionFeedback[] = [],
): FourCornerData {
  const [comparisonTargetTimestamp] = useState(() => Date.now() - 28 * 24 * 60 * 60 * 1000);

  return (() => {
    const skillsByCorner: Record<FourCornerKey, SkillLevel[]> = {
      technical: [],
      physical: [],
      psychological: [],
      social: [],
    };

    for (const skill of skills) {
      const corner = mapSkillToCorner(skill.skill);
      skillsByCorner[corner].push(skill);
    }

    const corners: FourCornerDisplay[] = CORNER_ORDER.map((key) => {
      const cornerSkills = skillsByCorner[key];
      return {
        key,
        label: CORNER_LABELS[key],
        icon: CORNER_ICONS[key],
        value: levelToCornerValue(cornerSkills.map((skill) => skill.level)),
        skillCount: cornerSkills.length,
        color: CORNER_COLORS[key],
      };
    });

    const feedbackWithCorners = [...feedback]
      .filter((entry): entry is SessionFeedback & { fourCorners: NonNullable<SessionFeedback['fourCorners']> } => Boolean(entry.fourCorners))
      .sort(sortNewest);

    const newestFeedbackWithCorners = feedbackWithCorners[0];
    const comparisonFeedback = feedbackWithCorners.find(
      (entry) => new Date(entry.createdAt).getTime() <= comparisonTargetTimestamp,
    );
    const fallbackComparisonFeedback = feedbackWithCorners[feedbackWithCorners.length - 1];
    const comparisonAnchor = comparisonFeedback ?? fallbackComparisonFeedback;

    const previousCornerValues =
      newestFeedbackWithCorners &&
      comparisonAnchor &&
      newestFeedbackWithCorners.id !== comparisonAnchor.id &&
      comparisonAnchor.fourCorners
        ? toSnapshotValues(comparisonAnchor.fourCorners)
        : null;
    const comparisonLabel = previousCornerValues
      ? formatComparisonDate(comparisonAnchor.createdAt)
      : null;

    const sessionSnapshots = feedbackWithCorners
      .slice(0, 5)
      .reverse()
      .map((entry) => ({
        id: entry.id,
        label: formatComparisonDate(entry.createdAt),
        values: toSnapshotValues(entry.fourCorners),
      }));

    const currentValues: Record<FourCornerKey, number> = {
      technical: corners.find((corner) => corner.key === 'technical')?.value ?? 0,
      physical: corners.find((corner) => corner.key === 'physical')?.value ?? 0,
      psychological: corners.find((corner) => corner.key === 'psychological')?.value ?? 0,
      social: corners.find((corner) => corner.key === 'social')?.value ?? 0,
    };

    const latestSnapshot = sessionSnapshots[sessionSnapshots.length - 1];
    const shouldAppendCurrent =
      !latestSnapshot ||
      CORNER_ORDER.some(
        (key) => Math.abs((latestSnapshot.values[key] ?? 0) - currentValues[key]) >= 1,
      );

    if (shouldAppendCurrent && CORNER_ORDER.some((key) => currentValues[key] > 0)) {
      sessionSnapshots.push({
        id: 'current',
        label: 'Now',
        values: currentValues,
      });
    }

    // Compute deltas between current and previous corner values
    const deltas: Record<FourCornerKey, number> = {
      technical: 0,
      physical: 0,
      psychological: 0,
      social: 0,
    };

    if (previousCornerValues) {
      for (const corner of corners) {
        deltas[corner.key] = Math.round(corner.value - (previousCornerValues[corner.key] ?? 0));
      }
    }

    return {
      corners,
      skillsByCorner,
      previousCornerValues,
      deltas,
      comparisonLabel,
      sessionSnapshots,
    };
  })();
}
