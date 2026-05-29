/**
 * Progress Inference Service
 *
 * Pure computation — no storage keys, no side effects.
 * Reads existing feedback/skills/badges and returns derived narratives.
 * Coach taps 4 dots + writes 1 sentence → system generates a full development story.
 */

import { mapSkillToCorner } from '@/constants/position-skills';
import type { SessionFeedback } from './progress-feedback-service';
import type { SkillLevel } from './progress-skills-service';
import type { FourCornerKey } from '@/types/progress-types';
import type { BadgeAward, Goal } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressInferenceService');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesText(source: string, needle: string): boolean {
  return needle.length === 0 || new RegExp(escapeRegExp(needle)).test(source);
}

// ─── Types ───

export interface CoachFocusNarrative {
  coachName: string;
  focusCorner: FourCornerKey;
  focusLabel: string;
  consecutiveSessions: number;
  narrative: string;
}

export interface SkillTrajectory {
  skill: string;
  corner: FourCornerKey;
  trend: 'improving' | 'consistent' | 'steady' | 'declining';
  currentLevel: number;
  eightWeekDelta: number;
  predictedNextLevel: number | null;
  predictedWeeks: number | null;
}

export interface GoalAlignment {
  goalId: string;
  goalTitle: string;
  matchingCorner: FourCornerKey;
  matchingSkills: string[];
  narrative: string;
}

export interface WeeklyRecap {
  headline: string;
  highlights: string[];
  cornerImprovements: { corner: FourCornerKey; label: string; delta: number }[];
  nextFocusSuggestion: string;
}

export interface SessionPattern {
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  consistencyScore: number; // 0-100
  preferredDay: string | null;
  averageGapDays: number;
}

// ─── Corner label mapping ───

const CORNER_LABELS: Record<FourCornerKey, string> = {
  technical: 'Technical',
  physical: 'Physical',
  psychological: 'Psychological',
  social: 'Social',
};

// ─── Inference Functions ───

/**
 * Analyzes which corners coach emphasizes across sessions.
 * Generates: "Coach Marcus is building your Technical foundation — 3 of your last 4 sessions focused here"
 */
