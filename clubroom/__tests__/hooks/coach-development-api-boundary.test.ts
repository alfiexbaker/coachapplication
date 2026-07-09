import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach development does not seed demo sessions in API mode', () => {
  const source = readProjectFile('hooks/use-coach-development.ts');

  assert.ok(source.includes("import { apiClient } from '@/services/api-client';"));
  assert.ok(source.includes('bookingService.getAwaitingCompletion(currentUser.id)'));

  const loadStart = source.indexOf('const loadDevelopment = async () => {');
  const seedStart = source.indexOf('ensureCoachSessionsSeeded()', loadStart);
  const bookingStart = source.indexOf(
    'bookingService.getAwaitingCompletion(currentUser.id)',
    loadStart,
  );

  assert.ok(loadStart >= 0, 'test should find coach development loader');
  assert.ok(seedStart > loadStart, 'test should find coach session seed call');
  assert.ok(bookingStart > seedStart, 'booking authority should still load completion work');

  const seedLineStart = source.lastIndexOf('\n', seedStart);
  const seedLineEnd = source.indexOf('\n', seedStart);
  const seedLine = source.slice(seedLineStart, seedLineEnd);
  assert.ok(seedLine.includes('apiClient.isMockMode ? ensureCoachSessionsSeeded()'));
});
