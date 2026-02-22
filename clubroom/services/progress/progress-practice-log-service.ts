import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
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

async function getLogs(): Promise<PracticeLogEntry[]> {
  return apiClient.get<PracticeLogEntry[]>(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, []);
}

async function saveLogs(logs: PracticeLogEntry[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, logs);
}

async function listAthleteLogs(athleteId: string): Promise<PracticeLogEntry[]> {
  if (!athleteId) {
    return [];
  }

  const logs = await getLogs();
  return logs
    .filter((entry) => entry.athleteId === athleteId)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

async function getTodayLog(athleteId: string): Promise<PracticeLogEntry | null> {
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
  getTodayLog,
  logPractice,
};
