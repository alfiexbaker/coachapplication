/**
 * BadgeAwardModal — Constants and helpers.
 */
import type { BadgeDefinition } from '@/constants/types';

export const BADGE_REASONS = [
  'Technical skill',
  'Physical effort',
  'Mental resilience',
  'Teamwork & communication',
  'Leadership',
  'Attitude & commitment',
];

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
  'badge_team_captain': 'megaphone',
  'badge_vocal_leader': 'chatbubbles',
  'badge_mentor': 'heart',
  'badge_growth_mindset': 'bulb',
  'badge_focused_athlete': 'eye',
  'badge_first_touch': 'football',
  'badge_streak_starter': 'calendar',
  'badge_dedicated_athlete': 'ribbon',
};

export function getBadgeIcon(badge: BadgeDefinition): string {
  return BADGE_ICON_MAP[badge.id] || 'ribbon';
}
