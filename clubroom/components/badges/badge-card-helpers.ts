import { Ionicons } from '@expo/vector-icons';

import type { BadgeType } from '@/services/badge-service';

export const BADGE_TYPE_ICONS: Record<BadgeType, keyof typeof Ionicons.glyphMap> = {
  skill: 'ribbon',
  milestone: 'trophy',
  streak: 'flame',
  event: 'star',
};

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  technical: 'football',
  physical: 'fitness',
  psychological: 'bulb',
  social: 'people',
};

export function getTierColor(tier: 1 | 2 | 3 | undefined, fallback: string): string {
  switch (tier) {
    case 3:
      return '#FFD700';
    case 2:
      return '#C0C0C0';
    case 1:
      return '#CD7F32';
    default:
      return fallback;
  }
}

export function formatBadgeDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
