/**
 * Skill Progress — Shared constants and helpers.
 */
import { Ionicons } from '@expo/vector-icons';

// Decorative: skill level categorical colors (not themeable).
// Keys match canonical RATING_LABELS from constants/position-skills.ts.
export const SKILL_LEVEL_COLORS = {
  developing: '#F59E0B',
  good: '#3B82F6',
  veryGood: '#10B981',
  excellent: '#8B5CF6',
  exceptional: '#EC4899',
} as const;

/** Maps 0-100 analytics scale to canonical label + color. Boundaries align with stored 1-10 × 10. */
export function getSkillLevelInfo(level: number): { label: string; color: string } {
  if (level <= 20) return { label: 'Developing', color: SKILL_LEVEL_COLORS.developing };
  if (level <= 40) return { label: 'Good', color: SKILL_LEVEL_COLORS.good };
  if (level <= 60) return { label: 'Very Good', color: SKILL_LEVEL_COLORS.veryGood };
  if (level <= 80) return { label: 'Excellent', color: SKILL_LEVEL_COLORS.excellent };
  return { label: 'Exceptional', color: SKILL_LEVEL_COLORS.exceptional };
}

export function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Technical: 'football',
    Physical: 'fitness',
    Tactical: 'bulb',
    Mental: 'bulb',
    Dribbling: 'football',
    Passing: 'arrow-forward-circle',
    Defending: 'shield',
    Finishing: 'flag',
    Goalkeeping: 'hand-left',
    Conditioning: 'barbell',
  };
  return icons[category] || 'stats-chart';
}
