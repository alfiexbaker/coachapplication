import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('training schedule chooses active club from club authority outside mock mode', () => {
  const source = readSource('hooks/use-training-schedule.ts');
  const activeClubStart = source.indexOf('const activeClub = api.useMock');
  const afterActiveClub = source.indexOf('if (!activeClub)', activeClubStart);

  assert.ok(activeClubStart >= 0, 'test should find active club selection');
  assert.ok(afterActiveClub > activeClubStart, 'test should find active club boundary');

  const activeClubBlock = source.slice(activeClubStart, afterActiveClub);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'training schedule should import club authority',
  );
  assert.ok(
    activeClubBlock.includes('api.useMock'),
    'active club lookup should branch by runtime mode',
  );
  assert.ok(
    activeClubBlock.includes('socialFeedService.getUserClubs(currentUserId)[0]'),
    'mock mode may keep local club compatibility',
  );
  assert.ok(
    activeClubBlock.includes('const result = await clubAuthorityService.listClubs();'),
    'API mode should read clubs through /v1 club authority',
  );
  assert.ok(
    source.includes("const [error, setError] = useState<string | null>(null);"),
    'training schedule should keep load errors in state',
  );
  assert.ok(
    source.includes(
      "setError(error instanceof Error ? error.message : 'Failed to load training schedule.');",
    ),
    'training schedule should surface failed live reads',
  );
  assert.ok(
    source.includes('setSelectedSquadId(null);'),
    'training schedule should clear stale squad filters when live context is unavailable',
  );
  assert.ok(
    source.includes('retry: () => setReloadKey((key) => key + 1),'),
    'training schedule should expose a retry path',
  );
  assert.equal(
    activeClubBlock.includes('socialFeedService.getUserClubs') &&
      !activeClubBlock.includes('api.useMock'),
    false,
    'local club lookup must not be unguarded in training schedule',
  );

  const screen = readSource('app/club/training-schedule.tsx');
  assert.ok(
    screen.includes("import { LoadingState, ErrorState } from '@/components/ui/screen-states';"),
  );
  assert.ok(screen.includes('error,'));
  assert.ok(screen.includes('retry,'));
  assert.ok(screen.includes(') : error ? ('));
  assert.ok(screen.includes('<ErrorState message={error} onRetry={retry} />'));
});
