import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { type ClubMember } from '@/services/club-service';
import {
  orgHeadCoachService,
  type HeadCoachStandard,
  type HeadCoachTask,
} from '@/services/org-head-coach-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { Booking, SessionOffering, SquadMember } from '@/constants/types';

let viewerSequence = 0;

function nextViewerId(): string {
  viewerSequence += 1;
  return `coach_scope_head_${viewerSequence}`;
}

function makeOffering(
  id: string,
  overrides: Partial<SessionOffering> = {},
): SessionOffering {
  return {
    id,
    coachId: 'coach_scope_delivery_1',
    clubId: 'club_warriors',
    actingAs: 'club',
    title: 'Club Session',
    sessionType: '1on1',
    maxParticipants: 8,
    location: 'Southbank Fields',
    scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isRecurring: false,
    recurrenceType: 'none',
    status: 'active',
    registrations: [],
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function makeBooking(
  id: string,
  overrides: Partial<Booking> = {},
): Booking {
  return {
    id,
    coachId: 'coach_scope_delivery_1',
    coachName: 'Coach One',
    clubId: 'club_warriors',
    actingAs: 'club',
    athleteIds: ['athlete_scope_1'],
    athleteNames: ['Athlete Scope One'],
    bookedById: 'parent_scope_1',
    bookedByName: 'Parent Scope One',
    status: 'AWAITING_COMPLETION',
    scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    location: 'Southbank Fields',
    service: 'Club Session',
    serviceType: 'COACHING',
    sessionSource: 'direct',
    sessionSourceEntityId: 'offering_scope_1',
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

async function seedViewer(viewerId: string) {
  const joinResult = socialFeedService.joinClub(viewerId, 'WARRIORS-2026', 'HEAD_COACH');
  assert.equal(joinResult.success, true);

  const clubMembers: ClubMember[] = [
    {
      userId: viewerId,
      userName: 'Head Coach Viewer',
      role: 'HEAD_COACH',
      status: 'active',
      joinedAt: '2026-01-10',
      squadIds: ['squad_warriors_u12'],
    },
    {
      userId: 'coach_scope_delivery_1',
      userName: 'Coach One',
      role: 'COACH',
      status: 'active',
      joinedAt: '2026-01-08',
      squadIds: ['squad_warriors_u12'],
    },
    {
      userId: 'coach_scope_delivery_2',
      userName: 'Coach Two',
      role: 'COACH',
      status: 'active',
      joinedAt: '2026-01-09',
      squadIds: ['squad_warriors_u14'],
    },
  ];

  const squadMembers: SquadMember[] = [
    {
      id: 'scope_member_u12',
      squadId: 'squad_warriors_u12',
      athleteId: 'athlete_scope_1',
      parentId: 'parent_scope_1',
      status: 'ACTIVE',
      joinedAt: '2026-01-01',
    },
    {
      id: 'scope_member_u14',
      squadId: 'squad_warriors_u14',
      athleteId: 'athlete_scope_2',
      parentId: 'parent_scope_2',
      status: 'ACTIVE',
      joinedAt: '2026-01-01',
    },
  ];

  await apiClient.set(`${STORAGE_KEYS.CLUB_MEMBERS}_club_warriors`, clubMembers);
  await apiClient.set(STORAGE_KEYS.SQUAD_MEMBERS, squadMembers);
}

describe('orgHeadCoachService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS);
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.ORG_HEAD_COACH_TASKS);
    await apiClient.remove(STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS);
    await apiClient.remove(STORAGE_KEYS.SQUAD_MEMBERS);
    await apiClient.remove(`${STORAGE_KEYS.CLUB_MEMBERS}_club_warriors`);
  });

  it('scopes head coach oversight to assigned squads instead of the full club', async () => {
    const viewerId = nextViewerId();
    await seedViewer(viewerId);

    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_scope_1', {
        coachId: 'coach_scope_delivery_1',
        assigneeCoachId: 'coach_scope_delivery_1',
        ownerCoachId: 'coach_scope_delivery_1',
        squadId: 'squad_warriors_u12',
        title: 'U12 Finishing',
      }),
      makeOffering('offering_scope_2', {
        coachId: 'coach_scope_delivery_2',
        assigneeCoachId: 'coach_scope_delivery_2',
        ownerCoachId: 'coach_scope_delivery_2',
        squadId: 'squad_warriors_u14',
        title: 'U14 Pressing',
      }),
    ] satisfies SessionOffering[]);

    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      makeBooking('booking_scope_1', {
        coachId: 'coach_scope_delivery_1',
        coachName: 'Coach One',
        athleteIds: ['athlete_scope_1'],
        athleteNames: ['Athlete Scope One'],
        sessionSourceEntityId: 'offering_scope_1',
        service: 'U12 Finishing',
      }),
      makeBooking('booking_scope_2', {
        coachId: 'coach_scope_delivery_2',
        coachName: 'Coach Two',
        athleteIds: ['athlete_scope_2'],
        athleteNames: ['Athlete Scope Two'],
        sessionSourceEntityId: 'offering_scope_2',
        service: 'U14 Pressing',
      }),
    ] satisfies Booking[]);

    await progressFeedbackService.addSessionFeedback(
      {
        sessionId: 'session_scope_1',
        bookingId: 'booking_scope_1',
        sessionTitle: 'U12 Finishing',
        coachId: 'coach_scope_delivery_1',
        coachName: 'Coach One',
        athleteId: 'athlete_scope_1',
        athleteName: 'Athlete Scope One',
        publicSummary: 'Strong output',
        skillsWorkedOn: ['Finishing'],
        skillRatings: [{ skill: 'Finishing', rating: 4 }],
        improvements: 'Scan before shooting',
        homework: 'Finish 30 reps off both feet',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'athlete',
      },
      { skipSkillUpdate: true },
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    await progressFeedbackService.addSessionFeedback(
      {
        sessionId: 'session_scope_2',
        bookingId: 'booking_scope_2',
        sessionTitle: 'U14 Pressing',
        coachId: 'coach_scope_delivery_2',
        coachName: 'Coach Two',
        athleteId: 'athlete_scope_2',
        athleteName: 'Athlete Scope Two',
        publicSummary: 'Good session',
        skillsWorkedOn: ['Pressing'],
        skillRatings: [{ skill: 'Pressing', rating: 4 }],
        improvements: 'React faster after turnover',
        homework: 'Review pressing triggers and note three clips',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'athlete',
      },
      { skipSkillUpdate: true },
    );

    const result = await orgHeadCoachService.getOversightData('club_warriors', viewerId);

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.scope.type, 'assigned_squads');
    assert.deepEqual(result.data.scope.squadIds, ['squad_warriors_u12']);
    assert.equal(result.data.completionQueue.length, 1);
    assert.equal(result.data.completionQueue[0]?.bookingId, 'booking_scope_1');
    assert.equal(result.data.watchlist.length, 1);
    assert.equal(result.data.watchlist[0]?.athleteId, 'athlete_scope_1');
    assert.ok(
      result.data.coachHealth.some((coach) => coach.coachId === 'coach_scope_delivery_1'),
    );
    assert.ok(
      !result.data.coachHealth.some((coach) => coach.coachId === 'coach_scope_delivery_2'),
    );
  });

  it('persists head coach tasks and standards on top of scoped oversight data', async () => {
    const viewerId = nextViewerId();
    await seedViewer(viewerId);

    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_scope_1', {
        coachId: 'coach_scope_delivery_1',
        assigneeCoachId: 'coach_scope_delivery_1',
        ownerCoachId: 'coach_scope_delivery_1',
        squadId: 'squad_warriors_u12',
      }),
    ] satisfies SessionOffering[]);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      makeBooking('booking_scope_1', {
        coachId: 'coach_scope_delivery_1',
        coachName: 'Coach One',
        athleteIds: ['athlete_scope_1'],
        athleteNames: ['Athlete Scope One'],
        sessionSourceEntityId: 'offering_scope_1',
      }),
    ] satisfies Booking[]);

    const taskResult = await orgHeadCoachService.createTask({
      clubId: 'club_warriors',
      actorUserId: viewerId,
      coachId: 'coach_scope_delivery_1',
      type: 'session_note_expectation',
      bookingId: 'booking_scope_1',
      title: 'Submit notes before tonight',
    });

    assert.equal(taskResult.success, true);
    if (!taskResult.success) return;
    assert.equal(taskResult.data.status, 'open');
    assert.equal(taskResult.data.type, 'session_note_expectation');

    const completedTask = await orgHeadCoachService.setTaskStatus({
      clubId: 'club_warriors',
      actorUserId: viewerId,
      taskId: taskResult.data.id,
      status: 'done',
    });

    assert.equal(completedTask.success, true);
    if (!completedTask.success) return;
    assert.equal(completedTask.data.status, 'done');

    const standardResult = await orgHeadCoachService.createStandard({
      clubId: 'club_warriors',
      actorUserId: viewerId,
      title: 'Squad debrief posted by 19:00',
      description: 'Head coach wants the debrief posted on the same day as delivery.',
    });

    assert.equal(standardResult.success, true);
    if (!standardResult.success) return;
    assert.equal(standardResult.data.active, true);

    const toggledStandard = await orgHeadCoachService.toggleStandard({
      clubId: 'club_warriors',
      actorUserId: viewerId,
      standardId: standardResult.data.id,
    });

    assert.equal(toggledStandard.success, true);
    if (!toggledStandard.success) return;
    assert.equal(toggledStandard.data.active, false);

    const storedTasks = await apiClient.get<HeadCoachTask[]>(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, []);
    const storedStandards = await apiClient.get<HeadCoachStandard[]>(
      STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS,
      [],
    );

    assert.equal(storedTasks.length, 1);
    assert.equal(storedTasks[0]?.status, 'done');
    assert.ok(
      storedStandards.some(
        (standard) => standard.title === 'Squad debrief posted by 19:00' && standard.active === false,
      ),
    );
  });
});
