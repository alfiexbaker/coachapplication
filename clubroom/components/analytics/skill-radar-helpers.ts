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
  beginner: '#F59E0B',
  developing: '#3B82F6',
  proficient: '#10B981',
  advanced: '#8B5CF6',
  expert: '#EC4899',
} as const;

export function getSkillColor(level: number): string {
  if (level < 20) return SKILL_COLORS.beginner;
  if (level < 40) return SKILL_COLORS.developing;
  if (level < 60) return SKILL_COLORS.proficient;
  if (level < 80) return SKILL_COLORS.advanced;
  return SKILL_COLORS.expert;
}

export function getSkillLabel(level: number): string {
  if (level < 20) return 'Beginner';
  if (level < 40) return 'Developing';
  if (level < 60) return 'Proficient';
  if (level < 80) return 'Advanced';
  return 'Expert';
}

export function getPosition(index: number, level: number, numSkills: number): { x: number; y: number } {
  const angleStep = (2 * Math.PI) / numSkills;
  const angle = angleStep * index - Math.PI / 2;
  const r = (level / 100) * RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}
