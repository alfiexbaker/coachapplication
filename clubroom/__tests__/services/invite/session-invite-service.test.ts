import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { sessionInviteService, setInvitesCache } from '@/services/invite/session-invite-service';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import type { Result, ServiceError } from '@/types/result';
import type { Booking } from '@/constants/app-types';
import type { GroupSession, SessionInvite, SessionOffering, WeekAcceptance } from '@/constants/types';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

function setApiMockMode(value: boolean): void {
  Object.defineProperty(api, 'useMock', {
    value,
    configurable: true,
  });
}

describe('sessionInviteService', () => {
  beforeEach(async () => {
    setApiMockMode(true);
    seq = 0;
    await apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, []);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, []);
    await apiClient.set(STORAGE_KEYS.GROUP_SESSIONS, []);
    await sessionInviteService.clearCache();
    setInvitesCache([]);
  });

  it('creates invite and retrieves it by id', async () => {
    const parentId = nextId('parent');
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId,
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
      price: 50,
      duration: 60,
    }));

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.ok(fetched);
    assert.equal(fetched?.id, invite.id);
    assert.equal(fetched?.parentId, parentId);
    assert.equal(fetched?.status, 'PENDING');
  });

  it('responds to invite with DECLINED and updates status', async () => {
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId: nextId('parent'),
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Finishing',
    }));

    const updated = expectOk(await sessionInviteService.respondToInvite({
      inviteId: invite.id,
      response: 'DECLINED',
    }));
    assert.equal(updated.status, 'DECLINED');
  });

  it('cancels invite and excludes it from open invites', async () => {
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId: nextId('parent'),
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Dribbling',
    }));

    await sessionInviteService.cancelInvite(invite.id);

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.equal(fetched?.status, 'EXPIRED');

    const openInvites = await sessionInviteService.getOpenInvites();
    assert.ok(!openInvites.some((item) => item.id === invite.id));
  });

  it('matches canonical aliases in coach/parent invite lookups', async () => {
    const created = expectOk(await sessionInviteService.createInvite(POC_ACCOUNT_IDS.athleteStorage, {
      coachId: POC_ACCOUNT_IDS.coachStorage,
      coachName: 'Coach Alias',
      parentId: POC_ACCOUNT_IDS.parent,
      parentName: 'Parent Alias',
      athleteNames: 'Athlete Alias',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
    }));

    const byCoach = await sessionInviteService.getCoachInvites(POC_ACCOUNT_IDS.coach);
    const byParent = await sessionInviteService.getParentInvites(POC_ACCOUNT_IDS.parent);

    assert.ok(byCoach.length >= 1);
    assert.ok(byParent.length >= 1);
    assert.ok(byCoach.some((invite) => invite.id === created.id));
    assert.ok(byParent.some((invite) => invite.id === created.id));
  });

  it('accepting invite linked to offering propagates source lineage to created booking', async () => {
    const linkedOffering: SessionOffering = {
      id: 'offering_lineage_1',
      source: 'event',
      sourceEntityId: 'event_1',
      coachId: 'coach_lineage_1',
      clubId: 'club_lineage',
      actingAs: 'club',
      ownerCoachId: 'coach_owner',
      assigneeCoachId: 'coach_assignee',
      createdByUserId: 'admin_creator',
      createdByRole: 'ADMIN',
      title: 'Club Showcase',
      description: 'Linked event offering',
      sessionType: 'group',
      maxParticipants: 20,
      location: 'Main Arena',
      scheduledAt: '2030-01-20T10:00:00.000Z',
      isRecurring: false,
      recurrenceType: 'none',
      status: 'active',
      registrations: [],
      createdAt: '2030-01-01T09:00:00.000Z',
    };
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [linkedOffering]);

    const slot = {
      date: '2030-01-20',
      startTime: '10:00',
      endTime: '11:00',
      location: 'Main Arena',
    };
    const invite = expectOk(
      await sessionInviteService.createInvite('athlete_lineage_1', {
        coachId: 'coach_lineage_1',
        coachName: 'Coach Lineage',
        parentId: 'parent_lineage_1',
        parentName: 'Parent Lineage',
        athleteNames: 'Athlete Lineage',
        proposedSlots: [],
        sessionType: 'Group Session',
        focus: 'Passing',
        existingSessionId: linkedOffering.id,
      }),
    );

    const accepted = expectOk(
      await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot: slot,
      }),
    );
    assert.equal(accepted.status, 'ACCEPTED');
    assert.ok(accepted.bookingId);

    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const created = bookings.find((booking) => booking.id === accepted.bookingId);
    assert.ok(created);
    assert.equal(created?.sessionSource, 'event');
    assert.equal(created?.sessionSourceEntityId, 'event_1');
    assert.equal(created?.clubId, 'club_lineage');
    assert.equal(created?.actingAs, 'club');
    assert.equal(created?.ownerCoachId, 'coach_owner');
    assert.equal(created?.assigneeCoachId, 'coach_assignee');
    assert.equal(created?.createdByUserId, 'admin_creator');
    assert.equal(created?.createdByRole, 'ADMIN');
  });

  it('accepting invite linked to group session infers group source lineage', async () => {
    const linkedGroupSession: GroupSession = {
      id: 'gs_lineage_1',
      coachId: 'coach_group_1',
      clubId: 'club_group_1',
      actingAs: 'club',
      ownerCoachId: 'coach_owner_group',
      assigneeCoachId: 'coach_assignee_group',
      createdByUserId: 'manager_group',
      createdByRole: 'ADMIN',
      title: 'U14 Training',
      description: 'Weekly block',
      sessionType: 'TRAINING',
      schedule: [{ date: '2030-01-21', startTime: '18:00', endTime: '19:00' }],
      maxParticipants: 18,
      currentParticipants: 10,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipant: 15,
      currency: 'GBP',
      location: 'Club Pitch',
      isVirtual: false,
      status: 'PUBLISHED',
      createdAt: '2030-01-01T09:00:00.000Z',
    };
    await apiClient.set(STORAGE_KEYS.GROUP_SESSIONS, [linkedGroupSession]);

    const slot = {
      date: '2030-01-21',
      startTime: '18:00',
      endTime: '19:00',
      location: 'Club Pitch',
    };
    const invite = expectOk(
      await sessionInviteService.createInvite('athlete_group_1', {
        coachId: 'coach_group_1',
        coachName: 'Coach Group',
        parentId: 'parent_group_1',
        parentName: 'Parent Group',
        athleteNames: 'Athlete Group',
        proposedSlots: [],
        sessionType: 'Training Session',
        focus: 'Defending',
        existingSessionId: linkedGroupSession.id,
      }),
    );

    const accepted = expectOk(
      await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot: slot,
      }),
    );
    assert.equal(accepted.status, 'ACCEPTED');
    assert.ok(accepted.bookingId);

    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const created = bookings.find((booking) => booking.id === accepted.bookingId);
    assert.ok(created);
    assert.equal(created?.sessionSource, 'group');
    assert.equal(created?.sessionSourceEntityId, linkedGroupSession.id);
    assert.equal(created?.clubId, linkedGroupSession.clubId);
    assert.equal(created?.actingAs, linkedGroupSession.actingAs);
    assert.equal(created?.ownerCoachId, linkedGroupSession.ownerCoachId);
    assert.equal(created?.assigneeCoachId, linkedGroupSession.assigneeCoachId);
    assert.equal(created?.createdByUserId, linkedGroupSession.createdByUserId);
    assert.equal(created?.createdByRole, linkedGroupSession.createdByRole);
  });

  it('fails closed instead of locally accepting recurring invites in API mode', async () => {
    const invite: SessionInvite = {
      id: 'inv_recurring_api_mode',
      coachId: 'coach_recurring_api',
      athleteIds: ['athlete_recurring_api'],
      parentId: 'parent_recurring_api',
      proposedSlots: [
        {
          date: '2030-02-01',
          startTime: '10:00',
          endTime: '11:00',
          location: 'Main Pitch',
        },
      ],
      sessionType: '1:1 Coaching',
      focus: 'First touch',
      status: 'PENDING',
      expiresAt: '2030-02-10T23:59:59.000Z',
      createdAt: '2030-01-20T09:00:00.000Z',
      isRecurring: true,
      recurrenceWeeks: 2,
    };
    const weekAcceptances: WeekAcceptance[] = [
      {
        weekDate: '2030-02-01',
        startTime: '10:00',
        endTime: '11:00',
        location: 'Main Pitch',
        accepted: true,
      },
    ];

    setInvitesCache([invite]);
    setApiMockMode(false);

    const result = await sessionInviteService.respondToRecurringInvite(
      invite.id,
      weekAcceptances,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'CONFLICT');
      assert.match(result.error.message, /backend invite authority/i);
    }

    setApiMockMode(true);
    const stored = await sessionInviteService.getInvite(invite.id);
    assert.equal(stored?.status, 'PENDING');
    assert.equal(stored?.bookingId, undefined);
  });
});
