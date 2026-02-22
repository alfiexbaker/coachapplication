import type { CardTier } from '@/types/progress-types';

export function toFifaScore(level: number): number {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return Math.min(99, Math.max(1, Math.round(20 + (clamped - 1) * 8.8)));
}

export function toCardTier(level: number): CardTier {
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  if (clamped === 1) return 'bronze';
  if (clamped === 2) return 'silver';
  if (clamped === 3) return 'gold';
  if (clamped === 4) return 'platinum';
  return 'diamond';
}
