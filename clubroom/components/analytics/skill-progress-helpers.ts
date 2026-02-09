/**
 * Skill Progress — Shared constants and helpers.
 */
import { Ionicons } from '@expo/vector-icons';

// Decorative: skill level categorical colors (not themeable)
export const SKILL_LEVEL_COLORS = {
  beginner: '#F59E0B',
  developing: '#3B82F6',
  proficient: '#10B981',
  advanced: '#8B5CF6',
  expert: '#EC4899',
} as const;

export function getSkillLevelInfo(level: number): { label: string; color: string } {
  if (level < 20) return { label: 'Beginner', color: SKILL_LEVEL_COLORS.beginner };
  if (level < 40) return { label: 'Developing', color: SKILL_LEVEL_COLORS.developing };
  if (level < 60) return { label: 'Proficient', color: SKILL_LEVEL_COLORS.proficient };
  if (level < 80) return { label: 'Advanced', color: SKILL_LEVEL_COLORS.advanced };
  return { label: 'Expert', color: SKILL_LEVEL_COLORS.expert };
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
