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
  assert.equal(
    activeClubBlock.includes('socialFeedService.getUserClubs') &&
      !activeClubBlock.includes('api.useMock'),
    false,
    'local club lookup must not be unguarded in training schedule',
  );
});
