import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('roster athlete progress tab uses live progress aggregate outside mock mode', () => {
  const source = readSource('components/athlete/athlete-progress.tsx');
  const apiLoadStart = source.indexOf('progressService');
  const mockSkillsStart = source.indexOf('? getMockSkills(athlete)');
  const mockGoalsStart = source.indexOf('? getMockGoals(athlete)');
  const mockBadgesStart = source.indexOf('? getMockBadges(athlete)');

  assert.ok(source.includes("from '@/services/progress-service'"));
  assert.ok(source.includes("progressService\n      .getAthleteProgress(athlete.athleteId, 'coach')"));
  assert.ok(source.includes('if (apiClient.isMockMode) return;'));
  assert.ok(mockSkillsStart > apiLoadStart);
  assert.ok(mockGoalsStart > apiLoadStart);
  assert.ok(mockBadgesStart > apiLoadStart);
});
