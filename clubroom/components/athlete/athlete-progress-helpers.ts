import type { RosterEntry } from '@/constants/types';

export type ProgressTrend = 'improving' | 'steady' | 'declining';

export interface SkillSummary {
  name: string;
  level: number;
  maxLevel: number;
  trend: ProgressTrend;
}

export interface GoalSummary {
  id: string;
  title: string;
  progress: number;
  dueDate?: string;
}

export interface BadgeSummary {
  id: string;
  name: string;
  icon: string;
  awardedAt: string;
}

export function getMockSkills(athlete: RosterEntry): SkillSummary[] {
  const focusMap: Record<string, SkillSummary[]> = {
    Finishing: [
      { name: 'Shooting', level: 7, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'First Touch', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Heading', level: 4, maxLevel: 10, trend: 'steady' },
    ],
    Passing: [
      { name: 'Short Passing', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Vision', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Through Balls', level: 4, maxLevel: 10, trend: 'improving' },
      { name: 'Crossing', level: 3, maxLevel: 10, trend: 'steady' },
    ],
    Defending: [
      { name: 'Tackling', level: 8, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 7, maxLevel: 10, trend: 'steady' },
      { name: 'Heading', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Interceptions', level: 7, maxLevel: 10, trend: 'improving' },
    ],
    Dribbling: [
      { name: 'Ball Control', level: 8, maxLevel: 10, trend: 'steady' },
      { name: 'Speed Dribble', level: 7, maxLevel: 10, trend: 'improving' },
      { name: 'Skill Moves', level: 6, maxLevel: 10, trend: 'steady' },
      { name: 'Close Control', level: 7, maxLevel: 10, trend: 'improving' },
    ],
    Goalkeeping: [
      { name: 'Shot Stopping', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Distribution', level: 4, maxLevel: 10, trend: 'improving' },
      { name: 'Commanding', level: 3, maxLevel: 10, trend: 'steady' },
    ],
    Conditioning: [
      { name: 'Speed', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Stamina', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Agility', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Strength', level: 4, maxLevel: 10, trend: 'steady' },
    ],
  };
  return (athlete.primaryFocus ? focusMap[athlete.primaryFocus] : undefined) || focusMap.Finishing;
}

export function getMockGoals(athlete: RosterEntry): GoalSummary[] {
  if (athlete.totalSessions < 5) return [];
  return [
    {
      id: 'g1',
      title: `Improve ${(athlete.primaryFocus || 'skills').toLowerCase()} accuracy`,
      progress: 0.65,
      dueDate: '2026-04-01',
    },
    {
      id: 'g2',
      title: 'Complete 10 sessions this quarter',
      progress: athlete.totalSessions > 20 ? 0.8 : 0.4,
    },
  ];
}

export function getMockBadges(athlete: RosterEntry): BadgeSummary[] {
  if (athlete.totalSessions < 10) return [];
  const badges: BadgeSummary[] = [
    { id: 'b1', name: '10 Sessions', icon: 'ribbon', awardedAt: '2025-12-15' },
  ];
  if (athlete.totalSessions >= 25) {
    badges.push({ id: 'b2', name: '25 Sessions', icon: 'trophy', awardedAt: '2026-01-05' });
  }
  if (athlete.totalSessions >= 50) {
    badges.push({ id: 'b3', name: 'Half Century', icon: 'star', awardedAt: '2025-10-20' });
  }
  return badges;
}
