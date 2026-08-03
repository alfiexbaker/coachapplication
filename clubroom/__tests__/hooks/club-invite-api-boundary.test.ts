import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club invite screen sends supported existing-user invites through API mode only', () => {
  const source = readSource('hooks/use-club-invite.ts');
  const loadStart = source.indexOf('const [allBookings, authorityResult] = await Promise.all');
  const loadEnd = source.indexOf('setCompletedBookings(', loadStart);
  const sendStart = source.indexOf('const handleSendInvites = async () => {');
  const manualStart = source.indexOf('const handleManualInvite = async () => {');
  const returnStart = source.indexOf('return {', manualStart);

  assert.ok(loadStart >= 0, 'test should find invite data load');
  assert.ok(loadEnd > loadStart, 'test should find load boundary');
  assert.ok(sendStart > loadEnd, 'test should find bulk invite handler');
  assert.ok(manualStart > sendStart, 'test should find manual invite handler');
  assert.ok(returnStart > manualStart, 'test should find handler boundary');

  const loadBlock = source.slice(loadStart, loadEnd);
  const sendBlock = source.slice(sendStart, manualStart);
  const manualBlock = source.slice(manualStart, returnStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'invite screen should import club authority',
  );
  assert.ok(
    source.includes("import { userService } from '@/services/user-service';"),
    'manual email invites should resolve existing users through backend user search',
  );
  assert.ok(
    loadBlock.includes('api.useMock ? Promise.resolve(null) : clubAuthorityService.listClubs()'),
    'API mode should load club context from /v1 club authority',
  );
  assert.ok(
    loadBlock.includes('if (!authorityResult.success)') &&
      loadBlock.includes('throw new Error(authorityResult.error.message);'),
    'API club authority errors should surface to the invite screen instead of becoming missing club context',
  );
  assert.equal(
    loadBlock.includes('authorityResult?.success'),
    false,
    'API mode must not treat club authority failure as nullable club context',
  );
  assert.ok(
    loadBlock.includes('socialFeedService') && loadBlock.includes('api.useMock'),
    'local club lookup should be guarded to mock mode',
  );
  assert.ok(
    sendBlock.includes('if (!api.useMock)'),
    'bulk member invite handler should branch for API mode',
  );
  assert.ok(
    sendBlock.includes('clubAuthorityService.inviteExistingUsers'),
    'API mode should create selected-user supported invites through club authority',
  );
  assert.ok(
    sendBlock.includes(
      "selectedRole !== 'MEMBER' && selectedRole !== 'COACH' && selectedRole !== 'ADMIN'",
    ),
    'API mode should keep unsupported direct invite roles fail-closed',
  );
  assert.ok(
    manualBlock.includes('if (!api.useMock)'),
    'manual member invites should branch away from mock-only success in API mode',
  );
  assert.ok(
    manualBlock.includes('userService.searchUsers') &&
      manualBlock.includes('clubAuthorityService.inviteExistingUsers') &&
      manualBlock.includes('clubAuthorityService.inviteEmailTargets'),
    'API mode should resolve exact email users and create email-target invites through club authority',
  );
  assert.ok(
    manualBlock.includes('Invite recorded for'),
    'unregistered manual email invites should be recorded without pretending delivery',
  );
  assert.equal(
    sendBlock.includes('await new Promise') && !sendBlock.includes('if (!api.useMock)'),
    false,
    'fake async invite success must not be the only live-mode branch',
  );
  assert.equal(
    manualBlock.includes("showToast(`Invite sent to ${manualEmail}`, 'success')") &&
      !manualBlock.includes('if (!api.useMock)'),
    false,
    'manual fake success must not be unguarded',
  );
});

test('club invite screen renders a retryable error when invite context fails', () => {
  const screenSource = readSource('app/club/invite-members.tsx');
  const hookDestructureStart = screenSource.indexOf('const {');
  const loadingStart = screenSource.indexOf('if (loading) {', hookDestructureStart);
  const errorStart = screenSource.indexOf('if (loadError) {', loadingStart);
  const errorReturnStart = screenSource.indexOf('return (', errorStart);
  const mainStart = screenSource.indexOf('return (', errorReturnStart + 1);

  assert.ok(hookDestructureStart >= 0, 'test should find hook destructure');
  assert.ok(loadingStart > hookDestructureStart, 'test should find loading state');
  assert.ok(errorStart > loadingStart, 'test should find load error state');
  assert.ok(errorReturnStart > errorStart, 'test should find error render');
  assert.ok(mainStart > errorStart, 'test should find main render after error state');

  const hookDestructure = screenSource.slice(hookDestructureStart, loadingStart);
  const errorBlock = screenSource.slice(errorStart, mainStart);

  assert.ok(
    screenSource.includes("import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';"),
    'invite screen should use the shared error state component',
  );
  assert.ok(
    hookDestructure.includes('loadError') && hookDestructure.includes('retry'),
    'invite screen should consume retryable load errors from the hook',
  );
  assert.ok(
    errorBlock.includes('<ErrorState') &&
      errorBlock.includes('message={loadError}') &&
      errorBlock.includes('onRetry={retry}'),
    'invite context failures should render a retryable screen error',
  );
});
