import type { BadgeCategory, BadgeTier } from './types';

export interface ProgressionLevel {
  level: number;
  name: string;
  pointsRequired: number;
}

export interface CategoryMilestone {
  name: string;
  badgesRequired: number;
}

export const ProgressionThresholds = {
  levels: [
    { level: 1, name: 'Starting Out', pointsRequired: 0 },
    { level: 2, name: 'Progressing', pointsRequired: 50 },
    { level: 3, name: 'Established', pointsRequired: 150 },
    { level: 4, name: 'Advanced', pointsRequired: 300 },
    { level: 5, name: 'Elite', pointsRequired: 500 },
  ] as ProgressionLevel[],
  categoryMilestones: {
    foundation: 3,
    developing: 7,
    advanced: 15,
  } as Record<string, number>,
} as const;

// Point values for each tier (internal — not shown in UI)
export const TierPointValues: Record<BadgeTier, number> = {
  1: 10,   // Foundation
  2: 25,   // Developing
  3: 50,   // Advanced
};

// Tier display names
export const TierNames: Record<BadgeTier, string> = {
  1: 'Foundation',
  2: 'Developing',
  3: 'Advanced',
};

// FA Four Corners — category display names and icons
export const CategoryInfo: Record<BadgeCategory, { label: string; icon: string }> = {
  technical: { label: 'Technical', icon: 'football' },
  physical: { label: 'Physical', icon: 'fitness' },
  psychological: { label: 'Psychological', icon: 'bulb' },
  social: { label: 'Social', icon: 'people' },
};

// Helper function to get current level from points
export function getLevelFromPoints(points: number): ProgressionLevel {
  const levels = ProgressionThresholds.levels;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].pointsRequired) {
      return levels[i];
    }
  }
  return levels[0];
}

// Helper function to get next level and progress
export function getProgressToNextLevel(points: number): {
  currentLevel: ProgressionLevel;
  nextLevel: ProgressionLevel | null;
  progressPercent: number;
  pointsToNext: number;
} {
  const currentLevel = getLevelFromPoints(points);
  const levels = ProgressionThresholds.levels;
  const currentIndex = levels.findIndex(l => l.level === currentLevel.level);
  const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      pointsToNext: 0,
    };
  }

  const pointsInCurrentLevel = points - currentLevel.pointsRequired;
  const pointsNeededForNextLevel = nextLevel.pointsRequired - currentLevel.pointsRequired;
  const progressPercent = Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
  const pointsToNext = nextLevel.pointsRequired - points;

  return {
    currentLevel,
    nextLevel,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    pointsToNext,
  };
}

// Helper function to get category milestone status
export function getCategoryMilestoneStatus(badgeCount: number): {
  currentMilestone: string;
  nextMilestone: string | null;
  badgesToNext: number;
  progressPercent: number;
} {
  const milestones = ProgressionThresholds.categoryMilestones;

  if (badgeCount >= milestones.advanced) {
    return {
      currentMilestone: 'Advanced',
      nextMilestone: null,
      badgesToNext: 0,
      progressPercent: 100,
    };
  }

  if (badgeCount >= milestones.developing) {
    return {
      currentMilestone: 'Developing',
      nextMilestone: 'Advanced',
      badgesToNext: milestones.advanced - badgeCount,
      progressPercent: Math.round(((badgeCount - milestones.developing) / (milestones.advanced - milestones.developing)) * 100),
    };
  }

  if (badgeCount >= milestones.foundation) {
    return {
      currentMilestone: 'Foundation',
      nextMilestone: 'Developing',
      badgesToNext: milestones.developing - badgeCount,
      progressPercent: Math.round(((badgeCount - milestones.foundation) / (milestones.developing - milestones.foundation)) * 100),
    };
  }

  return {
    currentMilestone: 'None',
    nextMilestone: 'Foundation',
    badgesToNext: milestones.foundation - badgeCount,
    progressPercent: Math.round((badgeCount / milestones.foundation) * 100),
  };
}
