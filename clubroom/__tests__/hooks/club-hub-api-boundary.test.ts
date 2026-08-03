import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club hub is mock-only and immediately redirects API mode before legacy hook mounts', () => {
  const source = readSource('app/(tabs)/club-hub.tsx');
  const screenStart = source.indexOf('export default function ClubHubScreen() {');
  const redirectStart = source.indexOf('function ClubHubApiRedirect');
  const legacyStart = source.indexOf('function ClubHubLegacyScreen()');
  const hookStart = source.indexOf('const hub = useClubHub();');

  assert.ok(screenStart >= 0, 'test should find the screen entrypoint');
  assert.ok(redirectStart > screenStart, 'test should find API redirect component');
  assert.ok(legacyStart > redirectStart, 'test should find legacy component');
  assert.ok(hookStart > legacyStart, 'legacy hook should only mount inside the legacy component');

  const screenBlock = source.slice(screenStart, redirectStart);
  const redirectBlock = source.slice(redirectStart, legacyStart);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'screen should branch on runtime mode',
  );
  assert.ok(screenBlock.includes('if (!USE_MOCK) {'), 'API mode should be guarded');
  assert.ok(
    screenBlock.includes('return <ClubHubApiRedirect'),
    'API mode should return the redirect before the legacy hook can mount',
  );
  assert.equal(
    screenBlock.includes('useClubHub()'),
    false,
    'screen entrypoint must not call the legacy hook before the API guard',
  );
  assert.ok(
    redirectBlock.includes('<Redirect href={clubId ? Routes.club(clubId)'),
    'API mode with a club id should route to backend-owned club detail',
  );
  assert.ok(
    redirectBlock.includes('Routes.myClubs({ inviteCode })'),
    'API mode should preserve invite-code links through My Clubs',
  );
  assert.equal(
    redirectBlock.includes('useEffect(') || redirectBlock.includes('<LoadingState'),
    false,
    'API mode should not render a fake loading page before redirecting',
  );
  assert.ok(
    screenBlock.includes('return <ClubHubLegacyScreen />;'),
    'mock mode should keep the legacy hub available',
  );
});

test('API-mode Club Hub callers route directly to their canonical destination', () => {
  const coachInvites = readSource('app/coach-invites.tsx');
  const groupThreads = readSource('components/messaging/group-threads-section.tsx');
  const community = readSource('app/community/[groupId].tsx');
  const dashboard = readSource('app/club/[clubId]/dashboard.tsx');
  const settingsHook = readSource('hooks/use-club-settings.ts');
  const routeAccess = readSource('constants/route-access.ts');

  assert.ok(
    coachInvites.includes('USE_MOCK ? Routes.CLUB_HUB : Routes.MY_CLUBS'),
    'invite empty state should skip the compatibility route in API mode',
  );
  assert.ok(
    groupThreads.includes('USE_MOCK && isCoach ? Routes.CLUB_HUB : Routes.MY_CLUBS'),
    'group-chat empty state should skip the compatibility route in API mode',
  );
  assert.match(
    community,
    /USE_LOCAL_GROUP_MANAGEMENT[\s\S]*Routes\.clubHub\(\{ clubId: group\.clubId \}\)[\s\S]*Routes\.club\(group\.clubId\)/,
  );
  assert.ok(
    dashboard.includes("Routes.clubSettings({ clubId, section: 'details' })"),
    'owner dashboard should open the settings workflow directly',
  );
  assert.equal(
    dashboard.includes('Routes.clubHub({ clubId })'),
    false,
    'owner dashboard should not loop through Club Hub',
  );
  assert.ok(
    settingsHook.includes('USE_MOCK ? Routes.CLUB_HUB : Routes.MY_CLUBS'),
    'archive completion should return to My Clubs in API mode',
  );
  assert.match(
    routeAccess,
    /ADMIN:\s*\['schedule', 'athletes', 'children', 'coach-profile'\]/,
    'club admins must remain outside the coach self-profile tab',
  );
});

test('club detail gates secondary reads and removes fabricated controls', () => {
  const hook = readSource('hooks/use-club-detail.ts');
  const authorityService = readSource('services/club-authority-service.ts');
  const apiRoutes = readSource('apps/api/src/modules/coach-club/routes.ts');
  const screen = readSource('app/club/[id].tsx');
  const stats = readSource('components/club/club-detail-stats.tsx');
  const header = readSource('components/club/ClubHeader.tsx');

  assert.equal(hook.includes('buildClubInvites'), false, 'invite totals must not be fabricated');
  assert.ok(
    hook.includes('if (!USE_MOCK && authorityReadyClubId !== clubId)'),
    'club detail should establish visible club authority before secondary reads',
  );
  assert.ok(
    hook.includes('if (!USE_MOCK && !canRemoveMembers)'),
    'club detail should not fetch the member directory for viewers who cannot manage it',
  );
  assert.ok(
    authorityService.includes('memberCount: club.memberCount ?? memberships.length'),
    'club mapping should use backend aggregates without requiring the full roster',
  );
  assert.ok(
    apiRoutes.includes('const { memberships, inviteCode, squads, ...summary } = club;'),
    'club list and detail responses should remove the full membership collection',
  );
  assert.ok(
    apiRoutes.includes('inviteCode: viewerGovernance.canManageMembers ? inviteCode : null'),
    'club list and detail responses should hide invite credentials from ordinary members',
  );
  assert.equal(screen.includes('inviteCount='), false, 'the fake invite metric should be removed');
  assert.ok(
    screen.includes('onUpdatePhotos={api.useMock ? handleUpdatePhotos : undefined}'),
    'API mode should not expose local-only photo editing',
  );
  assert.ok(
    stats.includes("accessibilityLabel={isExpanded ? 'Hide club members' : 'Show club members'}"),
    'the member metric should only be actionable when it can expand',
  );
  assert.ok(
    header.includes('const canEditPhotos = canManage && Boolean(onUpdatePhotos);'),
    'photo controls should require a real save handler',
  );
});
