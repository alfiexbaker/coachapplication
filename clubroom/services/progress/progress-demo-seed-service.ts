import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { BadgeAward, Goal, GoalMilestone } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import { progressGoalsService } from './progress-goals-service';
import type { SessionFeedback } from './progress-feedback-service';
import type { AthleteSkillLevels, SkillLevel } from './progress-skills-service';

const logger = createLogger('ProgressDemoSeedService');

const DAY_MS = 24 * 60 * 60 * 1000;

type DemoCoach = {
  id: string;
  name: string;
};

type JournalEntrySeed = {
  id: string;
  sessionId: string;
  athleteId: string;
  personalNotes: string;
  coachNotes?: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
};

const DEMO_COACHES: DemoCoach[] = [
  { id: 'coach1', name: 'Sarah Mitchell' },
  { id: 'coach2', name: 'Mike Thompson' },
  { id: 'coach3', name: 'David Roberts' },
];

const SKILL_NAMES = [
  'First Touch',
  'Passing',
  'Decision-Making',
  'Finishing',
  'Positioning',
  'Conditioning',
] as const;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function hashValue(input: string): number {
  return input.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function mergeById<T extends { id: string }>(existing: T[], seeded: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of seeded) {
    map.set(item.id, item);
  }
  for (const item of existing) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

function pickCoach(index: number): DemoCoach {
  return DEMO_COACHES[index % DEMO_COACHES.length];
}

function buildSeedFeedback(athleteId: string, athleteName: string): SessionFeedback[] {
  const base = hashValue(athleteId);
  const timelines = [2, 6, 12, 20];

  return timelines.map((days, index) => {
    const coach = pickCoach(index);
    const skillOne = SKILL_NAMES[index % SKILL_NAMES.length];
    const skillTwo = SKILL_NAMES[(index + 2) % SKILL_NAMES.length];
    const ratingOne = 3 + ((base + index) % 3);
    const ratingTwo = 3 + ((base + index + 1) % 3);

    return {
      id: `seed_progress_feedback_${athleteId}_${index + 1}`,
      sessionId: `seed_progress_session_${athleteId}_${index + 1}`,
      bookingId: `seed_progress_booking_${athleteId}_${index + 1}`,
      coachId: coach.id,
      coachName: coach.name,
      athleteId,
      athleteName,
      createdAt: daysAgo(days),
      publicSummary:
        index % 2 === 0
          ? 'Solid intent throughout the block. Keep scanning earlier before first touch.'
          : 'Good execution in high-tempo phases. Decision speed and body shape improved.',
      privateNotes:
        index % 2 === 0
          ? 'Maintain pressure triggers and first-reaction press.'
          : 'Build more repetitions under live pressure.',
      skillsWorkedOn: [skillOne, skillTwo],
      skillRatings: [
        {
          skill: skillOne,
          rating: ratingOne,
          previousRating: Math.max(1, ratingOne - 1),
        },
        {
          skill: skillTwo,
          rating: ratingTwo,
          previousRating: Math.max(1, ratingTwo - 1),
        },
      ],
      improvements: 'Quicker scanning before receiving and stronger off-ball movement.',
      homework: '15 minutes of first-touch and scan-before-receive reps, 3x this week.',
      effortRating: 3 + ((base + index + 2) % 3),
      overallPerformance: 3 + ((base + index + 1) % 3),
      videoClipUrls: [],
      visibility: 'athlete',
    };
  });
}

function buildSkillLevels(athleteId: string): AthleteSkillLevels {
  const base = hashValue(athleteId);
  const now = new Date().toISOString();
  const skills: Record<string, SkillLevel> = {};

  SKILL_NAMES.forEach((skill, index) => {
    const coach = pickCoach(index);
    const previousLevel = 3 + ((base + index) % 3);
    const level = Math.min(10, previousLevel + 1);

    skills[skill] = {
      skill,
      level,
      previousLevel,
      lastUpdated: now,
      updatedBy: coach.id,
      trend: 'improving',
      history: [
        { date: daysAgo(21), level: Math.max(1, previousLevel - 1), coachId: coach.id },
        { date: daysAgo(10), level: previousLevel, coachId: coach.id },
        { date: daysAgo(2), level, coachId: coach.id },
      ],
    };
  });

  return {
    athleteId,
    skills,
    lastUpdated: now,
  };
}

function buildGoalMilestones(
  goalId: string,
  titles: string[],
  completedCount: number,
): GoalMilestone[] {
  return titles.map((title, index) => ({
    id: `${goalId}_ms_${index + 1}`,
    goalId,
    title,
    isCompleted: index < completedCount,
    completedAt: index < completedCount ? daysAgo(7 - index) : undefined,
    order: index,
  }));
}

function buildSeedGoals(athleteId: string): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] {
  const tacticalGoalId = `seed_goal_${athleteId}_tactical`;
  const finishingGoalId = `seed_goal_${athleteId}_finishing`;
  const fitnessGoalId = `seed_goal_${athleteId}_fitness`;

  return [
    {
      userId: athleteId,
      athleteId,
      title: 'Improve Decision-Making Speed',
      description: 'Make faster and better choices during pressing and transition moments.',
      category: 'TACTICAL',
      targetDate: daysFromNow(60),
      status: 'ACTIVE',
      progress: 50,
      milestones: buildGoalMilestones(
        tacticalGoalId,
        ['Scan before receiving', 'Choose pass within two touches', 'Break first press consistently'],
        1,
      ),
      createdBy: 'COACH',
      createdById: 'coach1',
    },
    {
      userId: athleteId,
      athleteId,
      title: 'Increase Finishing Consistency',
      description: 'Convert high-quality chances with cleaner technique under pressure.',
      category: 'TECHNIQUE',
      targetDate: daysFromNow(45),
      status: 'ACTIVE',
      progress: 66,
      milestones: buildGoalMilestones(
        finishingGoalId,
        [
          'Hit target in 8/10 reps',
          'Finish from both feet in pattern drills',
          'Apply in small-sided game',
        ],
        2,
      ),
      createdBy: 'ATHLETE',
      createdById: athleteId,
    },
    {
      userId: athleteId,
      athleteId,
      title: 'Build Match Stamina',
      description: 'Sustain intensity across full-session conditioning blocks.',
      category: 'FITNESS',
      targetDate: daysFromNow(-15),
      status: 'COMPLETED',
      progress: 100,
      milestones: buildGoalMilestones(
        fitnessGoalId,
        ['Complete interval block', 'Recover heart rate faster', 'Finish final block at target pace'],
        3,
      ),
      createdBy: 'COACH',
      createdById: 'coach2',
    },
  ];
}

