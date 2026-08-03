import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('my clubs screen uses club authority instead of local club mirrors in API mode', () => {
  const source = readSource('app/club/my-clubs.tsx');

  assert.equal(
    source.includes("import { socialFeedService } from '@/services/social-feed-service';"),
    false,
    'My Clubs should not read local social feed club mirrors directly',
  );
  assert.ok(
    source.includes('return clubAuthorityService.listClubs();'),
    'My Clubs should return the /v1-backed club authority result directly',
  );
  assert.ok(
    source.includes('api.useMock && isStaffMembership(membership?.role)'),
    'staff cards should only open legacy Club Hub in mock mode',
  );
});

test('invite links prefill the join form without joining on route open', () => {
  const source = readSource('app/club/my-clubs.tsx');
  const joinCard = readSource('components/club/JoinClubCard.tsx');

  assert.equal(
    source.includes('void joinClubWithCode({'),
    false,
    'opening My Clubs must not submit a join mutation',
  );
  assert.ok(
    source.includes('initialCode={initialInviteCode}'),
    'the incoming invite code should be presented for explicit confirmation',
  );
  assert.ok(
    joinCard.includes("const [joinCode, setJoinCode] = useState(initialCode);"),
    'the join form should prefill the incoming code',
  );
  assert.ok(
    source.includes('if (router.canGoBack())'),
    'a direct My Clubs link should have a safe close fallback',
  );
});

test('my clubs prioritizes existing clubs over acquisition controls', () => {
  const source = readSource('app/club/my-clubs.tsx');
  const joinCard = readSource('components/club/JoinClubCard.tsx');

  assert.ok(
    source.indexOf('{clubs.length === 0 ?') < source.lastIndexOf('<JoinClubCard'),
    'the club list or empty state should render before join and create controls',
  );
  assert.equal(source.includes('>Open</ThemedText>'), false, 'the card chevron is enough');
  assert.equal(
    source.includes("label: 'Close'"),
    false,
    'the close icon should not repeat its intent in visible copy',
  );
  assert.ok(
    source.includes("accessibilityLabel: 'Close'"),
    'the icon-only close action still needs a VoiceOver label',
  );
  assert.equal(
    joinCard.includes('Join or Create a Club'),
    false,
    'the compact card should not use a marketing headline',
  );
  assert.equal(
    joinCard.includes('Connect with your coaching team'),
    false,
    'the compact card should not use generic marketing copy',
  );
  assert.equal(
    joinCard.includes('Ask your club for an invite code or join link'),
    false,
    'helper copy should only appear when it resolves an error',
  );
  assert.ok(
    joinCard.includes('accessibilityLabel="Invite code or link"'),
    'the invite input needs a stable accessible label',
  );
  assert.ok(
    joinCard.includes('accessibilityRole="button"'),
    'the disabled join control must retain its button role',
  );
  assert.ok(
    joinCard.includes('maxLength={512}'),
    'the join field should accept real invite links rather than truncating them to code length',
  );
});
