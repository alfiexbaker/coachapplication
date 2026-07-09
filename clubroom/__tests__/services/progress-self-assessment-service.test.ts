import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressSelfAssessmentService } from '@/services/progress/progress-self-assessment-service';

interface NotificationRecord {
  recipientId?: string;
  title?: string;
}

function buildCompletedBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: overrides.id ?? `booking_sa_${Math.random().toString(36).slice(2, 8)}`,
    coachId: overrides.coachId ?? 'coach_sa_1',
    coachName: overrides.coachName ?? 'Coach SA',
    athleteIds: overrides.athleteIds ?? ['athlete_sa_1'],
    athleteNames: overrides.athleteNames ?? ['Athlete SA'],
    athleteId: overrides.athleteId ?? overrides.athleteIds?.[0] ?? 'athlete_sa_1',
    status: 'COMPLETED',
    scheduledAt: overrides.scheduledAt ?? new Date().toISOString(),
    duration: overrides.duration ?? 60,
    location: overrides.location ?? 'Main Pitch',
    service: overrides.service ?? '1-on-1',
    serviceType: overrides.serviceType ?? 'COACHING',
    ...overrides,
  };
}

describe('progressSelfAssessmentService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS);
    await apiClient.remove(STORAGE_KEYS.SESSION_JOURNAL);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  it('schedules one prompt per athlete and avoids duplicates', async () => {
    const booking = buildCompletedBooking({
      id: 'booking_sa_dedupe',
      athleteIds: ['athlete_sa_a', 'athlete_sa_b'],
      athleteNames: ['Athlete A', 'Athlete B'],
      scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    });

    const first = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(booking);
    assert.equal(first.success, true);
    assert.equal(first.success ? first.data.length : 0, 2);

    const second = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(booking);
    assert.equal(second.success, true);
    assert.equal(second.success ? second.data.length : 0, 0);

    const promptA = await progressSelfAssessmentService.getPendingPromptForAthlete('athlete_sa_a');
    const promptB = await progressSelfAssessmentService.getPendingPromptForAthlete('athlete_sa_b');
    assert.equal(promptA?.status, 'pending');
    assert.equal(promptB?.status, 'pending');
  });

  it('submits self-assessment and completes the pending prompt', async () => {
    const booking = buildCompletedBooking({
      id: 'booking_sa_submit',
      athleteIds: ['athlete_sa_submit'],
      athleteNames: ['Athlete Submit'],
      scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    });
    const schedule = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(booking);
    assert.equal(schedule.success, true);
    assert.equal(schedule.success ? schedule.data.length : 0, 1);

    const pending = await progressSelfAssessmentService.getPendingPromptForAthlete('athlete_sa_submit');
    assert.ok(pending);

    const submit = await progressSelfAssessmentService.submitAssessment({
      athleteId: 'athlete_sa_submit',
      coachId: booking.coachId,
      bookingId: booking.id,
      sessionId: booking.id,
      mood: 2,
      energyLevel: 3,
      confidence: 4,
      notes: 'Felt stronger in second half.',
    });
    assert.equal(submit.success, true);
    assert.equal(submit.success ? submit.data.confidence : 0, 4);

    const completedPrompt =
      await progressSelfAssessmentService.getPendingPromptForAthlete('athlete_sa_submit');
    assert.equal(completedPrompt, null);

    const assessments = await progressSelfAssessmentService.listAssessmentsForAthlete('athlete_sa_submit');
    assert.equal(assessments.length, 1);
    assert.equal(assessments[0].notes, 'Felt stronger in second half.');
  });

  it('dispatches only due pending prompts for the target athlete', async () => {
    const dueTarget = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(
      buildCompletedBooking({
        id: 'booking_due_target',
        athleteIds: ['athlete_due_target'],
        athleteNames: ['Athlete Due'],
        scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      }),
    );
    const futureTarget = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(
      buildCompletedBooking({
        id: 'booking_future_target',
        athleteIds: ['athlete_due_target'],
        athleteNames: ['Athlete Due'],
        scheduledAt: new Date().toISOString(),
      }),
    );
    const dueOther = await progressSelfAssessmentService.schedulePromptsForCompletedBooking(
      buildCompletedBooking({
        id: 'booking_due_other',
        athleteIds: ['athlete_due_other'],
        athleteNames: ['Athlete Other'],
        scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      }),
    );
    assert.equal(dueTarget.success, true);
    assert.equal(futureTarget.success, true);
    assert.equal(dueOther.success, true);

    const dispatch = await progressSelfAssessmentService.dispatchDuePrompts('athlete_due_target');
    assert.equal(dispatch.success, true);
    assert.equal(dispatch.success ? dispatch.data : 0, 1);

    const repeatDispatch =
      await progressSelfAssessmentService.dispatchDuePrompts('athlete_due_target');
    assert.equal(repeatDispatch.success, true);
    assert.equal(repeatDispatch.success ? repeatDispatch.data : 1, 0);

    const notifications = await apiClient.get<NotificationRecord[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notification = notifications.find(
      (item) =>
        item.recipientId === 'athlete_due_target' && item.title === 'Quick Session Check-In',
    );
    assert.ok(notification);
    assert.equal(
      notifications.some((item) => item.recipientId === 'athlete_due_other'),
      false,
    );
  });
});