function buildSeedBadges(athleteId: string): BadgeAward[] {
  return [
    {
      id: `seed_badge_award_${athleteId}_consistency`,
      badgeId: 'badge_best_training',
      badgeLabel: 'Best Training Session',
      badgeTone: 'success',
      athleteId,
      coachId: 'coach1',
      sessionId: `seed_progress_session_${athleteId}_2`,
      reason: 'Excellent work-rate and communication in the session block.',
      note: 'Kept standards high for the whole group.',
      awardedBy: 'coach1',
      awardedAt: daysAgo(5),
      visibility: 'athlete',
      badgeCategory: 'consistency',
      badgeTier: 1,
      badgePointValue: 10,
    },
    {
      id: `seed_badge_award_${athleteId}_technique`,
      badgeId: 'badge_master_passer',
      badgeLabel: 'Master Passer',
      badgeTone: 'default',
      athleteId,
      coachId: 'coach2',
      sessionId: `seed_progress_session_${athleteId}_1`,
      reason: 'Consistently found high-value passes under pressure.',
      note: 'Great awareness and composure in tight spaces.',
      awardedBy: 'coach2',
      awardedAt: daysAgo(1),
      visibility: 'supporters',
      badgeCategory: 'technique',
      badgeTier: 2,
      badgePointValue: 25,
    },
  ];
}

