import type { CardTier } from '@/types/progress-types';

interface TierConfig {
  gradient: [string, string];
  accent: string;
  overlay: string;
}

export const PLAYER_CARD_TIER_CONFIG: Record<CardTier, TierConfig> = {
  bronze: {
    gradient: ['#101A2E', '#2A425B'],
    accent: '#C9904E',
    overlay: '#08101D',
  },
  silver: {
    gradient: ['#0F1A2E', '#32475D'],
    accent: '#A5B4C3',
    overlay: '#08101D',
  },
  gold: {
    gradient: ['#111B30', '#2D445F'],
    accent: '#D9B160',
    overlay: '#08111D',
  },
  platinum: {
    gradient: ['#0D1930', '#245071'],
    accent: '#69ABE4',
    overlay: '#07101C',
  },
  diamond: {
    gradient: ['#0E192C', '#20556A'],
    accent: '#78D5DB',
    overlay: '#06101A',
  },
};
