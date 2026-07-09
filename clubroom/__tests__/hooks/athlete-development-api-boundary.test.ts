import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('athlete development reads session feedback in API mode', () => {
  const source = readProjectFile('hooks/use-athlete-development.ts');

  assert.ok(source.includes("import { apiClient } from '@/services/api-client';"));
  assert.ok(source.includes('progressFeedbackService'));
  assert.ok(source.includes('type SessionFeedback'));
  assert.ok(source.includes('function mapFeedbackToDevelopmentSession'));
  assert.ok(source.includes('function loadAthleteDevelopmentSessions'));

  const loaderStart = source.indexOf('async function loadAthleteDevelopmentSessions');
  assert.ok(loaderStart >= 0, 'test should find the development session loader');

  const mockBranchStart = source.indexOf('if (apiClient.isMockMode)', loaderStart);
  assert.ok(mockBranchStart > loaderStart, 'local development sessions must be mock-mode only');
  const apiCallStart = source.indexOf(
    "progressFeedbackService.getFeedbackForAthlete(athleteId, 'coach')",
    mockBranchStart,
  );
  assert.ok(apiCallStart > mockBranchStart, 'API mode should load live athlete session feedback');

  const mockBranch = source.slice(mockBranchStart, apiCallStart);
  assert.ok(mockBranch.includes('ensureCoachSessionsSeeded()'));
  assert.ok(mockBranch.includes('session.coachId === coachUserId'));

  const loadDevelopmentStart = source.indexOf('const loadDevelopment = async () => {');
  assert.ok(loadDevelopmentStart >= 0, 'test should find screen loader');
  const loadDevelopmentBody = source.slice(loadDevelopmentStart);
  assert.ok(loadDevelopmentBody.includes('loadAthleteDevelopmentSessions(athleteId, currentUser.id)'));
  assert.equal(
    loadDevelopmentBody.includes('ensureCoachSessionsSeeded(),'),
    false,
    'screen loader must not call the local session seed directly',
  );
});
