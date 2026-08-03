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
    'progressFeedbackService.getFeedbackForAthlete(athleteId, viewerRole)',
    mockBranchStart,
  );
  assert.ok(apiCallStart > mockBranchStart, 'API mode should load live athlete session feedback');

  const mockBranch = source.slice(mockBranchStart, apiCallStart);
  assert.ok(mockBranch.includes('ensureCoachSessionsSeeded()'));
  assert.ok(mockBranch.includes('session.coachId === coachUserId'));

  const loadDevelopmentStart = source.indexOf('const loadDevelopment = async () => {');
  assert.ok(loadDevelopmentStart >= 0, 'test should find screen loader');
  const loadDevelopmentBody = source.slice(loadDevelopmentStart);
  assert.ok(
    loadDevelopmentBody.includes(
      'loadAthleteDevelopmentSessions(athleteId, currentUser.id, viewerRole)',
    ),
  );
  assert.ok(
    loadDevelopmentBody.includes('resolveDevelopmentViewerRole(currentUser)'),
    'feedback visibility must follow the signed-in role',
  );
  assert.equal(
    source.includes("getFeedbackForAthlete(athleteId, 'coach')"),
    false,
    'athlete development must not request coach visibility for every role',
  );
  assert.equal(
    loadDevelopmentBody.includes('ensureCoachSessionsSeeded(),'),
    false,
    'screen loader must not call the local session seed directly',
  );
});

test('athlete development only renders profile controls a parent can complete', () => {
  const source = readProjectFile('app/development/athlete/[athleteId]/index.tsx');

  assert.ok(source.includes("currentUser?.accountType === 'PARENT'"));
  assert.ok(source.includes("currentUser?.role === 'PARENT'"));
  assert.ok(source.includes('{canManageProfile ? ('));
  assert.ok(source.includes('{canManageProfile && editingPosition ? ('));
});

test('athlete development hero only presents factual session data', () => {
  const hook = readProjectFile('hooks/use-athlete-development.ts');
  const hero = readProjectFile('components/development/dev-athlete-hero.tsx');
  const screen = readProjectFile('app/development/athlete/[athleteId]/index.tsx');

  assert.equal(hook.includes('LevelBadge'), false);
  assert.equal(hook.includes("name: 'Bronze'"), false);
  assert.equal(hook.includes("return 'steady' as const"), false);

  assert.equal(hero.includes('StatCard'), false);
  assert.equal(hero.includes('Avg Rating'), false);
  assert.equal(hero.includes('Total Sessions'), false);
  assert.equal(hero.includes('trend'), false);
  assert.equal(hero.includes('level'), false);
  assert.ok(hero.includes('sessionCount: number'));
  assert.ok(hero.includes('lastSessionAt?: string'));
  assert.ok(hero.includes('formatShortDateWithYear(lastSessionAt)'));

  assert.ok(screen.includes('sessionCount={sessions.length}'));
  assert.ok(screen.includes('lastSessionAt={sortedSessions[0]?.completedAt}'));
  assert.ok(screen.includes("session{sortedSessions.length === 1 ? '' : 's'} completed"));
});
