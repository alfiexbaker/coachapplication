import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { apiClient } from '@/services/api-client';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';
import type { PositionRole } from '@/types/progress-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressPositionService');

export interface PositionHistoryEntry {
  sessionId: string;
  athleteId: string;
  position: PositionRole;
  recordedAt: string;
}

type PositionHistoryStore = Record<string, PositionHistoryEntry[]>;

async function getPositionStore(): Promise<PositionHistoryStore> {
  return apiClient.get<PositionHistoryStore>(STORAGE_KEYS.POSITION_HISTORY, {});
}

async function savePositionStore(store: PositionHistoryStore): Promise<void> {
  await apiClient.set(STORAGE_KEYS.POSITION_HISTORY, store);
}

export async function recordPosition(
  sessionId: string,
  athleteId: string,
  position: PositionRole,
): Promise<Result<PositionHistoryEntry, ServiceError>> {
  try {
    const store = await getPositionStore();
    const existing = store[athleteId] ?? [];
    const now = new Date().toISOString();

    const nextEntry: PositionHistoryEntry = {
      sessionId,
      athleteId,
      position,
      recordedAt: now,
    };

    const withoutSession = existing.filter((entry) => entry.sessionId !== sessionId);
    store[athleteId] = [nextEntry, ...withoutSession]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 100);

    await savePositionStore(store);

    emitTyped(ServiceEvents.POSITION_RECORDED, {
      sessionId,
      athleteId,
      position,
    });

    logger.info('position_recorded', {
      athleteId,
      sessionId,
      position,
      totalHistoryEntries: store[athleteId].length,
    });

    return ok(nextEntry);
  } catch (error) {
    logger.error('Failed to record athlete position', {
      athleteId,
      sessionId,
      position,
      error,
    });
    return err(storageError('Failed to record athlete position'));
  }
}

export async function getPositionHistory(
  athleteId: string,
  limit?: number,
): Promise<Result<PositionHistoryEntry[], ServiceError>> {
  try {
    const store = await getPositionStore();
    const history = (store[athleteId] ?? [])
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    if (typeof limit === 'number' && limit > 0) {
      return ok(history.slice(0, limit));
    }

    return ok(history);
  } catch (error) {
    logger.error('Failed to load position history', { athleteId, error });
    return err(storageError('Failed to load position history'));
  }
}

export async function getMostPlayedPosition(
  athleteId: string,
): Promise<Result<PositionRole | null, ServiceError>> {
  const historyResult = await getPositionHistory(athleteId);
  if (!historyResult.success) {
    return historyResult;
  }

  const history = historyResult.data;
  if (history.length === 0) {
    return ok(null);
  }

  const counts = history.reduce<Record<PositionRole, number>>(
    (acc, entry) => {
      acc[entry.position] += 1;
      return acc;
    },
    { GK: 0, DEF: 0, MID: 0, ATT: 0 },
  );

  const sorted = (Object.entries(counts) as Array<[PositionRole, number]>).sort(
    (a, b) => b[1] - a[1],
  );

  const topCount = sorted[0]?.[1] ?? 0;
  const leaders = sorted.filter(([, count]) => count === topCount).map(([position]) => position);

  if (leaders.length === 1) {
    return ok(leaders[0]);
  }

  // Tie-breaker: latest played among top positions.
  const latestLeader = history.find((entry) => leaders.includes(entry.position));
  return ok(latestLeader?.position ?? leaders[0] ?? null);
}

export const progressPositionService = {
  recordPosition,
  getPositionHistory,
  getMostPlayedPosition,
};