export function inferCoachFocus(feedback: SessionFeedback[]): CoachFocusNarrative | null {
  if (feedback.length < 2) {
    return null;
  }

  const sorted = Array.from(feedback).toSorted(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const recent = sorted.slice(0, 6);

  // Count corner emphasis from fourCorners ratings
  const cornerCounts: Record<FourCornerKey, number> = {
    technical: 0,
    physical: 0,
    psychological: 0,
    social: 0,
  };

  for (const entry of recent) {
    if (!entry.fourCorners) {
      continue;
    }

    // Find the highest-rated corner in this session
    let maxCorner: FourCornerKey = 'technical';
    let maxValue = 0;
    for (const key of Object.keys(entry.fourCorners) as FourCornerKey[]) {
      if (entry.fourCorners[key] > maxValue) {
        maxValue = entry.fourCorners[key];
        maxCorner = key;
      }
    }
    cornerCounts[maxCorner]++;
  }

  // Also count from skillsWorkedOn
  for (const entry of recent) {
    for (const skill of entry.skillsWorkedOn) {
      const corner = mapSkillToCorner(skill);
      cornerCounts[corner] += 0.5;
    }
  }

  const entries = Object.entries(cornerCounts) as [FourCornerKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topCorner, topCount] = entries[0];

  if (topCount < 2) {
    return null;
  }

  const coachName = recent[0].coachName;
  const consecutiveSessions = Math.min(Math.round(topCount), recent.length);
  const focusLabel = CORNER_LABELS[topCorner];

  return {
    coachName,
    focusCorner: topCorner,
    focusLabel,
    consecutiveSessions,
    narrative: `Coach ${coachName} is building your ${focusLabel} foundation — ${consecutiveSessions} of your last ${recent.length} sessions focused here`,
  };
}

/**
 * For each skill with 3+ history entries: 8-week trend, predicted next level date.
 */
export function inferSkillTrajectories(skills: SkillLevel[]): SkillTrajectory[] {
  const trajectories: SkillTrajectory[] = [];

  for (const skill of skills) {
    if (!skill.history || skill.history.length < 3) {
      continue;
    }

    const corner = mapSkillToCorner(skill.skill);
    const sortedHistory = Array.from(skill.history).toSorted(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 60 * 60 * 1000;
    const recentHistory = sortedHistory.filter(
      (h) => new Date(h.date).getTime() >= eightWeeksAgo,
    );

    const first = recentHistory[0]?.level ?? skill.level;
    const last = recentHistory[recentHistory.length - 1]?.level ?? skill.level;
    const eightWeekDelta = last - first;

    let predictedNextLevel: number | null = null;
    let predictedWeeks: number | null = null;

    if (eightWeekDelta > 0 && sortedHistory.length >= 2) {
      // Calculate rate of improvement per week
      const firstDate = new Date(sortedHistory[0].date).getTime();
      const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date).getTime();
      const weeksBetween = Math.max(1, (lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000));
      const ratePerWeek = (last - sortedHistory[0].level) / weeksBetween;

      if (ratePerWeek > 0 && skill.level < 10) {
        const nextLevel = Math.min(10, Math.ceil(skill.level + 1));
        const levelsToGo = nextLevel - skill.level;
        predictedWeeks = Math.ceil(levelsToGo / ratePerWeek);
        predictedNextLevel = nextLevel;
      }
    }

    trajectories.push({
      skill: skill.skill,
      corner,
      trend: skill.trend,
      currentLevel: skill.level,
      eightWeekDelta,
      predictedNextLevel,
      predictedWeeks,
    });
  }

  return trajectories;
}

/**
 * Auto-links feedback to active goals.
 */
export function inferGoalAlignment(
  feedback: SessionFeedback[],
  goals: Goal[],
): GoalAlignment[] {
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  if (activeGoals.length === 0 || feedback.length === 0) {
    return [];
  }

  const alignments: GoalAlignment[] = [];

  for (const goal of activeGoals) {
    const goalTitle = goal.title.toLowerCase();
    const matchingSkills: string[] = [];
    let matchingCorner: FourCornerKey | null = null;

    // Match by skill name overlap in recent feedback
    const goalFirstWord = goalTitle.split(' ')[0];
    for (const entry of feedback.slice(0, 5)) {
      for (const skill of entry.skillsWorkedOn) {
        const normalizedSkill = skill.toLowerCase();
        if (
          includesText(goalTitle, normalizedSkill) ||
          includesText(normalizedSkill, goalFirstWord)
        ) {
          matchingSkills.push(skill);
          matchingCorner = mapSkillToCorner(skill);
        }
      }
    }

    // Match by category/corner keywords
    if (!matchingCorner) {
      for (const corner of Object.keys(CORNER_LABELS) as FourCornerKey[]) {
        if (
          includesText(goalTitle, corner) ||
          includesText(goalTitle, CORNER_LABELS[corner].toLowerCase())
        ) {
          matchingCorner = corner;
          break;
        }
      }
    }

    if (matchingCorner && matchingSkills.length > 0) {
      const uniqueSkills = [...new Set(matchingSkills)];
      alignments.push({
        goalId: goal.id,
        goalTitle: goal.title,
        matchingCorner,
        matchingSkills: uniqueSkills,
        narrative: `Your ${CORNER_LABELS[matchingCorner]} feedback matches your "${goal.title}" goal`,
      });
    }
  }

  return alignments;
}

/**
 * Auto-generates weekly recap: headline, highlights, corner improvements, next focus.
 */
export function inferWeeklyRecap(
  feedback: SessionFeedback[],
  badges: BadgeAward[],
  skills: SkillLevel[],
): WeeklyRecap | null {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const weekFeedback = feedback.filter(
    (f) => new Date(f.createdAt).getTime() >= oneWeekAgo,
  );
  const weekBadges = badges.filter(
    (b) => new Date(b.awardedAt).getTime() >= oneWeekAgo,
  );

  if (weekFeedback.length === 0) {
    return null;
  }

  // Headline
  const headline = weekFeedback.length === 1
    ? `${weekFeedback.length} session this week`
    : `${weekFeedback.length} sessions this week`;

  // Highlights
  const highlights: string[] = [];
  if (weekFeedback.length > 0) {
    highlights.push(`${weekFeedback.length} coach feedback${weekFeedback.length > 1 ? 's' : ''} received`);
  }
  if (weekBadges.length > 0) {
    highlights.push(`${weekBadges.length} badge${weekBadges.length > 1 ? 's' : ''} earned`);
  }

  // Corner improvements
  const cornerImprovements: WeeklyRecap['cornerImprovements'] = [];
  const improvingSkills = skills.filter((s) => s.trend === 'improving');
  const cornerDeltas: Partial<Record<FourCornerKey, number>> = {};

  for (const skill of improvingSkills) {
    const corner = mapSkillToCorner(skill.skill);
    const delta = skill.level - (skill.previousLevel ?? skill.level);
    if (delta > 0) {
      cornerDeltas[corner] = (cornerDeltas[corner] ?? 0) + delta;
    }
  }

  for (const [corner, delta] of Object.entries(cornerDeltas) as [FourCornerKey, number][]) {
    cornerImprovements.push({
      corner,
      label: CORNER_LABELS[corner],
      delta,
    });
  }

  // Next focus suggestion
  const lowestCorner = skills.length > 0
    ? (Object.keys(CORNER_LABELS) as FourCornerKey[]).reduce((lowest, corner) => {
        const cornerSkills = skills.filter((s) => mapSkillToCorner(s.skill) === corner);
        const avg = cornerSkills.length > 0
          ? cornerSkills.reduce((sum, s) => sum + s.level, 0) / cornerSkills.length
          : 0;
        const lowestSkills = skills.filter((s) => mapSkillToCorner(s.skill) === lowest);
        const lowestAvg = lowestSkills.length > 0
          ? lowestSkills.reduce((sum, s) => sum + s.level, 0) / lowestSkills.length
          : 0;
        return avg < lowestAvg ? corner : lowest;
      })
    : 'technical';

  const nextFocusSuggestion = `Focus on ${CORNER_LABELS[lowestCorner]} development next week`;

  return {
    headline,
    highlights,
    cornerImprovements,
    nextFocusSuggestion,
  };
}

/**
 * Detects cadence, consistency score, preferred training day.
 */
export function inferSessionPatterns(feedback: SessionFeedback[]): SessionPattern {
  if (feedback.length < 2) {
    return {
      cadence: 'irregular',
      consistencyScore: 0,
      preferredDay: null,
      averageGapDays: 0,
    };
  }

  const sorted = Array.from(feedback).toSorted(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Calculate gaps between sessions
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].createdAt).getTime();
    const curr = new Date(sorted[i].createdAt).getTime();
    gaps.push((curr - prev) / (24 * 60 * 60 * 1000));
  }

  const averageGapDays = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

  // Determine cadence
  let cadence: SessionPattern['cadence'] = 'irregular';
  if (averageGapDays <= 9) cadence = 'weekly';
  else if (averageGapDays <= 18) cadence = 'biweekly';
  else if (averageGapDays <= 35) cadence = 'monthly';

  // Consistency score: how regular are the gaps?
  const gapVariance = gaps.reduce((sum, g) => sum + Math.pow(g - averageGapDays, 2), 0) / gaps.length;
  const gapStdDev = Math.sqrt(gapVariance);
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - gapStdDev * 5)));

  // Preferred day
  const dayCounts = new Map<string, number>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const entry of sorted) {
    const day = dayNames[new Date(entry.createdAt).getDay()];
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  let preferredDay: string | null = null;
  let maxCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      preferredDay = day;
    }
  }

  return {
    cadence,
    consistencyScore,
    preferredDay,
    averageGapDays: Math.round(averageGapDays * 10) / 10,
  };
}

export const progressInferenceService = {
  inferCoachFocus,
  inferSkillTrajectories,
  inferGoalAlignment,
  inferWeeklyRecap,
  inferSessionPatterns,
};
