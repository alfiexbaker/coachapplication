import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('injury detail keeps shared coach access and denied API reads fail closed', () => {
  const service = readProjectFile('services/injury-service.ts');
  const hook = readProjectFile('hooks/use-health-detail.ts');
  const screen = readProjectFile('app/health/[id].tsx');
  const summary = readProjectFile('components/health/injury-summary-card.tsx');

  assert.match(service, /hasVerifiedCoachRosterAccess/);
  assert.match(service, /hasCoachRosterAccess && !injury\.sharedWithCoach/);
  assert.match(service, /serviceErrorCode = error\.code/);
  assert.match(hook, /serviceErrorCode === 'UNAUTHORIZED' \? 'UNAUTHORIZED' : 'UNKNOWN'/);
  assert.match(screen, /title=\{terminalAccessError \? 'Injury unavailable' : undefined\}/);
  assert.match(screen, /onRetry=\{terminalAccessError \? undefined : retry\}/);
  assert.match(screen, /accessibilityLabel="Go back"/);
  assert.equal(screen.includes('RecoveryTimeline'), false);
  assert.equal(screen.includes('AddRecoveryNote'), false);
  assert.equal(hook.includes('addRecoveryNoteForActor'), false);
  assert.match(hook, /Unable to update this injury\. Refresh and try again\./);
  assert.match(summary, /Expected \{injuryService\.formatDate\(injury\.expectedRecovery\)\}/);
});
