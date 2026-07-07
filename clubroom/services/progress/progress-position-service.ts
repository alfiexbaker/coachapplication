import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { apiClient, apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
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
type ApiSessionFeedback = {
  sessionId?: string | null;
  athleteId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  positionPlayed?: string | null;
  positionsPlayed?: string[] | null;
};
type ApiSessionFeedbackListResponse = {
  feedback: ApiSessionFeedback[];
};
const POSITION_ROLES = new Set<PositionRole>(['GK', 'DEF', 'MID', 'ATT']);
function toPositionRole(value: unknown): PositionRole | null {
  return typeof value === 'string' && POSITION_ROLES.has(value as PositionRole)
    ? (value as PositionRole)
    : null;
}
function positionsFromFeedback(feedback: ApiSessionFeedback): PositionRole[] {
  const positions =
    Array.isArray(feedback.positionsPlayed) && feedback.positionsPlayed.length > 0
      ? feedback.positionsPlayed
      : [feedback.positionPlayed];
  const seen = new Set<PositionRole>();
  return positions.reduce<PositionRole[]>((acc, value) => {
    const position = toPositionRole(value);
    if (position && !seen.has(position)) {
      seen.add(position);
      acc.push(position);
    }
    return acc;
  }, []);
}
async function resolvePositionApiAccess(
  athleteId: string,
): Promise<{ apiAthleteId: string; viewerRole: 'coach' | 'parent' | 'athlete'; headers: Record<string, string> }> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view athlete positions.');
  if (!currentUserResult.success) {
    throw new Error(currentUserResult.error.message);
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  const viewerRole =
    actingRole === 'coach' || actingRole === 'parent' || actingRole === 'athlete'
      ? actingRole
      : 'athlete';
  return {
    apiAthleteId,
    viewerRole,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  };
}
async function getApiPositionHistory(
  athleteId: string,
  limit?: number,
): Promise<Result<PositionHistoryEntry[], ServiceError>> {
  const access = await resolvePositionApiAccess(athleteId);
  const query = new URLSearchParams({ viewerRole: access.viewerRole });
  const result = await apiFetch<ApiSessionFeedbackListResponse>(
    `/v1/athletes/${encodeURIComponent(access.apiAthleteId)}/session-feedback?${query.toString()}`,
    { headers: access.headers },
  );
  if (!result.success) {
    return result;
  }
  const history = result.data.feedback
    .flatMap((feedback) => {
      const sessionId = feedback.sessionId;
      const recordedAt = feedback.updatedAt ?? feedback.createdAt;
      if (!sessionId || !recordedAt) {
        return [];
      }
      return positionsFromFeedback(feedback).map((position) => ({
        sessionId,
        athleteId: feedback.athleteId ?? athleteId,
        position,
        recordedAt,
      }));
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  if (typeof limit === 'number' && limit > 0) {
    return ok(history.slice(0, limit));
  }
  return ok(history);
}
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
    const now = new Date().toISOString();
    const nextEntry: PositionHistoryEntry = {
      sessionId,
      athleteId,
      position,
      recordedAt: now,
    };
    if (!apiClient.isMockMode) {
      logger.info('position_record_delegated_to_session_feedback', {
        athleteId,
        sessionId,
        position,
      });
      return ok(nextEntry);
    }
    const store = await getPositionStore();
    const existing = store[athleteId] ?? [];
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

/**
 * Record multiple positions for a single session (multi-position support).
 * Creates one history entry per position.
 */
export async function recordPositions(
  sessionId: string,
  athleteId: string,
  positions: PositionRole[],
): Promise<Result<PositionHistoryEntry[], ServiceError>> {
  const results = await Promise.all(
    positions.map((position) => recordPosition(sessionId, athleteId, position)),
  );
  const failedResult = results.find((result) => !result.success);
  if (failedResult && !failedResult.success) {
    return failedResult as unknown as Result<PositionHistoryEntry[], ServiceError>;
  }
  return ok(
    results.reduce<PositionHistoryEntry[]>((entries, result) => {
      if (result.success) {
        entries.push(result.data);
      }
      return entries;
    }, []),
  );
}
export async function getPositionHistory(
  athleteId: string,
  limit?: number,
): Promise<Result<PositionHistoryEntry[], ServiceError>> {
  try {
    if (!apiClient.isMockMode) {
      return await getApiPositionHistory(athleteId, limit);
    }
    const store = await getPositionStore();
    const history = (store[athleteId] ?? [])
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    if (typeof limit === 'number' && limit > 0) {
      return ok(history.slice(0, limit));
    }
    return ok(history);
  } catch (error) {
    logger.error('Failed to load position history', {
      athleteId,
      error,
    });
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
    {
      GK: 0,
      DEF: 0,
      MID: 0,
      ATT: 0,
    },
  );
  const sorted = (Object.entries(counts) as Array<[PositionRole, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  const topCount = sorted[0]?.[1] ?? 0;
  const leaders = sorted.flatMap((item) =>
    (([, count]) => count === topCount)(item) ? [(([position]) => position)(item)] : [],
  );
  if (leaders.length === 1) {
    return ok(leaders[0]);
  }

  // Tie-breaker: latest played among top positions.
  const latestLeader = history.find((entry) => leaders.includes(entry.position));
  return ok(latestLeader?.position ?? leaders[0] ?? null);
}
export const progressPositionService = {
  recordPosition,
  recordPositions,
  getPositionHistory,
  getMostPlayedPosition,
};
