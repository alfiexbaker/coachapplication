import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { progressSelfAssessmentService } from '@/services/progress/progress-self-assessment-service';

interface PromptRecord {
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

interface JournalRecord {
  id: string;
  athleteId: string;
  sessionId: string;
  coachNotes?: string;
}

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

    const prompts = await apiClient.get<PromptRecord[]>(
      STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
      [],
    );
    assert.equal(prompts.length, 2);
    assert.ok(prompts.every((prompt) => prompt.status === 'pending'));
  });

  it('submits self-assessment, completes prompt, and mirrors entry into journal', async () => {
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

    const prompts = await apiClient.get<PromptRecord[]>(
      STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
      [],
    );
    const completedPrompt = prompts.find((prompt) => prompt.bookingId === booking.id);
    assert.equal(completedPrompt?.status, 'completed');
    assert.ok(completedPrompt?.completedAt);

    const assessments = await progressSelfAssessmentService.listAssessmentsForAthlete('athlete_sa_submit');
    assert.equal(assessments.length, 1);
    assert.equal(assessments[0].notes, 'Felt stronger in second half.');

    const journalEntries = await apiClient.get<JournalRecord[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
    const mirroredEntry = journalEntries.find(
      (entry) =>
        entry.sessionId === booking.id && entry.athleteId === 'athlete_sa_submit',
    );
    assert.ok(mirroredEntry);
    assert.match(mirroredEntry.coachNotes ?? '', /\[Self-assessment\]/);
  });

  it('dispatches only due pending prompts for the target athlete', async () => {
    await apiClient.set(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS, [
      {
        id: 'prompt_due_target',
        athleteId: 'athlete_due_target',
        athleteName: 'Athlete Due',
        coachId: 'coach_sa_1',
        bookingId: 'booking_due_target',
        sessionId: 'booking_due_target',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dueAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'pending',
      },
      {
        id: 'prompt_future_target',
        athleteId: 'athlete_due_target',
        athleteName: 'Athlete Due',
        coachId: 'coach_sa_1',
        bookingId: 'booking_future_target',
        sessionId: 'booking_future_target',
        createdAt: new Date().toISOString(),
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      },
      {
        id: 'prompt_due_other',
        athleteId: 'athlete_due_other',
        athleteName: 'Athlete Other',
        coachId: 'coach_sa_1',
        bookingId: 'booking_due_other',
        sessionId: 'booking_due_other',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dueAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'pending',
      },
    ]);

    const dispatch = await progressSelfAssessmentService.dispatchDuePrompts('athlete_due_target');
    assert.equal(dispatch.success, true);
    assert.equal(dispatch.success ? dispatch.data : 0, 1);

    const prompts = await apiClient.get<PromptRecord[]>(
      STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
      [],
    );
    const dueTarget = prompts.find((prompt) => prompt.id === 'prompt_due_target');
    const futureTarget = prompts.find((prompt) => prompt.id === 'prompt_future_target');
    const dueOther = prompts.find((prompt) => prompt.id === 'prompt_due_other');

    assert.ok(dueTarget?.notificationSentAt);
    assert.equal(futureTarget?.notificationSentAt, undefined);
    assert.equal(dueOther?.notificationSentAt, undefined);

    const notifications = await apiClient.get<NotificationRecord[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notification = notifications.find(
      (item) =>
        item.recipientId === 'athlete_due_target' && item.title === 'Quick Session Check-In',
    );
    assert.ok(notification);
  });
});
