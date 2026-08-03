import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('create club post composer derives API-mode posting permissions from club authority', () => {
  const source = readSource('hooks/use-create-club-post.ts');
  const effectStart = source.indexOf('const loadClubContext = async () => {');
  const mockBranchStart = source.indexOf('if (api.useMock) {', effectStart);
  const apiBranchStart = source.indexOf(
    'const result = await clubAuthorityService.listClubs();',
    mockBranchStart,
  );
  const effectEnd = source.indexOf('void loadClubContext();', apiBranchStart);

  assert.ok(effectStart >= 0, 'test should find club context loader');
  assert.ok(mockBranchStart > effectStart, 'test should find mock branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API branch');
  assert.ok(effectEnd > apiBranchStart, 'test should find loader boundary');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, effectEnd);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'composer should import club authority',
  );
  assert.ok(
    mockBranch.includes('clubFeedService.getUserClubs(currentUser.id)'),
    'mock mode may keep local club lookup compatibility',
  );
  assert.ok(
    mockBranch.includes('clubFeedService.getMembership(currentUser.id, club.id)'),
    'mock mode may keep local membership lookup compatibility',
  );
  assert.ok(
    apiBranch.includes('const result = await clubAuthorityService.listClubs();'),
    'API mode should load club/membership context through /v1 club authority',
  );
  assert.equal(
    apiBranch.includes('clubFeedService'),
    false,
    'API mode must not derive posting permissions from local social-feed state',
  );
  assert.ok(
    source.includes('const canPostAsClub = canCreateClubPost(clubContext.membership);'),
    'composer posting controls should derive from authority-loaded membership',
  );
});

test('create club post composer exposes explicit loading, error, denied, and empty states', () => {
  const hook = readSource('hooks/use-create-club-post.ts');
  const screen = readSource('app/(modal)/create-club-post.tsx');

  for (const status of ['loading', 'ready', 'error', 'denied', 'empty']) {
    assert.ok(hook.includes(`'${status}'`), `hook should model ${status} context`);
  }
  assert.ok(hook.includes('canCreateClubPost(requestedMembership)'));
  assert.ok(hook.includes("setClubContext({ status: 'denied', message: CLUB_ACCESS_MESSAGE })"));
  assert.ok(hook.includes('const retryClubContext = () =>'));

  assert.ok(screen.includes("composer.contextStatus === 'loading'"));
  assert.ok(screen.includes("composer.contextStatus === 'error'"));
  assert.ok(screen.includes("composer.contextStatus === 'denied'"));
  assert.ok(screen.includes("composer.contextStatus === 'empty'"));
  assert.ok(screen.includes('onRetry={composer.retryClubContext}'));
});

test('create club post composer only offers backend-supported club-wide text updates', () => {
  const hook = readSource('hooks/use-create-club-post.ts');
  const screen = readSource('app/(modal)/create-club-post.tsx');
  const selectors = readSource('components/social/club-post-selectors.tsx');
  const service = readSource('services/social-feed-service.ts');

  assert.ok(hook.includes("{ key: 'general', label: 'Update' }"));
  assert.ok(hook.includes("{ key: 'announcement', label: 'Announcement' }"));
  assert.ok(hook.includes('clubFeedService.createPostAuthority({'));
  assert.ok(hook.includes("feedType: 'CLUB'"));
  assert.ok(hook.includes("audience: 'club'"));
  assert.ok(hook.includes("audienceLabel: 'Club-wide'"));
  assert.equal(hook.includes('createCoachPostAuthority({'), false);
  assert.equal(hook.includes('ImagePicker'), false);
  assert.equal(hook.includes('squadService'), false);
  assert.equal(hook.includes('eventService'), false);
  assert.equal(screen.includes('Footer toolbar'), false);
  assert.equal(screen.includes('pickImage'), false);
  assert.equal(selectors.includes('FeedTypeSelector'), false);
  assert.equal(selectors.includes('AudienceSelector'), false);
  assert.equal(selectors.includes('EventAttachSelector'), false);
  assert.equal(
    fs.existsSync(path.join(ROOT, 'components/social/club-post-event-fields.tsx')),
    false,
  );
  assert.ok(service.includes('function unsupportedApiPostScope('));
  assert.ok(service.includes('Personal coaching feed publishing needs a dedicated backend route.'));
});

test('create club post composer blocks rapid duplicate submissions and has labelled controls', () => {
  const hook = readSource('hooks/use-create-club-post.ts');
  const screen = readSource('app/(modal)/create-club-post.tsx');
  const selectors = readSource('components/social/club-post-selectors.tsx');

  assert.ok(hook.includes('const submissionInFlight = useRef(false);'));
  assert.ok(hook.includes('if (submissionInFlight.current || !canPost'));
  assert.ok(hook.includes('submissionInFlight.current = true;'));
  assert.ok(hook.includes('submissionInFlight.current = false;'));
  assert.ok(screen.includes('accessibilityLabel="Headline"'));
  assert.ok(screen.includes('accessibilityLabel="Update text"'));
  assert.ok(
    screen.includes(
      'accessibilityState={{ disabled: !composer.canPost, busy: composer.isPosting }}',
    ),
  );
  assert.ok(selectors.includes('accessibilityRole="radio"'));
  assert.ok(selectors.includes('accessibilityState={{ checked: selected }}'));
});

test('event recap only opens the club-wide composer for all-member events', () => {
  const eventDetail = readSource('hooks/use-event-detail.ts');
  const routes = readSource('navigation/routes.ts');

  assert.ok(eventDetail.includes("if (!event || event.targetAudience !== 'ALL') return;"));
  assert.ok(
    eventDetail.includes(
      "canShareRecap: workspaceState.canShareRecap && event?.targetAudience === 'ALL'",
    ),
  );
  assert.equal(eventDetail.includes("audience: isSquadAudience ? 'squad' : 'club'"), false);
  assert.ok(routes.includes('modalCreateClubPost: (params?: { clubId?: string })'));
  assert.equal(routes.includes("audience?: 'club' | 'squad';"), false);
});
