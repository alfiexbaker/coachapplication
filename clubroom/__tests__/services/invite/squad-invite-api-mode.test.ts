import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('squad invite API mode', () => {
  it('keeps legacy squad invite mirrors no-op instead of local storage backed', async (t) => {
    const [{ apiClient }, squadInviteModule] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/invite/squad-invite-service'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const original = {
      get: client.get,
      set: client.set,
      remove: client.remove,
    };
    client.get = async () => {
      throw new Error('local squad invite storage read should not be used in API mode');
    };
    client.set = async () => {
      throw new Error('local squad invite storage write should not be used in API mode');
    };
    client.remove = async () => {
      throw new Error('local squad invite storage removal should not be used in API mode');
    };
    t.after(() => {
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
    });

    assert.deepEqual(await squadInviteModule.loadSquadInvites(), []);
    assert.deepEqual(await squadInviteModule.loadSquadSessionInvites(), []);
    assert.deepEqual(await squadInviteModule.loadInviteHistory(), []);
    await assert.doesNotReject(() => squadInviteModule.saveSquadInvites([]));
    await assert.doesNotReject(() => squadInviteModule.saveSquadSessionInvites([]));
    await assert.doesNotReject(() => squadInviteModule.saveInviteHistory([]));
    await assert.doesNotReject(() => squadInviteModule.squadInviteService.clearCache());
  });

  it('passes squad context through the session invite authority payload', async (t) => {
    const [
      { apiClient },
      { bulkInviteService },
      { sessionInviteService },
      { squadService },
      { rosterService },
      { userService },
      { notificationService },
      { ok },
    ] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/invite/bulk-invite-service'),
      import('@/services/invite/session-invite-service'),
      import('@/services/squad-service'),
      import('@/services/roster-service'),
      import('@/services/user-service'),
      import('@/services/notification-service'),
      import('@/types/result'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
    };
    const squad = squadService as unknown as {
      getSquad: typeof squadService.getSquad;
      getSquadMembers: typeof squadService.getSquadMembers;
    };
    const roster = rosterService as unknown as {
      getRoster: typeof rosterService.getRoster;
    };
    const users = userService as unknown as {
      getUserById: typeof userService.getUserById;
    };
    const invites = sessionInviteService as unknown as {
      _createSingleInvite: typeof sessionInviteService._createSingleInvite;
    };
    const notifications = notificationService as unknown as {
      create: typeof notificationService.create;
    };

    const capturedInputs: unknown[] = [];
    const original = {
      get: client.get,
      set: client.set,
      getSquad: squad.getSquad,
      getSquadMembers: squad.getSquadMembers,
      getRoster: roster.getRoster,
      getUserById: users.getUserById,
      createSingleInvite: invites._createSingleInvite,
      createNotification: notifications.create,
    };

    client.get = async () => {
      throw new Error('local squad invite storage read should not be used in API mode');
    };
    client.set = async () => {
      throw new Error('local squad invite storage write should not be used in API mode');
    };
    squad.getSquad = async () => ({
      id: 'squad_live',
      clubId: 'club_live',
      name: 'U12 Reds',
      level: 'U12',
      memberCount: 1,
      primaryCoach: 'coach_live',
      meetLocation: 'Pitch A',
    });
    squad.getSquadMembers = async () => [
      {
        id: 'member_live',
        squadId: 'squad_live',
        athleteId: 'athlete_live',
        parentId: 'parent_live',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    roster.getRoster = async () => [
      {
        id: 'roster_live',
        coachId: 'coach_live',
        athleteId: 'athlete_live',
        parentId: 'parent_live',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        totalSessions: 0,
        totalRevenue: 0,
        averageRating: 0,
        notes: [],
        tags: [],
        notificationPreference: 'ALL',
      },
    ];
    users.getUserById = async (userId: string) =>
      ok({
        id: userId,
        role: userId === 'coach_live' ? 'COACH' : 'USER',
        name:
          userId === 'parent_live'
            ? 'Parent Live'
            : userId === 'athlete_live'
              ? 'Athlete Live'
              : 'Coach Live',
        email: `${userId}@example.com`,
        postcode: 'SW1A 1AA',
        dateOfBirth: '2012-01-01',
      });
    invites._createSingleInvite = async (input) => {
      capturedInputs.push(input);
      return {
        id: `invite_${capturedInputs.length}`,
        coachId: input.coachId,
        clubName: input.clubName,
        inviteType: input.inviteType,
        squadIds: input.squadIds,
        athleteIds: input.athleteIds,
        parentId: input.parentId,
        proposedSlots: input.proposedSlots,
        sessionType: input.sessionType,
        focus: input.focus,
        notes: input.notes,
        price: input.price,
        status: 'PENDING',
        expiresAt: '2026-02-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        groupId: input.groupId,
        existingSessionId: input.existingSessionId,
      };
    };
    notifications.create = async () => ok([]);

    t.after(() => {
      client.get = original.get;
      client.set = original.set;
      squad.getSquad = original.getSquad;
      squad.getSquadMembers = original.getSquadMembers;
      roster.getRoster = original.getRoster;
      users.getUserById = original.getUserById;
      invites._createSingleInvite = original.createSingleInvite;
      notifications.create = original.createNotification;
    });

    const proposedSlots = [{ date: '2026-01-10', startTime: '10:00', endTime: '11:00' }];
    const bulkResult = await bulkInviteService.createBulkInvite({
      squadId: 'squad_live',
      sessionId: 'session_live',
      sessionTitle: 'U12 Reds Training',
      coachId: 'coach_live',
      coachName: 'Coach Live',
      proposedSlots,
      sessionType: 'Group Session',
      focus: 'Passing',
      expiresInDays: 7,
    });
    assert.equal(bulkResult.success, true);

    const autoResult = await bulkInviteService.inviteSquadToSession({
      squadId: 'squad_live',
      sessionId: 'session_auto',
      sessionTitle: 'Auto Squad Training',
      coachId: 'coach_live',
      coachName: 'Coach Live',
      proposedSlots,
      sessionType: 'Group Session',
      focus: 'Passing',
    });
    assert.equal(autoResult.failed, 0);

    assert.equal(capturedInputs.length, 2);
    assert.deepEqual(
      capturedInputs.map((input) => ({
        inviteType: (input as { inviteType?: string }).inviteType,
        squadIds: (input as { squadIds?: string[] }).squadIds,
        existingSessionId: (input as { existingSessionId?: string }).existingSessionId,
      })),
      [
        {
          inviteType: 'SQUAD_ONLY',
          squadIds: ['squad_live'],
          existingSessionId: 'session_live',
        },
        {
          inviteType: 'SQUAD_ONLY',
          squadIds: ['squad_live'],
          existingSessionId: 'session_auto',
        },
      ],
    );
  });
});
