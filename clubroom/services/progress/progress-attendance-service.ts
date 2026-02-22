import type { Booking, Session } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressSelfAssessmentService } from '@/services/progress/progress-self-assessment-service';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressAttendanceService');

function resolveAthleteIds(booking: Booking): string[] {
  const ids = new Set<string>();

  for (const athleteId of booking.athleteIds ?? []) {
    const normalized = athleteId?.trim();
    if (normalized) {
      ids.add(normalized);
    }
  }

  const fallbackAthleteId = booking.athleteId?.trim();
  if (fallbackAthleteId) {
    ids.add(fallbackAthleteId);
  }

  return Array.from(ids);
}

function resolveSessionCompletedAt(booking: Booking): string {
  const scheduledTimestamp = new Date(booking.scheduledAt).getTime();
  if (!Number.isNaN(scheduledTimestamp)) {
    return new Date(scheduledTimestamp).toISOString();
  }

  const createdTimestamp = new Date(booking.createdAt ?? '').getTime();
  if (!Number.isNaN(createdTimestamp)) {
    return new Date(createdTimestamp).toISOString();
  }

  return new Date().toISOString();
}

function buildSessionId(bookingId: string, athleteId: string): string {
  return `session_booking_${bookingId}_${athleteId}`;
}

export async function upsertCompletedBookingSessions(
  booking: Booking,
): Promise<Result<Session[], ServiceError>> {
  if (booking.status !== 'COMPLETED') {
    return ok([]);
  }

  const athleteIds = resolveAthleteIds(booking);
  if (athleteIds.length === 0) {
    logger.warn('Skipping completed booking attendance ingestion: no athletes found', {
      bookingId: booking.id,
    });
    return ok([]);
  }

  try {
    const existingSessions = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
    const mergedSessions = [...existingSessions];
    const createdSessions: Session[] = [];

    athleteIds.forEach((athleteId) => {
      const expectedSessionId = buildSessionId(booking.id, athleteId);
      const alreadyExists = mergedSessions.some(
        (session) =>
          session.id === expectedSessionId ||
          (session.bookingId === booking.id && session.athleteId === athleteId),
      );
      if (alreadyExists) {
        return;
      }

      const sessionRecord: Session = {
        id: expectedSessionId,
        bookingId: booking.id,
        coachId: booking.coachId,
        athleteId,
        completedAt: resolveSessionCompletedAt(booking),
        attendance: 'ATTENDED',
        notes: '',
        skillsWorkedOn: booking.objectives ?? [],
        performanceRating: 0,
        nextFocusAreas: booking.objectives ?? [],
        coachName: booking.coachName,
      };

      mergedSessions.push(sessionRecord);
      createdSessions.push(sessionRecord);
    });

    if (createdSessions.length > 0) {
      await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, mergedSessions);
    }

    const promptResult =
      await progressSelfAssessmentService.schedulePromptsForCompletedBooking(booking);
    if (!promptResult.success) {
      logger.error('Failed to schedule self-assessment prompts for completed booking', {
        bookingId: booking.id,
        error: promptResult.error,
      });
    }

    logger.info('completed_booking_progress_ingested', {
      bookingId: booking.id,
      athleteCount: createdSessions.length,
      promptsScheduled: promptResult.success ? promptResult.data.length : 0,
    });

    return ok(createdSessions);
  } catch (error) {
    logger.error('Failed to ingest completed booking sessions', {
      bookingId: booking.id,
      error,
    });
    return err(storageError('Failed to ingest completed booking sessions'));
  }
}

export const progressAttendanceService = {
  upsertCompletedBookingSessions,
};
