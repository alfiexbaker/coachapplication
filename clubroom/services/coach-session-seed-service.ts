import type { Session } from '@/constants/app-types';
import { buildCoachSessionSeeds } from '@/constants/coach-session-seeds';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachSessionSeedService');
const ENABLE_COACH_SESSION_DEMO_SEED =
  process.env.EXPO_PUBLIC_ENABLE_COACH_SESSION_DEMO_SEED === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_COACH_SESSION_DEMO_SEED === '1' ||
  process.env.NODE_ENV === 'test';

export async function ensureCoachSessionsSeeded(): Promise<Session[]> {
  try {
    const existing = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    if (existing.length > 0) return existing;
    if (!ENABLE_COACH_SESSION_DEMO_SEED) return existing;

    await ensureRelationalDemoSeeded();

    const seeds = buildCoachSessionSeeds();
    await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, seeds);
    logger.info('coach_sessions_seeded', { count: seeds.length });
    return seeds;
  } catch (error) {
    logger.error('failed_to_seed_coach_sessions', error);
    return [];
  }
}
