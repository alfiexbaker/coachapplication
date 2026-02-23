/**
 * Skill radar helpers — constants and utility functions.
 */
import { Dimensions } from 'react-native';
import { Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const RADAR_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 260);
export const CENTER = RADAR_SIZE / 2;
export const RADIUS = RADAR_SIZE / 2 - 45;

export const SKILL_COLORS = {
  developing: '#F59E0B',
  good: '#3B82F6',
  veryGood: '#10B981',
  excellent: '#8B5CF6',
  exceptional: '#EC4899',
} as const;

/** Maps 0-100 analytics scale to a color. Boundaries align with stored 1-10 × 10. */
export function getSkillColor(level: number): string {
  if (level <= 20) return SKILL_COLORS.developing;
  if (level <= 40) return SKILL_COLORS.good;
  if (level <= 60) return SKILL_COLORS.veryGood;
  if (level <= 80) return SKILL_COLORS.excellent;
  return SKILL_COLORS.exceptional;
}

/** Maps 0-100 analytics scale to canonical label (matches RATING_LABELS). Boundaries align with stored 1-10 × 10. */
export function getSkillLabel(level: number): string {
  if (level <= 20) return 'Developing';
  if (level <= 40) return 'Good';
  if (level <= 60) return 'Very Good';
  if (level <= 80) return 'Excellent';
  return 'Exceptional';
}

export function getPosition(index: number, level: number, numSkills: number): { x: number; y: number } {
  const angleStep = (2 * Math.PI) / numSkills;
  const angle = angleStep * index - Math.PI / 2;
  const r = (level / 100) * RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}
