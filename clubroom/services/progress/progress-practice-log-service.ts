import { STORAGE_KEYS } from '@/constants/storage-keys';
import { api } from '@/constants/config';
import { apiClient, apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import {
  parseApiPracticeLogListResponse,
  parseApiPracticeLogMutationResponse,
  parseApiPracticeLogTodayResponse,
  type ApiPracticeLogEntry,
} from '@/services/progress/practice-log-response-contract';
import {
  err,
  ok,
  storageError,
  validationError,
  type Result,
  type ServiceError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressPracticeLogService');

export interface PracticeLogEntry {
  id: string;
  athleteId: string;
  authorUserId?: string;
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

export interface PracticeLogTodaySummary {
  log: PracticeLogEntry | null;
  dateKey: string;
  timeZone: string;
}

function toDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
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

function toPracticeLogEntry(entry: ApiPracticeLogEntry): PracticeLogEntry {
  return {
    id: entry.id,
    athleteId: entry.athleteId,
    authorUserId: entry.authorUserId,
    dateKey: entry.dateKey,
    minutes: entry.minutes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    ...(entry.note === null ? {} : { note: entry.note }),
  };
}

async function listAthleteLogsResult(
  athleteId: string,
): Promise<Result<PracticeLogEntry[], ServiceError>> {
  if (!athleteId) {
    return err(validationError('Missing athlete for practice logs'));
  }
  if (isApiMode()) {
    const access = await resolvePracticeLogApiAccess(athleteId);
    if (!access.success) {
      logger.warn('practice_log_api_access_denied', { athleteId, error: access.error });
      return err(access.error);
    }
    const result = await apiFetch<unknown>(
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
    const response = parseApiPracticeLogListResponse(result.data, access.data.apiAthleteId);
    if (!response) {
      return err(storageError('Practice log API response did not match contract'));
    }
    return ok(response.logs.map(toPracticeLogEntry));
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

async function getTodaySummary(athleteId: string): Promise<PracticeLogTodaySummary> {
  if (isApiMode()) {
    if (!athleteId) {
      throw new Error('Missing athlete for practice log');
    }
    const access = await resolvePracticeLogApiAccess(athleteId);
    if (!access.success) {
      logger.warn('practice_log_api_access_denied', { athleteId, error: access.error });
      throw new Error(access.error.message);
    }
    const result = await apiFetch<unknown>(
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
    const response = parseApiPracticeLogTodayResponse(result.data, access.data.apiAthleteId);
    if (!response) {
      throw new Error('Today practice log API response did not match contract');
    }
    return {
      log: response.log ? toPracticeLogEntry(response.log) : null,
      dateKey: response.dateKey,
      timeZone: response.timeZone,
    };
  }

  const today = toDateKey();
  const logs = await listAthleteLogs(athleteId);
  return {
    log: logs.find((entry) => entry.dateKey === today) ?? null,
    dateKey: today,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

async function getTodayLog(athleteId: string): Promise<PracticeLogEntry | null> {
  return (await getTodaySummary(athleteId)).log;
}

async function logPractice(
  input: LogPracticeInput,
): Promise<Result<PracticeLogEntry, ServiceError>> {
  if (!input.athleteId) {
    return err(validationError('Missing athlete for practice log'));
  }
  const normalizedNote = input.note?.trim();
  if (isApiMode()) {
    if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 24 * 60) {
      return err(validationError('Practice minutes must be a whole number between 1 and 1440'));
    }
    if (input.note !== undefined && (!normalizedNote || normalizedNote.length > 1000)) {
      return err(validationError('Practice note must be between 1 and 1000 characters'));
    }
  }

  try {
    if (isApiMode()) {
      const access = await resolvePracticeLogApiAccess(input.athleteId);
      if (!access.success) {
        return err(access.error);
      }
      const result = await apiFetch<unknown>(
        `/v1/athletes/${encodeURIComponent(access.data.apiAthleteId)}/practice-logs`,
        {
          method: 'POST',
          headers: access.data.headers,
          body: JSON.stringify({
            minutes: input.minutes,
            ...(normalizedNote ? { note: normalizedNote } : {}),
            idempotencyKey: apiClient.generateId('practice-log'),
          }),
        },
      );
      if (!result.success) {
        return err(result.error);
      }
      const response = parseApiPracticeLogMutationResponse(
        result.data,
        access.data.apiAthleteId,
      );
      if (!response) {
        return err(storageError('Practice log API response did not match contract'));
      }
      logger.info('practice_logged_via_api', {
        athleteId: input.athleteId,
        dateKey: response.log.dateKey,
        minutes: response.addedMinutes,
        totalToday: response.log.minutes,
      });
      return ok(toPracticeLogEntry(response.log));
    }

    const roundedMinutes = Math.max(1, Math.round(input.minutes));
    const nowIso = new Date().toISOString();
    const today = toDateKey();
    const logs = await getLogs();
    const existingIndex = logs.findIndex(
      (entry) => entry.athleteId === input.athleteId && entry.dateKey === today,
    );

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
  getTodaySummary,
  getTodayLog,
  logPractice,
};
