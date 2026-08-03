import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('match list controls follow backend club and fixture capabilities', () => {
  const hook = fs.readFileSync(path.join(ROOT, 'hooks/use-matches-screen.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(ROOT, 'app/matches/index.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(ROOT, 'components/match/match-card.tsx'), 'utf8');

  assert.ok(hook.includes('const canCreateMatch = data?.canCreateMatch === true;'));
  assert.ok(hook.includes('club.canManageMatches === true'));
  assert.equal(hook.includes("currentUser?.role === 'COACH'"), false);
  assert.equal(screen.includes('isCoach,'), false);
  assert.ok(card.includes('const canManageMatch = match.canManageMatch === true;'));
  assert.ok(card.includes('{canManageMatch && isUpcoming && <MatchAvailabilityRow match={match} />}'));
});
