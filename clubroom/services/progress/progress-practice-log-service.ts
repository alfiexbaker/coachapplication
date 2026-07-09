import { STORAGE_KEYS } from '@/constants/storage-keys';
import { api } from '@/constants/config';
import { apiClient, apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressPracticeLogService');

export interface PracticeLogEntry {
  id: string;
  athleteId: string;
  dateKey: string; // YYYY-MM-DD
  minutes: number;
  createdAt: string;
  updatedAt?: string;
  note?: string;
}

export interface LogPracticeInput {
  athleteId: string;
  minutes: number;
  note?: string;
}

function toDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

interface ApiPracticeLogsResponse {
  logs: PracticeLogEntry[];
}

interface ApiTodayPracticeLogResponse {
  log: PracticeLogEntry | null;
}

interface ApiPracticeLogMutationResponse {
  log: PracticeLogEntry;
}

function isApiMode(): boolean {
  return !api.useMock;
}

async function resolvePracticeLogApiAccess(
  athleteId: string,
): Promise<Result<{ apiAthleteId: string; headers: Record<string, string> }, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to log practice.');
  if (!currentUserResult.success) {
    return err(currentUserResult.error);
  }
  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  return ok({
    apiAthleteId,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  });
}

async function getLogs(): Promise<PracticeLogEntry[]> {
  return apiClient.get<PracticeLogEntry[]>(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, []);
}

async function saveLogs(logs: PracticeLogEntry[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, logs);
}

async function listAthleteLogsResult(
  athleteId: string,
): Promise<Result<PracticeLogEntry[], ServiceError>> {
  if (!athleteId) {
    return ok([]);
  }
  if (isApiMode()) {
    const access = await resolvePracticeLogApiAccess(athleteId);
    if (!access.success) {
      logger.warn('practice_log_api_access_denied', { athleteId, error: access.error });
      return err(access.error);
    }
    const result = await apiFetch<ApiPracticeLogsResponse>(
      `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/practice-logs?limit=100`,
      {
        method: 'GET',
        headers: access.data.headers,
      },
    );
    if (!result.success) {
      logger.error('practice_log_api_list_failed', { athleteId, error: result.error });
      return err(result.error);
    }
    return ok(result.data.logs);
  }

  const logs = await getLogs();
  return ok(
    logs
      .filter((entry) => entry.athleteId === athleteId)
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey)),
  );
}

async function listAthleteLogs(athleteId: string): Promise<PracticeLogEntry[]> {
  const result = await listAthleteLogsResult(athleteId);
  if (result.success) {
    return result.data;
  }
  if (isApiMode()) {
    throw new Error(result.error.message);
  }
  logger.warn('practice_log_mock_list_failed', { athleteId, error: result.error });
  return [];
}

async function getTodayLog(athleteId: string): Promise<PracticeLogEntry | null> {
  if (isApiMode()) {
    const access = await resolvePracticeLogApiAccess(athleteId);
    if (!access.success) {
      logger.warn('practice_log_api_access_denied', { athleteId, error: access.error });
      throw new Error(access.error.message);
    }
    const result = await apiFetch<ApiTodayPracticeLogResponse>(
      `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/practice-logs/today`,
      {
        method: 'GET',
        headers: access.data.headers,
      },
    );
    if (!result.success) {
      logger.error('practice_log_api_today_failed', { athleteId, error: result.error });
      throw new Error(result.error.message);
    }
    return result.data.log;
  }

  const today = toDateKey();
  const logs = await listAthleteLogs(athleteId);
  return logs.find((entry) => entry.dateKey === today) ?? null;
}

async function logPractice(
  input: LogPracticeInput,
): Promise<Result<PracticeLogEntry, ServiceError>> {
  if (!input.athleteId) {
    return err(storageError('Missing athlete for practice log'));
  }

  const roundedMinutes = Math.max(1, Math.round(input.minutes));
  try {
    if (isApiMode()) {
      const access = await resolvePracticeLogApiAccess(input.athleteId);
      if (!access.success) {
        return err(access.error);
      }
      const result = await apiFetch<ApiPracticeLogMutationResponse>(
        `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/practice-logs`,
        {
          method: 'POST',
          headers: access.data.headers,
          body: JSON.stringify({
            minutes: roundedMinutes,
            ...(input.note?.trim() ? { note: input.note.trim() } : {}),
          }),
        },
      );
      if (!result.success) {
        return err(result.error);
      }
      logger.info('practice_logged_via_api', {
        athleteId: input.athleteId,
        dateKey: result.data.log.dateKey,
        minutes: roundedMinutes,
        totalToday: result.data.log.minutes,
      });
      return ok(result.data.log);
    }

    const nowIso = new Date().toISOString();
    const today = toDateKey();
    const logs = await getLogs();
    const existingIndex = logs.findIndex(
      (entry) => entry.athleteId === input.athleteId && entry.dateKey === today,
    );

    const normalizedNote = input.note?.trim();

    let nextEntry: PracticeLogEntry;
    if (existingIndex >= 0) {
      const existing = logs[existingIndex];
      nextEntry = {
        ...existing,
        minutes: existing.minutes + roundedMinutes,
        updatedAt: nowIso,
        note: normalizedNote ?? existing.note,
      };
      logs[existingIndex] = nextEntry;
    } else {
      nextEntry = {
        id: `practice_${input.athleteId}_${today}`,
        athleteId: input.athleteId,
        dateKey: today,
        minutes: roundedMinutes,
        createdAt: nowIso,
        note: normalizedNote,
      };
      logs.unshift(nextEntry);
    }

    await saveLogs(logs);
    logger.info('practice_logged', {
      athleteId: input.athleteId,
      dateKey: today,
      minutes: roundedMinutes,
      totalToday: nextEntry.minutes,
    });
    return ok(nextEntry);
  } catch (error) {
    logger.error('Failed to log practice minutes', { athleteId: input.athleteId, error });
    return err(storageError('Failed to log practice'));
  }
}

export const progressPracticeLogService = {
  listAthleteLogs,
  listAthleteLogsResult,
  getTodayLog,
  logPractice,
};
