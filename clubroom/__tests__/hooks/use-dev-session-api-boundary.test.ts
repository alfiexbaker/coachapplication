import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useDevSession loads and saves backend feedback before local COACH_SESSIONS access', () => {
  const source = readSource('hooks/use-dev-session.ts');

  const loadGuard = source.indexOf('if (!apiClient.isMockMode)');
  const loadApiRead = source.indexOf('progressFeedbackService.getLatestForAthlete');
  const loadRead = source.indexOf('apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS');
  assert.ok(loadGuard >= 0, 'load path must guard API mode');
  assert.ok(loadApiRead >= 0, 'load path must read backend session feedback in API mode');
  assert.ok(loadRead >= 0, 'test should find the local session read');
  assert.ok(loadGuard < loadRead, 'load path must branch API mode before local session reads');
  assert.ok(loadApiRead < loadRead, 'API feedback read must happen before local session reads');
  assert.equal(
    source.includes('Detailed per-athlete feedback needs a backend-loaded session-feedback context'),
    false,
    'save path should no longer fail closed for API-mode backend feedback',
  );

  const saveStart = source.indexOf('const handleSave = async () => {');
  const saveGuard = source.indexOf('if (!apiClient.isMockMode)', saveStart);
  const saveApiWrite = source.indexOf('await persistFeedback(session.bookingId || session.id)', saveStart);
  const saveRead = source.indexOf(
    'apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS',
    saveStart,
  );
  assert.ok(saveStart >= 0, 'test should find save handler');
  assert.ok(saveGuard >= 0, 'save path must branch API mode');
  assert.ok(saveApiWrite >= 0, 'save path must persist backend feedback in API mode');
  assert.ok(saveRead >= 0, 'test should find the local session read in save path');
  assert.ok(saveGuard < saveRead, 'save path must branch API mode before local session reads');
  assert.ok(saveApiWrite < saveRead, 'API feedback save must happen before local session reads');
  assert.ok(
    source.includes('photoUrls: imageUrls'),
    'API feedback save should preserve attached photos',
  );
});