function buildJournalEntries(athleteId: string): JournalEntrySeed[] {
  return [
    {
      id: `seed_journal_${athleteId}_1`,
      sessionId: `seed_progress_session_${athleteId}_1`,
      athleteId,
      personalNotes: 'Sharp session. Felt quicker finding the free pass after scanning.',
      coachNotes: 'Strong progress. Keep body shape open before receiving.',
      mood: 4,
      energyLevel: 4,
      createdAt: daysAgo(2),
    },
    {
      id: `seed_journal_${athleteId}_2`,
      sessionId: `seed_progress_session_${athleteId}_3`,
      athleteId,
      personalNotes: 'Work rate stayed high. Need cleaner first touch under pressure.',
      coachNotes: 'Good intensity. Add extra first-touch reps on weaker foot.',
      mood: 4,
      energyLevel: 3,
      createdAt: daysAgo(8),
    },
  ];
}

async function ensureFeedbackSeeded(athleteId: string, athleteName: string): Promise<void> {
  const allFeedback = await apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []);
  const hasAthleteFeedback = allFeedback.some((entry) => entry.athleteId === athleteId);
  if (hasAthleteFeedback) {
    return;
  }

  const seeded = buildSeedFeedback(athleteId, athleteName);
  const merged = mergeById(allFeedback, seeded).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, merged);
}

async function ensureSkillsSeeded(athleteId: string): Promise<void> {
  const allLevels = await apiClient.get<Record<string, AthleteSkillLevels>>(
    STORAGE_KEYS.SKILL_LEVELS,
    {},
  );
  const hasAthleteSkills =
    Boolean(allLevels[athleteId]) && Object.keys(allLevels[athleteId].skills).length > 0;
  if (hasAthleteSkills) {
    return;
  }

  const seeded = buildSkillLevels(athleteId);
  await apiClient.set(STORAGE_KEYS.SKILL_LEVELS, { ...allLevels, [athleteId]: seeded });
}

async function ensureGoalsSeeded(athleteId: string): Promise<void> {
  const current = await progressGoalsService.getGoalsForAthlete(athleteId);
  if (current.active.length + current.completed.length > 0) {
    return;
  }

  const goals = buildSeedGoals(athleteId);
  for (const goal of goals) {
    await progressGoalsService.createGoal(athleteId, goal, goal.createdBy, goal.createdById);
  }
}

async function ensureBadgesSeeded(athleteId: string): Promise<void> {
  const existingAthleteBadges = await badgeService.listAwardsForAthlete(athleteId);
  if (existingAthleteBadges.length > 0) {
    return;
  }

  const storedAwards = await apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []);
  const merged = mergeById(storedAwards, buildSeedBadges(athleteId)).sort(
    (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, merged);
}

async function ensureJournalSeeded(athleteId: string): Promise<void> {
  const stored = await apiClient.get<JournalEntrySeed[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
  const hasAthleteJournal = stored.some((entry) => entry.athleteId === athleteId);
  if (hasAthleteJournal) {
    return;
  }

  const merged = mergeById(stored, buildJournalEntries(athleteId)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, merged);
}

export async function ensureProgressDemoSeeded(
  athleteId: string,
  athleteName?: string,
): Promise<void> {
  if (!athleteId) {
    return;
  }

  const safeAthleteName = athleteName?.trim() || 'Athlete';

  try {
    await ensureFeedbackSeeded(athleteId, safeAthleteName);
    await ensureSkillsSeeded(athleteId);
    await ensureGoalsSeeded(athleteId);
    await ensureBadgesSeeded(athleteId);
    await ensureJournalSeeded(athleteId);
  } catch (error) {
    logger.error('failed_to_seed_progress_demo', { athleteId, error });
  }
}
