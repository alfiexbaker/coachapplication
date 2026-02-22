import type { BadgeCategory } from '@/constants/user-types';

/**
 * Corner color tokens used by progress visualizations.
 * Skill-to-corner classification now lives in constants/position-skills.ts.
 */
export const CORNER_COLORS: Record<BadgeCategory, string> = {
  technical: '#10B981',
  physical: '#3B82F6',
  psychological: '#F59E0B',
  social: '#8B5CF6',
};
