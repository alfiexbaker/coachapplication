import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { apiClient } from '@/services/api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { bookingService } from '@/services/booking';
import {
  getInvitesCache,
  loadFromStorage,
  saveToStorage,
  sessionInviteService,
  setInvitesCache,
} from '@/services/invite/session-invite-service';
import { sessionInviteAuthorityService } from '@/services/invite/session-invite-authority-service';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import type { Result, ServiceError } from '@/types/result';
import { err, serviceError } from '@/types/result';
import type { GroupSession, SessionInvite, WeekAcceptance } from '@/constants/types';

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
    await apiClient.set(STORAGE_KEYS.GROUP_SESSIONS, []);
    await sessionInviteService.clearCache();
    setInvitesCache([]);
  });

  it('creates invite and retrieves it by id', async () => {
    const parentId = nextId('parent');
    const invite = expectOk(
      await sessionInviteService.createInvite(nextId('athlete'), {
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
      }),
    );

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.ok(fetched);
    assert.equal(fetched?.id, invite.id);
    assert.equal(fetched?.parentId, parentId);
    assert.equal(fetched?.status, 'PENDING');
  });

  it('rejects unresolved placeholder invite context before API writes', async () => {
    setApiMockMode(false);
    try {
      await assert.rejects(
        () =>
          sessionInviteService._createSingleInvite({
            coachId: 'coach_live',
            coachName: 'Coach',
            athleteIds: ['athlete_live'],
            athleteNames: ['Athlete 1'],
            parentId: 'parent_live',
            parentName: 'Parent',
            proposedSlots: [{ date: '2030-01-01', startTime: '10:00', endTime: '11:00' }],
            sessionType: '1:1 Coaching',
            focus: 'General',
          }),
        (error) => {
          assert.equal((error as ServiceError).code, 'VALIDATION');
          return true;
        },
      );
    } finally {
      setApiMockMode(true);
    }
  });

  it('fails closed on API-mode invite read failures', async (t) => {
    setApiMockMode(false);
    const original = {
      getInviteHistory: sessionInviteAuthorityService.getInviteHistory,
      getInvite: sessionInviteAuthorityService.getInvite,
      getOpenInvites: sessionInviteAuthorityService.getOpenInvites,
      getClosedInvitesForParent: sessionInviteAuthorityService.getClosedInvitesForParent,
      getSquadOnlyInvitesForParent: sessionInviteAuthorityService.getSquadOnlyInvitesForParent,
      getAvailableInvitesForParent: sessionInviteAuthorityService.getAvailableInvitesForParent,
    };
    const apiDown = err(serviceError('NETWORK', 'session invite api down'));

    sessionInviteAuthorityService.getInviteHistory = async () => apiDown;
    sessionInviteAuthorityService.getInvite = async () => apiDown;
    sessionInviteAuthorityService.getOpenInvites = async () => apiDown;
    sessionInviteAuthorityService.getClosedInvitesForParent = async () => apiDown;
    sessionInviteAuthorityService.getSquadOnlyInvitesForParent = async () => apiDown;
    sessionInviteAuthorityService.getAvailableInvitesForParent = async () => apiDown;

    t.after(() => {
      sessionInviteAuthorityService.getInviteHistory = original.getInviteHistory;
      sessionInviteAuthorityService.getInvite = original.getInvite;
      sessionInviteAuthorityService.getOpenInvites = original.getOpenInvites;
      sessionInviteAuthorityService.getClosedInvitesForParent =
        original.getClosedInvitesForParent;
      sessionInviteAuthorityService.getSquadOnlyInvitesForParent =
        original.getSquadOnlyInvitesForParent;
      sessionInviteAuthorityService.getAvailableInvitesForParent =
        original.getAvailableInvitesForParent;
      setApiMockMode(true);
    });

    const rejectsWithApiDown = (error: unknown) => {
      assert.equal((error as ServiceError).code, 'NETWORK');
      assert.match((error as ServiceError).message, /session invite api down/i);
      return true;
    };

    await assert.rejects(() => sessionInviteService.getInviteHistory(), rejectsWithApiDown);
    await assert.rejects(() => sessionInviteService.getInvite('invite_api_down'), rejectsWithApiDown);
    await assert.rejects(() => sessionInviteService.getOpenInvites(), rejectsWithApiDown);
    await assert.rejects(
      () => sessionInviteService.getClosedInvitesForParent('parent_api_down'),
      rejectsWithApiDown,
    );
    await assert.rejects(
      () =>
        sessionInviteService.getSquadOnlyInvitesForParent('parent_api_down', ['squad_api_down']),
      rejectsWithApiDown,
    );
    await assert.rejects(
      () => sessionInviteService.getAvailableInvitesForParent('parent_api_down', ['squad_api_down']),
      rejectsWithApiDown,
    );
    await assert.rejects(
      () => sessionInviteService.getPendingInvites(),
      (error) => {
        assert.equal((error as ServiceError).code, 'VALIDATION');
        assert.match((error as ServiceError).message, /parent context/i);
        return true;
      },
    );
  });

  it('responds to invite with DECLINED and updates status', async () => {
    const invite = expectOk(
      await sessionInviteService.createInvite(nextId('athlete'), {
        coachId: nextId('coach'),
        coachName: 'Coach Test',
        parentId: nextId('parent'),
        parentName: 'Parent Test',
        athleteNames: 'Athlete Test',
        proposedSlots: [],
        sessionType: '1:1 Coaching',
        focus: 'Finishing',
      }),
    );

    const updated = expectOk(
      await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'DECLINED',
      }),
    );
    assert.equal(updated.status, 'DECLINED');
  });

  it('cancels invite and excludes it from open invites', async () => {
    const invite = expectOk(
      await sessionInviteService.createInvite(nextId('athlete'), {
        coachId: nextId('coach'),
        coachName: 'Coach Test',
        parentId: nextId('parent'),
        parentName: 'Parent Test',
        athleteNames: 'Athlete Test',
        proposedSlots: [],
        sessionType: '1:1 Coaching',
        focus: 'Dribbling',
      }),
    );

    await sessionInviteService.cancelInvite(invite.id);

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.equal(fetched?.status, 'EXPIRED');

    const openInvites = await sessionInviteService.getOpenInvites();
    assert.ok(!openInvites.some((item) => item.id === invite.id));
  });

  it('matches canonical aliases in coach/parent invite lookups', async () => {
    const created = expectOk(
      await sessionInviteService.createInvite(POC_ACCOUNT_IDS.athleteStorage, {
        coachId: POC_ACCOUNT_IDS.coachStorage,
        coachName: 'Coach Alias',
        parentId: POC_ACCOUNT_IDS.parent,
        parentName: 'Parent Alias',
        athleteNames: 'Athlete Alias',
        proposedSlots: [],
        sessionType: '1:1 Coaching',
        focus: 'Passing',
      }),
    );

    const byCoach = await sessionInviteService.getCoachInvites(POC_ACCOUNT_IDS.coach);
    const byParent = await sessionInviteService.getParentInvites(POC_ACCOUNT_IDS.parent);

    assert.ok(byCoach.length >= 1);
    assert.ok(byParent.length >= 1);
    assert.ok(byCoach.some((invite) => invite.id === created.id));
    assert.ok(byParent.some((invite) => invite.id === created.id));
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

    const created = await bookingService.getBooking(accepted.bookingId);
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

    const result = await sessionInviteService.respondToRecurringInvite(invite.id, weekAcceptances);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'UNAUTHORIZED');
      assert.match(result.error.message, /sign in/i);
    }

    setApiMockMode(true);
    const stored = await sessionInviteService.getInvite(invite.id);
    assert.equal(stored?.status, 'PENDING');
    assert.equal(stored?.bookingId, undefined);
  });

  it('keeps exported invite cache helpers inert in API mode', async () => {
    const invite: SessionInvite = {
      id: 'inv_api_helper_local',
      coachId: 'coach_api_helper',
      athleteIds: ['athlete_api_helper'],
      parentId: 'parent_api_helper',
      proposedSlots: [
        {
          date: '2030-05-01',
          startTime: '10:00',
          endTime: '11:00',
          location: 'Main Pitch',
        },
      ],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
      status: 'PENDING',
      expiresAt: '2030-05-10T23:59:59.000Z',
      createdAt: '2030-04-20T09:00:00.000Z',
    };

    setApiMockMode(false);

    const saveResult = await saveToStorage([invite]);
    setInvitesCache([invite]);

    assert.equal(saveResult.success, false);
    if (!saveResult.success) {
      assert.equal(saveResult.error.code, 'UNSUPPORTED');
      assert.deepEqual(saveResult.error.details, { authority: '/v1/invites' });
    }
    assert.deepEqual(await loadFromStorage(), []);
    assert.deepEqual(getInvitesCache(), []);
  });

  it('fails closed for pending invite reads without parent context in API mode', async () => {
    const invite: SessionInvite = {
      id: 'inv_pending_local_only',
      coachId: 'coach_pending_local',
      athleteIds: ['athlete_pending_local'],
      parentId: 'parent_pending_local',
      proposedSlots: [
        {
          date: '2030-04-01',
          startTime: '10:00',
          endTime: '11:00',
          location: 'Main Pitch',
        },
      ],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
      status: 'PENDING',
      expiresAt: '2030-04-10T23:59:59.000Z',
      createdAt: '2030-03-20T09:00:00.000Z',
    };
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    setInvitesCache([invite]);
    setApiMockMode(false);
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('pending invite read without parent context should fail closed');
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => sessionInviteService.getPendingInvites(),
        (error) => {
          assert.equal((error as ServiceError).code, 'VALIDATION');
          assert.match((error as ServiceError).message, /parent context/i);
          return true;
        },
      );
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
      setApiMockMode(true);
    }
  });

  it('rejects fabricated API create context before backend write', async () => {
    setApiMockMode(false);
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('API create should not be called for fabricated invite context');
    }) as typeof fetch;

    try {
      const result = await sessionInviteService.createInvite(['athlete_api_default'], {
        coachId: 'coach_api_default',
        coachName: 'Coach',
        parentId: 'parent_api_default',
        parentName: 'Parent',
        proposedSlots: [
          {
            date: '2030-03-01',
            startTime: '10:00',
            endTime: '11:00',
            location: 'Main Pitch',
          },
        ],
        sessionType: 'Existing Session',
        focus: 'General',
        price: 0,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
        assert.match(result.error.message, /resolved live invite context/i);
        const details = result.error.details as { issues?: string[] };
        assert.ok(details.issues?.some((issue) => issue.includes('coachName')));
        assert.ok(details.issues?.some((issue) => issue.includes('parentName')));
        assert.ok(details.issues?.some((issue) => issue.includes('athleteNames')));
        assert.ok(details.issues?.some((issue) => issue.includes('focus')));
      }
      assert.equal(fetchCalls, 0);
      assert.deepEqual(getInvitesCache(), []);
    } finally {
      globalThis.fetch = originalFetch;
      setApiMockMode(true);
    }
  });

  it('keeps API-mode invite hooks free of generic create payload defaults', () => {
    const inviteFlowSource = readFileSync(
      `${process.cwd()}/hooks/use-invite-session-flow.ts`,
      'utf8',
    );
    const createSessionSource = readFileSync(
      `${process.cwd()}/hooks/use-create-session.ts`,
      'utf8',
    );

    assert.doesNotMatch(inviteFlowSource, /coachName:\s*'Coach'/);
    assert.doesNotMatch(inviteFlowSource, /parentName:[^\n]*'Parent'/);
    assert.doesNotMatch(inviteFlowSource, /focus:\s*'General'/);
    assert.doesNotMatch(inviteFlowSource, /price:\s*0/);
    assert.doesNotMatch(createSessionSource, /\|\|\s*'Coach'/);
    assert.doesNotMatch(createSessionSource, /parentName:[^\n]*'Parent'/);
  });
});
