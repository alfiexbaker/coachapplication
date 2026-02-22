import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillRatingLevel, SkillTrendDirection } from '@/types/progress-types';
import { POSITION_SKILLS, mapSkillToCorner } from '@/constants/position-skills';

// ─── Constants ──────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES: Record<string, string[]> = {
  Technical: Array.from(
    new Set(
      Object.values(POSITION_SKILLS).flatMap((skills) => skills),
    ),
  ),
  Physical: ['Work Rate'],
  Psychological: ['Attitude', 'Coachability'],
  Social: ['Communication'],
};

export const CATEGORY_ORDER = ['Technical', 'Physical', 'Psychological', 'Social', 'Other'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function levelToDots(level: number): 1 | 2 | 3 | 4 | 5 {
  const normalized = level <= 5 ? level : Math.round(level / 2);
  return Math.max(1, Math.min(5, Math.round(normalized))) as 1 | 2 | 3 | 4 | 5;
}

export function getSkillLabel(level: number): SkillRatingLevel {
  const dots = levelToDots(level);
  if (dots === 5) return 'Exceptional';
  if (dots === 4) return 'Excellent';
  if (dots === 3) return 'Very Good';
  if (dots === 2) return 'Good';
  return 'Developing';
}

export function getSkillLevelLabel(level: number): { label: SkillRatingLevel; description: string } {
  const label = getSkillLabel(level);
  const descriptionByLabel: Record<SkillRatingLevel, string> = {
    Developing: 'Needs more repetition',
    Good: 'Building consistency',
    'Very Good': 'Solid and reliable',
    Excellent: 'High quality execution',
    Exceptional: 'Top-level performance',
  };
  return { label, description: descriptionByLabel[label] };
}

export function getParentFriendlyTrend(trend: SkillTrendDirection | 'steady'): '↑' | '→' {
  if (trend === 'improving') {
    return '↑';
  }
  return '→';
}

export function getSkillCategory(skillName: string): string {
  const corner = mapSkillToCorner(skillName);
  if (corner === 'technical') return 'Technical';
  if (corner === 'physical') return 'Physical';
  if (corner === 'psychological') return 'Psychological';
  if (corner === 'social') return 'Social';
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some((s) => s.toLowerCase() === skillName.toLowerCase())) {
      return category;
    }
  }
  return 'Other';
}

export function getSkillColor(level: number, palette: ThemeColors): string {
  if (level >= 8) return palette.success;
  if (level >= 5) return palette.tint;
  if (level >= 3) return palette.warning;
  return palette.error;
}

export function formatLastUpdated(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}
