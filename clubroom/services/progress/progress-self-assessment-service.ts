import type { Booking } from '@/constants/app-types';
import { apiClient } from '@/services/api-client';
import { notificationTriggers } from '@/services/notification-trigger';
import {
  err,
  ok,
  storageError,
  unsupportedError,
  type Result,
  type ServiceError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressSelfAssessmentService');
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface SelfAssessmentPrompt {
  id: string;
  athleteId: string;
  athleteName: string;
  coachId: string;
  bookingId: string;
  sessionId: string;
  createdAt: string;
  dueAt: string;
  status: 'pending' | 'completed';
  completedAt?: string;
  notificationSentAt?: string;
}

export interface SelfAssessmentEntry {
  id: string;
  athleteId: string;
  coachId: string;
  bookingId: string;
  sessionId: string;
  mood: number;
  energyLevel: number;
  confidence: number;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitSelfAssessmentInput {
  athleteId: string;
  coachId: string;
  bookingId: string;
  sessionId: string;
  mood: number;
  energyLevel: number;
  confidence: number;
  notes?: string;
}

function clampRatingOneToFive(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }
  return Math.max(1, Math.min(5, Math.round(value)));
}

let mockPromptsStore: SelfAssessmentPrompt[] = [];
let mockEntriesStore: SelfAssessmentEntry[] = [];

function clonePrompt(prompt: SelfAssessmentPrompt): SelfAssessmentPrompt {
  return { ...prompt };
}

function cloneEntry(entry: SelfAssessmentEntry): SelfAssessmentEntry {
  return { ...entry };
}

function selfAssessmentUnsupportedError(action: string): ServiceError {
  return unsupportedError(
    `${action} needs a /v1 self-assessment API before it can run in API mode.`,
  );
}

function logUnsupported(action: string, details?: unknown): void {
  logger.warn('Self-assessment API unavailable in live API mode', {
    action,
    details,
    requiredRoutes: [
      'GET /v1/athletes/:athleteId/self-assessments',
      'POST /v1/self-assessments',
      'GET /v1/me/self-assessment-prompts',
      'POST /v1/self-assessment-prompts/:promptId/dispatch',
    ],
  });
}

function resolveAthletePairs(booking: Booking): Array<{ athleteId: string; athleteName: string }> {
  const ids =
    booking.athleteIds && booking.athleteIds.length > 0
      ? booking.athleteIds
      : booking.athleteId
        ? [booking.athleteId]
        : [];

  return ids.flatMap((athleteId, index) =>
    athleteId.trim().length > 0
      ? [
          {
            athleteId,
            athleteName: booking.athleteNames?.[index] ?? 'Athlete',
          },
        ]
      : [],
  );
}

function resolveDueAt(booking: Booking): string {
  const scheduledTimestamp = new Date(booking.scheduledAt).getTime();
  if (!Number.isNaN(scheduledTimestamp)) {
    const durationMs = Math.max(1, booking.duration ?? 60) * 60 * 1000;
    return new Date(scheduledTimestamp + durationMs + ONE_HOUR_MS).toISOString();
  }
  return new Date(Date.now() + ONE_HOUR_MS).toISOString();
}

async function getPrompts(): Promise<SelfAssessmentPrompt[]> {
  return mockPromptsStore.map(clonePrompt);
}

async function savePrompts(prompts: SelfAssessmentPrompt[]): Promise<void> {
  mockPromptsStore = prompts.map(clonePrompt);
}

async function getEntries(): Promise<SelfAssessmentEntry[]> {
  return mockEntriesStore.map(cloneEntry);
}

async function saveEntries(entries: SelfAssessmentEntry[]): Promise<void> {
  mockEntriesStore = entries.map(cloneEntry);
}

async function schedulePromptsForCompletedBooking(
  booking: Booking,
): Promise<Result<SelfAssessmentPrompt[], ServiceError>> {
  if (booking.status !== 'COMPLETED') {
    return ok([]);
  }
  if (!apiClient.isMockMode) {
    logUnsupported('Self-assessment prompt scheduling', { bookingId: booking.id });
    return ok([]);
  }

  try {
    const prompts = await getPrompts();
    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    const createdAt = new Date().toISOString();
    const dueAt = resolveDueAt(booking);
    const newPrompts: SelfAssessmentPrompt[] = [];

    for (const athlete of resolveAthletePairs(booking)) {
      const promptId = `self_assessment_prompt_${booking.id}_${athlete.athleteId}`;
      if (promptIds.has(promptId)) {
        continue;
      }

      newPrompts.push({
        id: promptId,
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName,
        coachId: booking.coachId,
        bookingId: booking.id,
        sessionId: booking.id,
        createdAt,
        dueAt,
        status: 'pending',
      });
    }

    if (newPrompts.length === 0) {
      return ok([]);
    }

    await savePrompts([...prompts, ...newPrompts]);
    logger.info('self_assessment_prompts_scheduled', {
      bookingId: booking.id,
      promptCount: newPrompts.length,
    });
    return ok(newPrompts);
  } catch (error) {
    logger.error('Failed to schedule self-assessment prompts', {
      bookingId: booking.id,
      error,
    });
    return err(storageError('Failed to schedule self-assessment prompts'));
  }
}

async function dispatchDuePrompts(athleteId?: string): Promise<Result<number, ServiceError>> {
  if (!apiClient.isMockMode) {
    logUnsupported('Self-assessment prompt dispatch', { athleteId });
    return ok(0);
  }

  try {
    const prompts = await getPrompts();
    const nowIso = new Date().toISOString();
    const nowTimestamp = new Date(nowIso).getTime();
    let sentCount = 0;
    let changed = false;

    const duePrompts = prompts.filter((prompt) => {
      if (prompt.status !== 'pending') {
        return false;
      }
      if (athleteId && prompt.athleteId !== athleteId) {
        return false;
      }
      if (prompt.notificationSentAt) {
        return false;
      }
      const dueTimestamp = new Date(prompt.dueAt).getTime();
      return !Number.isNaN(dueTimestamp) && dueTimestamp <= nowTimestamp;
    });

    await Promise.all(
      duePrompts.map((prompt) =>
        notificationTriggers.selfAssessmentPrompt(prompt.athleteName, prompt.athleteId),
      ),
    );
    duePrompts.forEach((prompt) => {
      prompt.notificationSentAt = nowIso;
      sentCount += 1;
      changed = true;
    });

    if (changed) {
      await savePrompts(prompts);
    }

    return ok(sentCount);
  } catch (error) {
    logger.error('Failed to dispatch self-assessment prompts', { athleteId, error });
    return err(storageError('Failed to dispatch self-assessment prompts'));
  }
}

async function getPendingPromptForAthlete(athleteId: string): Promise<SelfAssessmentPrompt | null> {
  if (!athleteId) {
    return null;
  }
  if (!apiClient.isMockMode) {
    logUnsupported('Self-assessment prompt read', { athleteId });
    return null;
  }

  const prompts = await getPrompts();
  const nowTimestamp = Date.now();

  const duePrompts = prompts
    .filter((prompt) => {
      if (prompt.athleteId !== athleteId) {
        return false;
      }
      if (prompt.status !== 'pending') {
        return false;
      }
      const dueTimestamp = new Date(prompt.dueAt).getTime();
      return !Number.isNaN(dueTimestamp) && dueTimestamp <= nowTimestamp;
    })
    .sort((left, right) => {
      return new Date(right.dueAt).getTime() - new Date(left.dueAt).getTime();
    });

  return duePrompts[0] ?? null;
}

async function listAssessmentsForAthlete(athleteId: string): Promise<SelfAssessmentEntry[]> {
  if (!athleteId) {
    return [];
  }
  if (!apiClient.isMockMode) {
    logUnsupported('Self-assessment list read', { athleteId });
    return [];
  }

  const entries = await getEntries();
  return entries
    .filter((entry) => entry.athleteId === athleteId)
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

async function submitAssessment(
  input: SubmitSelfAssessmentInput,
): Promise<Result<SelfAssessmentEntry, ServiceError>> {
  if (!apiClient.isMockMode) {
    logUnsupported('Self-assessment submission', {
      athleteId: input.athleteId,
      bookingId: input.bookingId,
      sessionId: input.sessionId,
    });
    return err(selfAssessmentUnsupportedError('Self-assessment submission'));
  }

  try {
    const nowIso = new Date().toISOString();
    const entries = await getEntries();
    const existingIndex = entries.findIndex(
      (entry) => entry.athleteId === input.athleteId && entry.bookingId === input.bookingId,
    );

    const sanitizedNotes = input.notes?.trim() ?? '';
    const nextEntry: SelfAssessmentEntry =
      existingIndex >= 0
        ? {
            ...entries[existingIndex],
            mood: clampRatingOneToFive(input.mood),
            energyLevel: clampRatingOneToFive(input.energyLevel),
            confidence: clampRatingOneToFive(input.confidence),
            notes: sanitizedNotes,
            updatedAt: nowIso,
          }
        : {
            id: `self_assessment_${Date.now()}`,
            athleteId: input.athleteId,
            coachId: input.coachId,
            bookingId: input.bookingId,
            sessionId: input.sessionId,
            mood: clampRatingOneToFive(input.mood),
            energyLevel: clampRatingOneToFive(input.energyLevel),
            confidence: clampRatingOneToFive(input.confidence),
            notes: sanitizedNotes,
            createdAt: nowIso,
          };

    if (existingIndex >= 0) {
      entries[existingIndex] = nextEntry;
    } else {
      entries.unshift(nextEntry);
    }
    await saveEntries(entries);

    const prompts = await getPrompts();
    let promptsChanged = false;
    prompts.forEach((prompt) => {
      if (prompt.athleteId !== input.athleteId || prompt.bookingId !== input.bookingId) {
        return;
      }
      if (prompt.status === 'completed') {
        return;
      }
      prompt.status = 'completed';
      prompt.completedAt = nowIso;
      promptsChanged = true;
    });
    if (promptsChanged) {
      await savePrompts(prompts);
    }

    logger.info('self_assessment_submitted', {
      athleteId: input.athleteId,
      bookingId: input.bookingId,
      sessionId: input.sessionId,
    });
    return ok(nextEntry);
  } catch (error) {
    logger.error('Failed to submit self-assessment', {
      athleteId: input.athleteId,
      bookingId: input.bookingId,
      error,
    });
    return err(storageError('Failed to submit self-assessment'));
  }
}

export const progressSelfAssessmentService = {
  schedulePromptsForCompletedBooking,
  dispatchDuePrompts,
  getPendingPromptForAthlete,
  listAssessmentsForAthlete,
  submitAssessment,
};
