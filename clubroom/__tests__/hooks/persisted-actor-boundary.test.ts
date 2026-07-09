import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('persisted coach actions do not write generic actor names', () => {
  const sessionCompletion = readSource('hooks/use-session-completion.ts');
  const clubDetail = readSource('hooks/use-club-detail.ts');
  const clubHub = readSource('hooks/use-club-hub.ts');
  const videoUpload = readSource('hooks/use-video-upload.ts');
  const createSession = readSource('app/sessions/create.tsx');
  const squadInvite = readSource('hooks/use-squad-invite.ts');

  assert.doesNotMatch(
    sessionCompletion,
    /currentUser\.fullName\s*\|\|\s*currentUser\.name\s*\|\|\s*'Coach'/,
  );
  assert.doesNotMatch(sessionCompletion, /coachName:\s*currentUser\.fullName\s*\|\|\s*'Coach'/);
  assert.ok(sessionCompletion.includes('Complete your account name before completing sessions.'));
  assert.ok(
    sessionCompletion.includes('Complete your account name before sending session updates.'),
  );

  assert.doesNotMatch(
    clubDetail,
    /currentUser\.fullName\s*\|\|\s*currentUser\.username\s*\|\|\s*'Coach'/,
  );
  assert.ok(clubDetail.includes('Complete your account name before removing club members.'));

  assert.doesNotMatch(
    clubHub,
    /currentUser\.fullName\s*\|\|\s*currentUser\.username\s*\|\|\s*'Coach'/,
  );
  assert.ok(clubHub.includes('Complete your account name before removing club members.'));

  assert.doesNotMatch(
    videoUpload,
    /coachName:\s*currentUser\.name\s*\|\|\s*currentUser\.fullName\s*\|\|\s*'Coach'/,
  );
  assert.ok(videoUpload.includes('Complete your account name before uploading coaching videos.'));

  assert.doesNotMatch(
    createSession,
    /ownerCoachName\s*=\s*currentUser\.name\s*\|\|\s*currentUser\.fullName\s*\|\|\s*'Coach'/,
  );
  assert.doesNotMatch(createSession, /'Club staff'/);
  assert.doesNotMatch(createSession, /parentName:[^\n]*'Parent'/);
  assert.ok(createSession.includes('Complete your account name before sending invites.'));
  assert.ok(createSession.includes('Resolve the coach owner name before sending invites.'));

  assert.doesNotMatch(squadInvite, /coachName:\s*currentUser\.name\s*\|\|\s*'Coach'/);
  assert.ok(squadInvite.includes('Complete your account name before sending squad invites.'));
});
