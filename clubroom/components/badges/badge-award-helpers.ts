/**
 * BadgeAwardModal — Constants and helpers.
 */
import type { BadgeDefinition } from '@/constants/types';

export const BADGE_REASONS = ['Leadership', 'Consistency', 'Technique', 'Mindset', 'Teamwork', 'Resilience'];

export const QUICK_NOTES = [
  'Great effort today!',
  'Showed real improvement.',
  'Fantastic attitude.',
  'Keep it up!',
];

const BADGE_ICON_MAP: Record<string, string> = {
  'badge_best_training': 'trophy',
  'badge_sharp_shooter_pro': 'flame',
  'badge_master_passer': 'people',
  'badge_iron_defender': 'shield',
  'badge_playmaker': 'sparkles',
};

export function getBadgeIcon(badge: BadgeDefinition): string {
  return BADGE_ICON_MAP[badge.id] || 'ribbon';
}
