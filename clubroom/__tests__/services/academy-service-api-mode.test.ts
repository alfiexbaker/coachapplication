import assert from 'node:assert/strict';
import Module from 'node:module';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

type ModuleLoader = typeof Module & {
  _load: (request: string, parent: NodeJS.Module | null, isMain: boolean) => unknown;
};

function stubGroupSessionImport(): () => void {
  const loader = Module as ModuleLoader;
  const originalLoad = loader._load;
  loader._load = function (
    this: unknown,
    request: string,
    parent: NodeJS.Module | null,
    isMain: boolean,
  ) {
    if (request === '@/services/group-session') {
      return {
        groupSessionService: {
          getSession: async () => null,
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  return () => {
    loader._load = originalLoad;
  };
}

function makeClub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'club_api_alias',
    name: 'API Alias Academy',
    city: 'London',
    country: 'UK',
    badge: 'AAA',
    tagline: 'Club-backed academy alias',
    memberCount: 1,
    coachCount: 1,
    squadCount: 0,
    ownerId: 'owner_api_alias',
    inviteCode: 'ALIAS-1234',
    commercialMode: 'COACH_OWNED' as const,
    ...overrides,
  };
}

describe('academyService API mode', () => {
  it('delegates compatible academy management aliases to club authority', async (t) => {
    const restoreGroupSessionImport = stubGroupSessionImport();
    t.after(restoreGroupSessionImport);
    const [{ academyService }, { clubAuthorityService }] = await Promise.all([
      import('@/services/academy-service'),
      import('@/services/club-authority-service'),
    ]);
    const original = {
      createClub: clubAuthorityService.createClub,
      updateClubCommercialMode: clubAuthorityService.updateClubCommercialMode,
      deleteClub: clubAuthorityService.deleteClub,
    };
    t.after(() => {
      clubAuthorityService.createClub = original.createClub;
      clubAuthorityService.updateClubCommercialMode = original.updateClubCommercialMode;
      clubAuthorityService.deleteClub = original.deleteClub;
    });

    let createInput: { name?: string; tagline?: string; commercialMode?: string } | undefined;
    let modeInput: { clubId: string; commercialMode: string } | undefined;
    let deletedClubId: string | undefined;

    (clubAuthorityService as any).createClub = async (input: any) => {
      createInput = input;
      return {
        success: true,
        data: {
          club: makeClub({
            id: 'club_created_alias',
            name: input.name,
            city: input.city,
            tagline: input.tagline,
            commercialMode: input.commercialMode,
          }),
          membership: {
            clubId: 'club_created_alias',
            userId: input.ownerId,
            role: 'OWNER',
            status: 'active',
            joinSource: 'created',
            canPostAsClub: true,
          },
          primaryInvite: {
            code: 'ALIAS-1234',
            clubId: 'club_created_alias',
            createdBy: input.ownerId,
            role: 'MEMBER',
            expiresAt: '2030-01-01T00:00:00.000Z',
            remainingUses: 999,
          },
        },
      };
    };
    (clubAuthorityService as any).updateClubCommercialMode = async (
      clubId: string,
      commercialMode: string,
    ) => {
      modeInput = { clubId, commercialMode };
      return {
        success: true,
        data: makeClub({ id: clubId, commercialMode }),
      };
    };
    (clubAuthorityService as any).deleteClub = async (clubId: string) => {
      deletedClubId = clubId;
      return { success: true, data: true };
    };

    const created = await academyService.createAcademy({
      name: 'API Alias Academy',
      description: 'Club-backed academy alias',
      postcode: 'E8 1AB',
      city: 'London',
      ownerId: 'owner_api_alias',
      ownerName: 'Owner Alias',
    });
    assert.equal(created.success, true);
    if (!created.success) return;
    assert.equal(created.data.id, 'club_created_alias');
    assert.equal(createInput?.name, 'API Alias Academy');
    assert.equal(createInput?.tagline, 'Club-backed academy alias');
    assert.equal(createInput?.commercialMode, 'COACH_OWNED');

    const updatedMode = await academyService.updateCommercialMode(
      'club_created_alias',
      'ORG_OWNED',
    );
    assert.equal(updatedMode.success, true);
    if (!updatedMode.success) return;
    assert.deepEqual(modeInput, {
      clubId: 'club_created_alias',
      commercialMode: 'ORG_OWNED',
    });
    assert.equal(updatedMode.data.commercialMode, 'ORG_OWNED');

    const deleted = await academyService.deleteAcademy('club_created_alias');
    assert.equal(deleted.success, true);
    assert.equal(deletedClubId, 'club_created_alias');
  });
});
