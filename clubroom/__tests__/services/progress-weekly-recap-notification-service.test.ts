import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressWeeklyRecapNotificationService } from '@/services/progress/progress-weekly-recap-notification-service';

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  recipientId?: string;
}

function buildCompletedBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: overrides.id ?? `booking_weekly_${Math.random().toString(36).slice(2, 8)}`,
    coachId: overrides.coachId ?? 'coach_weekly_1',
    coachName: overrides.coachName ?? 'Coach Weekly',
    athleteIds: overrides.athleteIds ?? ['athlete_weekly_1'],
    athleteId: overrides.athleteId ?? overrides.athleteIds?.[0] ?? 'athlete_weekly_1',
    status: 'COMPLETED',
    scheduledAt: overrides.scheduledAt ?? new Date().toISOString(),
    duration: overrides.duration ?? 60,
    location: overrides.location ?? 'Main Pitch',
    service: overrides.service ?? '1-on-1',
    serviceType: overrides.serviceType ?? 'COACHING',
    ...overrides,
  };
}

describe('progressWeeklyRecapNotificationService', () => {
  beforeEach(async () => {
    await Promise.all([
      apiClient.remove(STORAGE_KEYS.PROGRESS_WEEKLY_RECAP_NOTIFICATIONS),
      apiClient.remove(STORAGE_KEYS.NOTIFICATIONS),
      apiClient.remove(STORAGE_KEYS.BOOKINGS),
      apiClient.remove(STORAGE_KEYS.SKILL_LEVELS),
      apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK),
      apiClient.remove(STORAGE_KEYS.GOALS),
      apiClient.remove(STORAGE_KEYS.COACH_SESSIONS),
      apiClient.remove(STORAGE_KEYS.BADGE_AWARDS),
    ]);
  });

  it('does not dispatch before weekly window start', async () => {
    const sundayMorningLocal = new Date(2026, 1, 22, 10, 0, 0, 0);
    const result = await progressWeeklyRecapNotificationService.dispatchIfDue({
      parentId: 'parent_weekly_1',
      athleteId: 'athlete_weekly_1',
      athleteName: 'Kai',
      now: sundayMorningLocal,
    });

    assert.equal(result.success, true);
    assert.equal(result.success ? result.data.reason : '', 'not_due_yet');

    const notifications = await apiClient.get<NotificationRecord[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    assert.equal(notifications.length, 0);
  });

  it('dispatches one recap per athlete/parent per week and records dedupe state', async () => {
    const now = new Date(2026, 1, 22, 19, 0, 0, 0);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      buildCompletedBooking({
        id: 'booking_weekly_due',
        athleteIds: ['athlete_weekly_2'],
        athleteId: 'athlete_weekly_2',
        scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]);
    await progressSkillsService.updateSkillLevel('athlete_weekly_2', 'Passing', 5, 'coach_weekly_1');
    await progressSkillsService.updateSkillLevel('athlete_weekly_2', 'Passing', 7, 'coach_weekly_1');

    const first = await progressWeeklyRecapNotificationService.dispatchIfDue({
      parentId: 'parent_weekly_2',
      athleteId: 'athlete_weekly_2',
      athleteName: 'Kai',
      now,
    });
    assert.equal(first.success, true);
    assert.equal(first.success ? first.data.sent : false, true);

    const notificationsAfterFirst = await apiClient.get<NotificationRecord[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      [],
    );
    assert.equal(notificationsAfterFirst.length, 1);
    assert.equal(notificationsAfterFirst[0].recipientId, 'parent_weekly_2');
    assert.match(notificationsAfterFirst[0].title, /Weekly Progress/);
    assert.match(notificationsAfterFirst[0].body, /trained 1x this week/);

    const second = await progressWeeklyRecapNotificationService.dispatchIfDue({
      parentId: 'parent_weekly_2',
      athleteId: 'athlete_weekly_2',
      athleteName: 'Kai',
      now: new Date(2026, 1, 23, 12, 0, 0, 0),
    });
    assert.equal(second.success, true);
    assert.equal(second.success ? second.data.reason : '', 'already_sent_this_week');

    const notificationsAfterSecond = await apiClient.get<NotificationRecord[]>(
      STORAGE_KEYS.NOTIFICATIONS,
      [],
    );
    assert.equal(notificationsAfterSecond.length, 1);

    const dispatchState = await apiClient.get<Record<string, { weekKey: string; sentAt: string }>>(
      STORAGE_KEYS.PROGRESS_WEEKLY_RECAP_NOTIFICATIONS,
      {},
    );
    assert.ok(dispatchState['parent_weekly_2:athlete_weekly_2']);
  });
});
