import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('create match uses live club squad authority in API mode', () => {
  const source = readProjectFile('hooks/use-create-match.ts');

  assert.equal(source.includes('DEFAULT_CLUB_ID'), false);
  assert.equal(source.includes('DEFAULT_CLUB_NAME'), false);
  assert.equal(source.includes('club_lions'), false);
  assert.equal(source.includes('Lions FC Academy'), false);
  assert.ok(source.includes('useLocalSearchParams<MatchCreateParams>()'));
  assert.ok(source.includes('const requestedClubId = getRouteParam(routeParams.clubId);'));
  assert.ok(source.includes('const routeSquadId = getRouteParam(routeParams.squadId);'));
  assert.ok(source.includes('const clubsResult = await clubAuthorityService.listClubs();'));
  assert.ok(source.includes('resolveMatchClub('));
  assert.ok(source.includes('clubsResult.data.clubs'));
  assert.ok(source.includes('clubsResult.data.memberships'));

  const liveSquadLoad = source.indexOf('await squadService.getSquads(club.id)');
  assert.ok(liveSquadLoad >= 0, 'create flow should load squads for the resolved club');
  const liveSquadSet = source.indexOf('setSquads(liveSquads)', liveSquadLoad);
  assert.ok(liveSquadSet > liveSquadLoad, 'API mode should expose live squads to the selector');
  assert.ok(source.includes('liveSquads.find((squad) => squad.id === routeSquadId)'));
  assert.ok(source.includes("uiFeedback.showToast('Select a squad from this club.', 'error')"));
  assert.ok(
    source.includes(
      "const SQUAD_MEMBER_CONTEXT_MESSAGE = 'Failed to load squad members for match invites.';",
    ),
  );
  assert.ok(
    source.includes(
      'const [squadMemberError, setSquadMemberError] = useState<string | null>(null);',
    ),
  );
  assert.ok(source.includes('if (squadId !== selectedSquadId) {'));
  assert.ok(source.includes('const members = await squadService.getSquadMembers(selectedSquadId);'));
  assert.ok(source.includes('setSquadMemberError(SQUAD_MEMBER_CONTEXT_MESSAGE);'));
  assert.ok(source.includes('setAutoInvite(false);'));
  assert.ok(source.includes('if (autoInvite && squadMemberError)'));

  const submitStart = source.indexOf('const handleSubmit = async () => {');
  assert.ok(submitStart >= 0, 'test should find submit handler');

  const inviteBranch = source.indexOf('matchInviteService.inviteSquadToMatch', submitStart);
  assert.ok(inviteBranch > submitStart, 'submit should use the squad-to-match invite service');
  assert.equal(
    source.includes('if (USE_MOCK && autoInvite && selectedSquadId)'),
    false,
    'squad auto-invites should not be mock-only',
  );
  assert.equal(source.includes('const canCreateSquad = USE_MOCK'), false);
  assert.ok(source.includes('const canCreateSquad = Boolean(activeClubId);'));
  assert.ok(source.includes('activeClubId,'));

  const screenSource = readProjectFile('app/matches/create.tsx');
  assert.ok(screenSource.includes('if (clubContextLoading)'));
  assert.ok(screenSource.includes('if (clubContextError)'));
  assert.ok(screenSource.includes('if (!activeClubId) return;'));
  assert.ok(screenSource.includes('squadMembersLoading={squadMembersLoading}'));
  assert.ok(screenSource.includes('squadMemberError={squadMemberError}'));
  assert.ok(screenSource.includes('router.push(Routes.clubSquadCreate(activeClubId));'));
  assert.equal(screenSource.includes('router.push(Routes.CLUB_SQUAD_CREATE);'), false);

  const squadStepSource = readProjectFile('components/match/create-match-squad.tsx');
  assert.ok(squadStepSource.includes('Member list unavailable for invites'));
  assert.ok(squadStepSource.includes('disabled={squadMembersLoading || Boolean(squadMemberError)}'));

  const reviewStepSource = readProjectFile('components/match/create-match-review.tsx');
  assert.ok(reviewStepSource.includes("selectedSquad?.name ?? 'Club-level fixture'"));
  assert.ok(reviewStepSource.includes('member list unavailable'));

  const matchesScreenHookSource = readProjectFile('hooks/use-matches-screen.ts');
  assert.ok(matchesScreenHookSource.includes('clubId: club.id, clubName: club.name'));
  assert.ok(
    matchesScreenHookSource.includes(
      'Routes.matchCreate({ clubId: activeClubId, clubName: activeClubName })',
    ),
  );

  const matchesScreenSource = readProjectFile('app/matches/index.tsx');
  assert.ok(matchesScreenSource.includes('canCreateMatch ?'));

  const routesSource = readProjectFile('navigation/routes.ts');
  assert.ok(routesSource.includes('export interface MatchCreateRouteParams'));
  assert.ok(routesSource.includes('matchCreate: (params?: MatchCreateRouteParams)'));

  const scheduleSource = readProjectFile('components/club/ClubScheduleScreen.tsx');
  assert.ok(scheduleSource.includes('getMatchCreateHref('));
  assert.ok(scheduleSource.includes('Routes.matchCreate({'));
  assert.ok(scheduleSource.includes("scope === 'squad' && squadId ? { squadId } : {}"));

  const activitiesSource = readProjectFile('components/club/ClubActivitiesPanel.tsx');
  assert.ok(activitiesSource.includes('getClubMatchCreateHref'));
  assert.ok(activitiesSource.includes('Routes.matchCreate({'));
});
