import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('athlete detail fails closed when emergency medical authority is unavailable', () => {
  const source = readProjectFile('hooks/use-athlete-detail.ts');
  const emergencyReadStart = source.indexOf(
    'const emergencyResult = await safetyService.getAthleteEmergency(',
  );
  const returnStart = source.indexOf('return ok({', emergencyReadStart);

  assert.ok(emergencyReadStart >= 0, 'expected athlete detail to read emergency quick view');
  assert.ok(returnStart > emergencyReadStart, 'expected profile return after emergency read');

  const beforeReturn = source.slice(emergencyReadStart, returnStart);

  assert.equal(
    source.includes('emergencyResult.success ? emergencyResult.data : null'),
    false,
    'emergency authority failures must not render as a missing emergency snapshot',
  );
  assert.ok(
    beforeReturn.includes('if (!emergencyResult.success)') &&
      beforeReturn.includes('return err(emergencyResult.error);'),
    'emergency authority failure should fail the athlete detail load',
  );
  assert.ok(
    source.includes('emergencyData: emergencyResult.data'),
    'successful emergency reads should render the authoritative /v1 family health snapshot',
  );
  assert.match(source, /currentUser\?\.role === 'COACH' && currentUser\.isVerified/);
  assert.match(source, /isVerifiedCoach: true/);
  assert.ok(
    source.indexOf('const childData = await childService.getChild(athleteId, { includeTrustData: false });') >
      source.indexOf('return err(emergencyResult.error);', emergencyReadStart),
    'child data must not load before emergency authority has succeeded',
  );

  const screen = readProjectFile('app/roster/[athleteId]/index.tsx');
  assert.match(
    screen,
    /error\?\.message \?\? 'This player is not available from your roster\.'/,
  );
});
