import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club detail loads members and self-leave through API service in API mode', () => {
  const serviceSource = readSource('services/club-service.ts');
  const source = readSource('hooks/use-club-detail.ts');
  const loadMembersStart = source.indexOf('const loadMembers = async () => {');
  const loadMembersEnd = source.indexOf('const loadClubActivities = async () => {', loadMembersStart);
  const leaveStart = source.indexOf('const handleLeaveClub = () => {');
  const leaveEnd = source.indexOf('const handleCloseMemberRemovalModal = () => {', leaveStart);

  assert.ok(loadMembersStart >= 0, 'test should find member loader');
  assert.ok(loadMembersEnd > loadMembersStart, 'test should find member loader boundary');
  assert.ok(leaveStart >= 0, 'test should find leave handler');
  assert.ok(leaveEnd > leaveStart, 'test should find leave handler boundary');

  const loadMembersBlock = source.slice(loadMembersStart, loadMembersEnd);
  const leaveBlock = source.slice(leaveStart, leaveEnd);
  const mockGuardStart = leaveBlock.indexOf('if (USE_MOCK) {');
  const localLeaveStart = leaveBlock.indexOf('socialFeedService.leaveClub');
  const apiLeaveStart = leaveBlock.indexOf('const result = await clubService.leaveClub(clubId, currentUser.id);');

  assert.ok(
    loadMembersBlock.includes('const memberList = await clubService.getMembers(clubId);'),
    'club detail should use the club member service for live and mock member reads',
  );
  assert.equal(
    loadMembersBlock.includes('if (!USE_MOCK)'),
    false,
    'API mode must not render an empty member list when /v1 member reads exist',
  );
  assert.ok(mockGuardStart >= 0, 'mock leave should be guarded');
  assert.ok(localLeaveStart > mockGuardStart, 'local leave mutation must sit behind the mock guard');
  assert.ok(
    apiLeaveStart > localLeaveStart,
    'API mode should call the club service self-leave contract',
  );
  assert.equal(
    leaveBlock.includes('Leaving clubs needs backend support first.'),
    false,
    'live self-leave should no longer fail closed before calling the backend',
  );
  assert.ok(
    serviceSource.includes('async function loadMembers(clubId: string): Promise<ClubMember[]> {\n  if (!USE_MOCK) {\n    return [];\n  }'),
    'club member fixture loader should stay empty outside mock mode',
  );
  assert.ok(
    serviceSource.includes('__seedMockMembers(clubId: string, members: ClubMember[]): void {\n    if (!USE_MOCK) {\n      return;\n    }'),
    'club member test seeding should be mock-only',
  );
});

test('club detail pins posts through API authority in API mode', () => {
  const source = readSource('hooks/use-club-detail.ts');
  const pinStart = source.indexOf('const handlePinToggle = async (postId: string) => {');
  const likeStart = source.indexOf('const handleLikePost = async (postId: string) => {', pinStart);
  const returnStart = source.indexOf('return {', likeStart);

  assert.ok(pinStart >= 0, 'test should find pin handler');
  assert.ok(likeStart > pinStart, 'test should find pin handler boundary');
  assert.ok(returnStart > likeStart, 'test should find return block');

  const pinBlock = source.slice(pinStart, likeStart);
  const returnBlock = source.slice(returnStart);

  assert.ok(
    pinBlock.includes('socialFeedService.setPostPinAuthority(postId, !post.isPinned)'),
    'API mode should update pinned posts through post authority',
  );
  assert.ok(
    pinBlock.includes('if (!USE_MOCK)'),
    'pin handler should branch for API mode',
  );
  assert.ok(
    pinBlock.includes('socialFeedService.togglePin(postId, currentUser.id)'),
    'mock mode may keep local pinning',
  );
  assert.equal(
    pinBlock.includes('Pinning posts needs backend support first.'),
    false,
    'live pinning should no longer fail closed before calling the backend',
  );
  assert.ok(
    returnBlock.includes('canPinPosts: !!canManagePosts'),
    'API mode should show the pin action when the viewer can manage posts',
  );
  assert.equal(
    returnBlock.includes('canPinPosts: USE_MOCK'),
    false,
    'pin action must not be mock-only once the backend route exists',
  );
});
