import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('squad invite API mode', () => {
  it('initializes session invite fixtures empty outside mock mode', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'services/invite/session-invite-service.ts'),
      'utf8',
    );

    assert.ok(
      source.includes(
        'let invitesCache: SessionInvite[] = isMockMode() ? cloneInvites(MOCK_INVITES) : []',
      ),
    );
    assert.ok(source.includes('return isMockMode() ? cloneInvites(MOCK_INVITES) : []'));
    assert.ok(source.includes('invitesCache = isMockMode() ? cloneInvites(MOCK_INVITES) : []'));
  });

  it('fails closed when legacy squad invite mirrors are called', async (t) => {
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

    await assert.rejects(() => squadInviteModule.loadSquadInvites(), /unavailable in API mode/);
    await assert.rejects(
      () => squadInviteModule.loadSquadSessionInvites(),
      /unavailable in API mode/,
    );
    await assert.rejects(() => squadInviteModule.loadInviteHistory(), /unavailable in API mode/);
    await assert.rejects(
      () => squadInviteModule.saveSquadInvites([]),
      /unavailable in API mode/,
    );
    await assert.rejects(
      () => squadInviteModule.saveSquadSessionInvites([]),
      /unavailable in API mode/,
    );
    await assert.rejects(
      () => squadInviteModule.saveInviteHistory([]),
      /unavailable in API mode/,
    );
    await assert.doesNotReject(() => squadInviteModule.squadInviteService.clearCache());
  });

  it('fails closed when exported squad invite cache helpers are called in API mode', async () => {
    const squadInviteModule = await import('@/services/invite/squad-invite-service');
    const squadInvite = {
      id: 'squad_invite_local',
      squadId: 'squad_local',
      targetType: 'SESSION' as const,
      targetId: 'session_local',
      invitedBy: 'coach_local',
      invitedAt: '2030-01-01T10:00:00.000Z',
      memberCount: 1,
      responses: {
        accepted: 0,
        declined: 0,
        pending: 1,
      },
    };
    const squadSessionInvite = {
      id: 'squad_session_invite_local',
      squadId: 'squad_local',
      sessionId: 'session_local',
      invitedMembers: [],
      sentAt: '2030-01-01T10:00:00.000Z',
      sentBy: 'coach_local',
      status: 'SENT' as const,
      result: {
        sent: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
        totalAttempted: 1,
        errors: [],
      },
    };
    const history = {
      id: 'squad_history_local',
      squadId: 'squad_local',
      sessionId: 'session_local',
      sessionType: 'Training',
      focus: 'Passing',
      sentAt: '2030-01-01T10:00:00.000Z',
      sentBy: 'coach_local',
      inviteCount: 1,
      acceptedCount: 0,
      declinedCount: 0,
      pendingCount: 1,
      status: 'ACTIVE' as const,
    };

    assert.throws(
      () => squadInviteModule.setSquadInvitesCache([squadInvite]),
      /unavailable in API mode/,
    );
    assert.throws(
      () => squadInviteModule.setSquadSessionInvitesCache([squadSessionInvite]),
      /unavailable in API mode/,
    );
    assert.throws(
      () => squadInviteModule.setInviteHistoryCache([history]),
      /unavailable in API mode/,
    );
    assert.throws(() => squadInviteModule.getSquadInvitesCache(), /unavailable in API mode/);
    assert.throws(
      () => squadInviteModule.getSquadSessionInvitesCache(),
      /unavailable in API mode/,
    );
    assert.throws(() => squadInviteModule.getInviteHistoryCache(), /unavailable in API mode/);
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

  it('projects live squad-only session invites into squad history', async (t) => {
    const [{ apiClient }, { squadInviteService }, { sessionInviteAuthorityService }, { ok }] =
      await Promise.all([
        import('@/services/api-client'),
        import('@/services/invite/squad-invite-service'),
        import('@/services/invite/session-invite-authority-service'),
        import('@/types/result'),
      ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const authority = sessionInviteAuthorityService as unknown as {
      getInviteHistory: typeof sessionInviteAuthorityService.getInviteHistory;
    };
    const original = {
      get: client.get,
      getInviteHistory: authority.getInviteHistory,
    };

    client.get = async () => {
      throw new Error('local squad invite history should not be read in API mode');
    };
    authority.getInviteHistory = async () =>
      ok([
        {
          id: 'invite_parent_one',
          coachId: 'coach_live',
          clubName: 'Live Club',
          inviteType: 'SQUAD_ONLY',
          squadIds: ['squad_live'],
          athleteIds: ['athlete_one'],
          parentId: 'parent_one',
          proposedSlots: [{ date: '2026-08-01', startTime: '10:00', endTime: '11:00' }],
          sessionType: 'Group Session',
          focus: 'Passing',
          status: 'PENDING',
          expiresAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2026-07-01T10:00:00.000Z',
          groupId: 'group_live',
          existingSessionId: 'session_live',
        },
        {
          id: 'invite_parent_two',
          coachId: 'coach_live',
          clubName: 'Live Club',
          inviteType: 'SQUAD_ONLY',
          squadIds: ['squad_live'],
          athleteIds: ['athlete_two'],
          parentId: 'parent_two',
          proposedSlots: [{ date: '2026-08-01', startTime: '10:00', endTime: '11:00' }],
          sessionType: 'Group Session',
          focus: 'Passing',
          status: 'ACCEPTED',
          expiresAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2026-07-01T10:05:00.000Z',
          groupId: 'group_live',
          existingSessionId: 'session_live',
        },
        {
          id: 'invite_open',
          coachId: 'coach_live',
          inviteType: 'OPEN',
          athleteIds: ['athlete_three'],
          parentId: 'parent_three',
          proposedSlots: [{ date: '2026-08-01', startTime: '10:00', endTime: '11:00' }],
          sessionType: 'Open Session',
          focus: 'Finishing',
          status: 'PENDING',
          expiresAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2026-07-01T10:10:00.000Z',
        },
      ]);

    t.after(() => {
      client.get = original.get;
      authority.getInviteHistory = original.getInviteHistory;
    });

    const history = await squadInviteService.getSquadInviteHistory('squad_live');

    assert.equal(history.length, 1);
    assert.deepEqual(
      history.map((entry) => ({
        id: entry.id,
        squadId: entry.squadId,
        sessionId: entry.sessionId,
        inviteCount: entry.inviteCount,
        acceptedCount: entry.acceptedCount,
        declinedCount: entry.declinedCount,
        pendingCount: entry.pendingCount,
        status: entry.status,
      })),
      [
        {
          id: 'squad_history_group_live_squad_live',
          squadId: 'squad_live',
          sessionId: 'session_live',
          inviteCount: 2,
          acceptedCount: 1,
          declinedCount: 0,
          pendingCount: 1,
          status: 'ACTIVE',
        },
      ],
    );
  });

  it('uses live squad invite rows for pending member metadata', async (t) => {
    const [
      { apiClient },
      { squadInviteService },
      { sessionInviteAuthorityService },
      { squadService },
      { ok },
    ] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/invite/squad-invite-service'),
      import('@/services/invite/session-invite-authority-service'),
      import('@/services/squad-service'),
      import('@/types/result'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const authority = sessionInviteAuthorityService as unknown as {
      getInviteHistory: typeof sessionInviteAuthorityService.getInviteHistory;
    };
    const squad = squadService as unknown as {
      getSquadMembers: typeof squadService.getSquadMembers;
    };
    const original = {
      get: client.get,
      getInviteHistory: authority.getInviteHistory,
      getSquadMembers: squad.getSquadMembers,
    };

    client.get = async () => {
      throw new Error('local squad session invites should not be read in API mode');
    };
    squad.getSquadMembers = async () => [
      {
        id: 'member_one',
        squadId: 'squad_live',
        athleteId: 'athlete_one',
        parentId: 'parent_one',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'member_two',
        squadId: 'squad_live',
        athleteId: 'athlete_two',
        parentId: 'parent_two',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    authority.getInviteHistory = async () =>
      ok([
        {
          id: 'invite_parent_one',
          coachId: 'coach_live',
          inviteType: 'SQUAD_ONLY',
          squadIds: ['squad_live'],
          athleteIds: ['athlete_one'],
          parentId: 'parent_one',
          proposedSlots: [{ date: '2026-08-01', startTime: '10:00', endTime: '11:00' }],
          sessionType: 'Group Session',
          focus: 'Passing',
          status: 'PENDING',
          expiresAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2026-07-01T10:00:00.000Z',
          groupId: 'group_live',
          existingSessionId: 'session_live',
        },
      ]);

    t.after(() => {
      client.get = original.get;
      authority.getInviteHistory = original.getInviteHistory;
      squad.getSquadMembers = original.getSquadMembers;
    });

    const members = await squadInviteService.getSquadMembersWithMetadata(
      'squad_live',
      'session_live',
    );

    assert.deepEqual(
      members.map((member) => ({
        id: member.id,
        hasPendingInvite: member.hasPendingInvite,
        lastInvitedAt: member.lastInvitedAt,
      })),
      [
        {
          id: 'member_one',
          hasPendingInvite: true,
          lastInvitedAt: '2026-07-01T10:00:00.000Z',
        },
        {
          id: 'member_two',
          hasPendingInvite: false,
          lastInvitedAt: undefined,
        },
      ],
    );
  });
});
