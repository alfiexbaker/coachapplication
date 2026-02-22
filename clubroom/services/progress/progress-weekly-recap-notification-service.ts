import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';
import { apiClient } from '@/services/api-client';
import { notificationTriggers } from '@/services/notification-trigger';
import { badgeService } from '@/services/badge-service';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { progressReportService } from './progress-report-service';

const logger = createLogger('ProgressWeeklyRecapNotificationService');

interface WeeklyRecapDispatchRecord {
  weekKey: string;
  sentAt: string;
}

type WeeklyRecapDispatchState = Record<string, WeeklyRecapDispatchRecord>;

export interface DispatchWeeklyRecapInput {
  parentId: string;
  athleteId: string;
  athleteName: string;
  now?: Date;
}

export interface DispatchWeeklyRecapResult {
  sent: boolean;
  reason: 'sent' | 'not_due_yet' | 'already_sent_this_week' | 'missing_context';
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCurrentWeekSunday(date: Date): Date {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return sunday;
}

function getDispatchWindowStart(date: Date): Date {
  const sunday = getCurrentWeekSunday(date);
  sunday.setHours(18, 0, 0, 0);
  return sunday;
}

function getDispatchStateKey(parentId: string, athleteId: string): string {
  return `${parentId}:${athleteId}`;
}

function bookingMatchesAthlete(booking: Booking, athleteId: string): boolean {
  if (booking.status !== 'COMPLETED') {
    return false;
  }
  if (booking.athleteIds?.includes(athleteId)) {
    return true;
  }
  return booking.athleteId === athleteId;
}

function getSkillImprovementLine(skillDeltas: { skill: string; delta: number }[]): string | null {
  if (skillDeltas.length === 0) {
    return null;
  }
  const top = [...skillDeltas].sort((left, right) => right.delta - left.delta)[0];
  if (top.delta <= 0) {
    return null;
  }
  const roundedDelta = Math.round(top.delta * 10) / 10;
  return `${top.skill} improved (+${roundedDelta})`;
}

async function dispatchIfDue(
  input: DispatchWeeklyRecapInput,
): Promise<Result<DispatchWeeklyRecapResult, ServiceError>> {
  if (!input.parentId || !input.athleteId || !input.athleteName.trim()) {
    return ok({ sent: false, reason: 'missing_context' });
  }

  const now = input.now ?? new Date();
  const dispatchWindowStart = getDispatchWindowStart(now);
  if (now.getTime() < dispatchWindowStart.getTime()) {
    return ok({ sent: false, reason: 'not_due_yet' });
  }

  const weekKey = toDateKey(getCurrentWeekSunday(now));
  const stateKey = getDispatchStateKey(input.parentId, input.athleteId);

  try {
    const state = await apiClient.get<WeeklyRecapDispatchState>(
      STORAGE_KEYS.PROGRESS_WEEKLY_RECAP_NOTIFICATIONS,
      {},
    );
    if (state[stateKey]?.weekKey === weekKey) {
      return ok({ sent: false, reason: 'already_sent_this_week' });
    }

    const [allBookings, progress, streakInfo] = await Promise.all([
      apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      progressReportService.getAthleteProgress(input.athleteId, 'parent'),
      badgeService.getStreakInfo(input.athleteId),
    ]);

    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const sessionsThisWeek = allBookings.filter((booking) => {
      if (!bookingMatchesAthlete(booking, input.athleteId)) {
        return false;
      }
      const timestamp = new Date(booking.scheduledAt ?? booking.createdAt ?? '').getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;

    const skillDeltas = progress.skills
      .map((skill) => ({
        skill: skill.skill,
        delta: skill.level - (skill.previousLevel ?? skill.level),
      }))
      .filter((entry) => entry.delta > 0);
    const skillLine = getSkillImprovementLine(skillDeltas);

    const segments = [`${input.athleteName} trained ${sessionsThisWeek}x this week`];
    if (skillLine) {
      segments.push(skillLine);
    }
    if (streakInfo.currentStreak > 0) {
      segments.push(`${streakInfo.currentStreak} week streak`);
    }

    await notificationTriggers.weeklyProgressRecap(
      input.athleteName,
      segments.join('. '),
      input.parentId,
    );

    const nextState: WeeklyRecapDispatchState = {
      ...state,
      [stateKey]: {
        weekKey,
        sentAt: now.toISOString(),
      },
    };
    await apiClient.set(STORAGE_KEYS.PROGRESS_WEEKLY_RECAP_NOTIFICATIONS, nextState);

    logger.info('weekly_recap_notification_sent', {
      parentId: input.parentId,
      athleteId: input.athleteId,
      weekKey,
      sessionsThisWeek,
    });

    return ok({ sent: true, reason: 'sent' });
  } catch (error) {
    logger.error('Failed to dispatch weekly recap notification', {
      parentId: input.parentId,
      athleteId: input.athleteId,
      error,
    });
    return err(storageError('Failed to dispatch weekly recap notification'));
  }
}

export const progressWeeklyRecapNotificationService = {
  dispatchIfDue,
};
