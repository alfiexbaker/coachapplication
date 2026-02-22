/**
 * useCardCosmetics — Manages unlocked card borders/patterns.
 * Unlocked by badge tier progression.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useCardCosmetics');

export type CosmeticId =
  | 'default'
  | 'flame-border'
  | 'gold-trim'
  | 'holographic'
  | 'diamond-edge'
  | 'neon-pulse'
  | 'retro-stripe';

export interface CardCosmetic {
  id: CosmeticId;
  label: string;
  description: string;
  borderColors: [string, string];
  requiredBadges: number;
  unlocked: boolean;
}

const COSMETIC_DEFINITIONS: Omit<CardCosmetic, 'unlocked'>[] = [
  { id: 'default', label: 'Classic', description: 'Default card style', borderColors: ['#FFFFFF', '#FFFFFF'], requiredBadges: 0 },
  { id: 'flame-border', label: 'Flame', description: 'Fiery orange glow border', borderColors: ['#FF6B35', '#FFB347'], requiredBadges: 3 },
  { id: 'gold-trim', label: 'Gold Trim', description: 'Elegant gold edge', borderColors: ['#FFD700', '#DAA520'], requiredBadges: 5 },
  { id: 'holographic', label: 'Holographic', description: 'Shimmering rainbow edge', borderColors: ['#E040FB', '#00BCD4'], requiredBadges: 8 },
  { id: 'diamond-edge', label: 'Diamond', description: 'Crystal clear diamond border', borderColors: ['#B2EBF2', '#E1F5FE'], requiredBadges: 12 },
  { id: 'neon-pulse', label: 'Neon', description: 'Electric neon glow', borderColors: ['#00FF87', '#60EFFF'], requiredBadges: 15 },
  { id: 'retro-stripe', label: 'Retro', description: 'Classic retro stripes', borderColors: ['#FF4081', '#7C4DFF'], requiredBadges: 20 },
];

interface CosmeticsState {
  selectedId: CosmeticId;
  unlockedIds: CosmeticId[];
}

interface UseCardCosmeticsInput {
  athleteId: string | null;
  totalBadges: number;
}

interface UseCardCosmeticsResult {
  cosmetics: CardCosmetic[];
  selected: CardCosmetic;
  selectCosmetic: (id: CosmeticId) => Promise<void>;
}

export function useCardCosmetics({ athleteId, totalBadges }: UseCardCosmeticsInput): UseCardCosmeticsResult {
  const [state, setState] = useState<CosmeticsState>({
    selectedId: 'default',
    unlockedIds: ['default'],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!athleteId) return;

      const saved = await apiClient.get<CosmeticsState | null>(
        `${STORAGE_KEYS.CARD_COSMETICS}_${athleteId}`,
        null,
      );
      if (cancelled) return;

      if (saved) {
        setState(saved);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [athleteId]);

  const cosmetics = useMemo<CardCosmetic[]>(
    () =>
      COSMETIC_DEFINITIONS.map((def) => ({
        ...def,
        unlocked: totalBadges >= def.requiredBadges || state.unlockedIds.includes(def.id),
      })),
    [totalBadges, state.unlockedIds],
  );

  const selected = useMemo(
    () => cosmetics.find((c) => c.id === state.selectedId) ?? cosmetics[0],
    [cosmetics, state.selectedId],
  );

  const selectCosmetic = useCallback(
    async (id: CosmeticId) => {
      if (!athleteId) return;
      const cosmetic = cosmetics.find((c) => c.id === id);
      if (!cosmetic?.unlocked) return;

      const newState: CosmeticsState = {
        selectedId: id,
        unlockedIds: [...new Set([...state.unlockedIds, id])],
      };
      setState(newState);
      await apiClient.set(`${STORAGE_KEYS.CARD_COSMETICS}_${athleteId}`, newState);
      logger.info('Card cosmetic selected', { athleteId, cosmeticId: id });
    },
    [athleteId, cosmetics, state.unlockedIds],
  );

  return useMemo(
    () => ({ cosmetics, selected, selectCosmetic }),
    [cosmetics, selected, selectCosmetic],
  );
}
