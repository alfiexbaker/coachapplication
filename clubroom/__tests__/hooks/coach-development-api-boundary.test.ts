import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach development reads live coach feedback history in API mode', () => {
  const source = readProjectFile('hooks/use-coach-development.ts');

  assert.ok(source.includes("import { apiClient } from '@/services/api-client';"));
  assert.ok(source.includes('progressFeedbackService'));
  assert.ok(source.includes('type SessionFeedback'));
  assert.ok(source.includes('function mapFeedbackToDevelopmentSession'));
  assert.ok(source.includes('athleteName: feedback.athleteName'));
  assert.ok(source.includes('async function loadCoachDevelopmentSessions'));
  assert.ok(source.includes('bookingService.getAwaitingCompletion(currentUser.id)'));
  assert.ok(source.includes('rosterService.getRoster(currentUser.id)'));
  assert.ok(source.includes('awaitingCompletion: resolvedAwaitingCompletion'));
  assert.ok(source.includes('return athleteName ? [athleteName] : [];'));
  assert.equal(
    source.includes('userService.getUsersByIds'),
    false,
    'Athlete entity ids must not be sent to the user-profile endpoint',
  );

  const helperStart = source.indexOf('async function loadCoachDevelopmentSessions');
  assert.ok(helperStart >= 0, 'test should find coach development session loader');

  const mockBranchStart = source.indexOf('if (apiClient.isMockMode)', helperStart);
  assert.ok(mockBranchStart > helperStart, 'local development sessions must be mock-mode only');
  const apiCallStart = source.indexOf(
    'progressFeedbackService.getFeedbackForCoach(coachUserId)',
    mockBranchStart,
  );
  assert.ok(apiCallStart > mockBranchStart, 'API mode should load live coach feedback history');

  const mockBranch = source.slice(mockBranchStart, apiCallStart);
  assert.ok(mockBranch.includes('ensureCoachSessionsSeeded()'));
  assert.ok(mockBranch.includes('session.coachId === coachUserId'));

  const loadStart = source.indexOf('const loadDevelopment = async () => {');
  const sessionLoadStart = source.indexOf('loadCoachDevelopmentSessions(currentUser.id)', loadStart);
  const bookingStart = source.indexOf(
    'bookingService.getAwaitingCompletion(currentUser.id)',
    loadStart,
  );

  assert.ok(loadStart >= 0, 'test should find coach development loader');
  assert.ok(sessionLoadStart > loadStart, 'screen should load sessions through the helper');
  assert.ok(bookingStart > sessionLoadStart, 'booking authority should still load completion work');
  assert.equal(
    source.includes('Promise.resolve<Session[]>([])'),
    false,
    'API mode must not return an invented empty coach history when feedback authority exists',
  );
  assert.ok(
    source.includes('formatAthleteName(session.athleteName)'),
    'Coach development must use the athlete name returned by live feedback authority',
  );
});
