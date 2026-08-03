import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('independent local identity records and match invite names load in parallel', () => {
  const userServiceSource = readProjectFile('services/user-service.ts');
  const matchInviteSource = readProjectFile('services/invite/match-invite-service.ts');

  assert.match(
    userServiceSource,
    /const \[authUser, users\] = await Promise\.all\(\[\s*apiClient\.get<AuthUserRecord/,
  );
  assert.match(
    matchInviteSource,
    /const \[athleteName, parentName\] = await Promise\.all\(\[\s*resolveUserName\(member\.athleteId/,
  );
  assert.match(
    matchInviteSource,
    /const \[createdMatch, players\] = await Promise\.all\(\[createdMatchPromise, playersPromise\]\);/,
  );
  assert.match(matchInviteSource, /athleteId: member\.athleteId,\s*athleteName,/);
  assert.match(matchInviteSource, /parentId: member\.parentId,\s*parentName,/);
});
