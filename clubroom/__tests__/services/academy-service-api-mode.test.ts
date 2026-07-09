import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

async function trapGenericStorage() {
  const { apiClient } = await import('@/services/api-client');
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
    throw new Error('academy local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('academy local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('academy local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('academyService API mode', () => {
  it('does not initialize academy fixtures as API-mode caches', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/academy-service.ts'), 'utf8');

    assert.doesNotMatch(source, /let academiesCache:[^=]+=\s*\[\.\.\.MOCK_ACADEMIES\];/);
    assert.doesNotMatch(source, /let membershipsCache:[^=]+=\s*\[\.\.\.MOCK_MEMBERSHIPS\];/);
    assert.doesNotMatch(source, /let invitesCache:[^=]+=\s*\[\.\.\.MOCK_INVITES\];/);
    assert.ok(source.includes('USE_MOCK ? [...MOCK_ACADEMIES] : []'));
    assert.ok(source.includes('USE_MOCK ? [...MOCK_MEMBERSHIPS] : []'));
    assert.ok(source.includes('USE_MOCK ? [...MOCK_INVITES] : []'));
  });

  it('treats academy as a club-backed compatibility label without local storage', async () => {
    const [{ academyService }, { clubAuthorityService }, { clubService }, { ok }] =
      await Promise.all([
        import('@/services/academy-service'),
        import('@/services/club-authority-service'),
        import('@/services/club-service'),
        import('@/types/result'),
      ]);
    const restoreStorage = await trapGenericStorage();
    const authority = clubAuthorityService as unknown as {
      listClubs: typeof clubAuthorityService.listClubs;
      createClub: typeof clubAuthorityService.createClub;
      updateClubCommercialMode: typeof clubAuthorityService.updateClubCommercialMode;
      createInviteCode: typeof clubAuthorityService.createInviteCode;
      joinWithCode: typeof clubAuthorityService.joinWithCode;
      deleteClub: typeof clubAuthorityService.deleteClub;
    };
    const clubs = clubService as unknown as {
      updateBranding: typeof clubService.updateBranding;
      getMembers: typeof clubService.getMembers;
      changeMemberRole: typeof clubService.changeMemberRole;
      removeMember: typeof clubService.removeMember;
    };
    const originals = {
      listClubs: authority.listClubs,
      createClub: authority.createClub,
      updateClubCommercialMode: authority.updateClubCommercialMode,
      createInviteCode: authority.createInviteCode,
      joinWithCode: authority.joinWithCode,
      deleteClub: authority.deleteClub,
      updateBranding: clubs.updateBranding,
      getMembers: clubs.getMembers,
      changeMemberRole: clubs.changeMemberRole,
      removeMember: clubs.removeMember,
    };
    const calls: string[] = [];
    const club = {
      id: 'club_api_academy',
      name: 'North London Academy',
      tagline: 'Development first',
      city: 'London',
      memberCount: 4,
      coachCount: 3,
      squadCount: 2,
      ownerId: 'owner_api',
      inviteCode: 'NLA2026',
      commercialMode: 'COACH_OWNED' as const,
    };
    const ownerMembership = {
      clubId: club.id,
      userId: 'owner_api',
      role: 'OWNER' as const,
      status: 'active' as const,
      joinSource: 'created' as const,
    };

    authority.listClubs = async () => {
      calls.push('authority.listClubs');
      return ok({ clubs: [club], memberships: [ownerMembership] });
    };
    authority.createClub = async (input) => {
      calls.push(`authority.createClub:${input.name}`);
      return ok({
        club: { ...club, name: input.name, tagline: input.tagline, city: input.city },
        membership: ownerMembership,
        primaryInvite: {
          clubId: club.id,
          code: 'NLA2026',
          role: 'MEMBER',
          createdBy: 'owner_api',
          expiresAt: '2026-12-31T00:00:00.000Z',
          remainingUses: 10,
        },
      });
    };
    authority.updateClubCommercialMode = async (_clubId, commercialMode) => {
      calls.push(`authority.updateClubCommercialMode:${commercialMode}`);
      return ok({ ...club, commercialMode });
    };
    authority.createInviteCode = async (_clubId, role) => {
      calls.push(`authority.createInviteCode:${role}`);
      return ok({
        clubId: club.id,
        code: 'COACH26',
        role,
        createdBy: 'owner_api',
        expiresAt: '2026-12-31T00:00:00.000Z',
        remainingUses: 10,
      });
    };
    authority.joinWithCode = async (code) => {
      calls.push(`authority.joinWithCode:${code}`);
      return ok({
        outcome: 'joined',
        club,
        membership: {
          clubId: club.id,
          userId: 'coach_joined',
          role: 'COACH',
          status: 'active',
          joinSource: 'invite',
        },
        invite: null,
      });
    };
    authority.deleteClub = async (clubId) => {
      calls.push(`authority.deleteClub:${clubId}`);
      return ok(true);
    };
    clubs.updateBranding = async (clubId, branding) => {
      calls.push(`club.updateBranding:${clubId}`);
      return ok({
        clubId,
        name: branding.name ?? club.name,
        tagline: branding.tagline ?? club.tagline,
        badgeUrl: branding.badgeUrl ?? 'https://example.test/default-badge.png',
        coverPhotoUrl: branding.coverPhotoUrl ?? 'https://example.test/default-cover.png',
        primaryColor: branding.primaryColor ?? '#111111',
        secondaryColor: branding.secondaryColor ?? '#eeeeee',
        updatedAt: '2026-07-07T12:00:00.000Z',
      });
    };
    clubs.getMembers = async (clubId) => {
      calls.push(`club.getMembers:${clubId}`);
      return [
        {
          userId: 'owner_api',
          userName: 'Owner',
          role: 'OWNER',
          status: 'active',
          joinedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          userId: 'coach_api',
          userName: 'Coach',
          role: 'COACH',
          status: 'active',
          joinedAt: '2026-01-02T00:00:00.000Z',
        },
      ];
    };
    clubs.changeMemberRole = async (clubId, userId, role) => {
      calls.push(`club.changeMemberRole:${clubId}:${userId}:${role}`);
      return ok({
        userId,
        userName: 'Coach',
        role,
        status: 'active',
        joinedAt: '2026-01-02T00:00:00.000Z',
      });
    };
    clubs.removeMember = async (clubId, userId) => {
      calls.push(`club.removeMember:${clubId}:${userId}`);
      return ok({
        id: 'rem_api_academy',
        clubId,
        userId,
        userName: 'Coach',
        userRole: 'COACH',
        reason: 'OTHER',
        removedBy: 'api',
        removedByName: 'API actor',
        removedAt: '2026-07-07T12:00:00.000Z',
      });
    };

    try {
      const discovered = await academyService.discoverAcademies();
      assert.equal(discovered.success, true);
      assert.equal(discovered.success && discovered.data[0]?.id, club.id);

      const owned = await academyService.getUserAcademies('owner_api');
      assert.equal(owned.success, true);
      assert.equal(owned.success && owned.data[0]?.membership.role, 'OWNER');

      const created = await academyService.createAcademy({
        name: 'API Academy',
        description: 'Created through club authority',
        postcode: 'N1',
        city: 'London',
        ownerId: 'owner_api',
        ownerName: 'Owner',
      });
      assert.equal(created.success, true);
      assert.equal(created.success && created.data.name, 'API Academy');

      const branded = await academyService.updateBranding(club.id, {
        logoUrl: 'https://example.test/logo.png',
        primaryColor: '#123456',
      });
      assert.equal(branded.success, true);
      assert.equal(branded.success && branded.data.logoUrl, 'https://example.test/logo.png');

      const settings = await academyService.updateSettings(club.id, {
        name: 'Renamed Academy',
        description: 'Updated description',
      });
      assert.equal(settings.success, true);
      assert.equal(settings.success && settings.data.slug, 'renamed-academy');

      const visibility = await academyService.updateSettings(club.id, { isPublic: false });
      assert.equal(visibility.success, false);
      if (!visibility.success) {
        assert.equal(visibility.error.code, 'UNSUPPORTED');
      }

      const commercial = await academyService.updateCommercialMode(club.id, 'ORG_OWNED');
      assert.equal(commercial.success, true);
      assert.equal(commercial.success && commercial.data.commercialMode, 'ORG_OWNED');

      const staff = await academyService.getStaff(club.id);
      assert.equal(staff.success, true);
      assert.deepEqual(staff.success && staff.data.map((member) => member.userId), [
        'owner_api',
        'coach_api',
      ]);

      const invite = await academyService.createInvite(
        club.id,
        club.name,
        'COACH',
        ['CREATE_SESSIONS'],
        'owner_api',
        'Owner',
      );
      assert.equal(invite.success, true);
      assert.equal(invite.success && invite.data.code, 'COACH26');

      const joined = await academyService.joinWithCode('COACH26', 'coach_joined', 'Joined Coach');
      assert.equal(joined.success, true);
      assert.equal(joined.success && joined.data.role, 'COACH');

      const role = await academyService.updateMemberRole(`${club.id}:coach_api`, 'HEAD_COACH', [
        'CREATE_SESSIONS',
      ]);
      assert.equal(role.success, true);
      assert.equal(role.success && role.data.role, 'HEAD_COACH');

      const removed = await academyService.removeMember(`${club.id}:coach_api`);
      assert.equal(removed.success, true);

      const deleted = await academyService.deleteAcademy(club.id);
      assert.equal(deleted.success, true);
    } finally {
      authority.listClubs = originals.listClubs;
      authority.createClub = originals.createClub;
      authority.updateClubCommercialMode = originals.updateClubCommercialMode;
      authority.createInviteCode = originals.createInviteCode;
      authority.joinWithCode = originals.joinWithCode;
      authority.deleteClub = originals.deleteClub;
      clubs.updateBranding = originals.updateBranding;
      clubs.getMembers = originals.getMembers;
      clubs.changeMemberRole = originals.changeMemberRole;
      clubs.removeMember = originals.removeMember;
      restoreStorage();
    }

    assert.deepEqual(calls, [
      'authority.listClubs',
      'authority.listClubs',
      'authority.createClub:API Academy',
      'authority.listClubs',
      'club.updateBranding:club_api_academy',
      'authority.listClubs',
      'club.updateBranding:club_api_academy',
      'authority.updateClubCommercialMode:ORG_OWNED',
      'club.getMembers:club_api_academy',
      'authority.createInviteCode:COACH',
      'authority.joinWithCode:COACH26',
      'club.changeMemberRole:club_api_academy:coach_api:HEAD_COACH',
      'club.removeMember:club_api_academy:coach_api',
      'authority.deleteClub:club_api_academy',
    ]);
  });
});
