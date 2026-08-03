import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('session history fails closed when athlete media authority is unavailable', () => {
  const source = readProjectFile('hooks/use-session-history.ts');
  const mediaReadStart = source.indexOf('mediaService.listMediaForAthlete(resolvedAthleteId)');
  const buildSessionsStart = source.indexOf('const sessions = buildPastSessions({', mediaReadStart);

  assert.ok(mediaReadStart >= 0, 'expected session history to read athlete media');
  assert.ok(buildSessionsStart > mediaReadStart, 'expected session builder after media read');

  const beforeBuild = source.slice(mediaReadStart, buildSessionsStart);

  assert.equal(
    source.includes('const media = mediaResult.success ? mediaResult.data : []'),
    false,
    'media authority failures must not render as an empty session media list',
  );
  assert.ok(
    beforeBuild.includes('if (!mediaResult.success)') &&
      beforeBuild.includes('return err(mediaResult.error);'),
    'media authority failure should fail the session history load',
  );
  assert.ok(
    source.includes('const media = mediaResult.data;'),
    'successful session history loads should use authoritative /v1 media rows',
  );
});
