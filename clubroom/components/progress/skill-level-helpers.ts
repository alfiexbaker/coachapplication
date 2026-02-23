import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillRatingLevel, SkillTrendDirection } from '@/types/progress-types';
import { mapSkillToCorner } from '@/constants/position-skills';

// ─── Constants ──────────────────────────────────────────────────────────────

export const CATEGORY_ORDER = ['Technical', 'Physical', 'Psychological', 'Social', 'Other'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function levelToDots(level: number): 1 | 2 | 3 | 4 | 5 {
  // Storage is always 1-10 scale — convert to 1-5 dots
  return Math.max(1, Math.min(5, Math.ceil(level / 2))) as 1 | 2 | 3 | 4 | 5;
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
    Developing: 'Building foundations',
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
  return 'Other';
}

export function getSkillColor(level: number, palette: ThemeColors): string {
  // Thresholds match label boundaries: 1-2=Developing, 3-4=Good, 5-6=VeryGood, 7-8=Excellent, 9-10=Exceptional
  if (level >= 9) return palette.success;    // Exceptional
  if (level >= 7) return palette.tint;       // Excellent
  if (level >= 5) return palette.rating;     // Very Good
  if (level >= 3) return palette.muted;      // Good
  return palette.warning;                    // Developing
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
