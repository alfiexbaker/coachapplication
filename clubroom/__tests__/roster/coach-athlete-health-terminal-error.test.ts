import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('coach athlete health terminal error', () => {
  it('does not offer retry when the player is unavailable from the roster', () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), 'hooks/use-coach-athlete-health.ts'),
      'utf8',
    );
    const screen = fs.readFileSync(
      path.join(process.cwd(), 'app/roster/[athleteId]/health.tsx'),
      'utf8',
    );

    assert.match(hook, /currentUser\?\.role === 'COACH' && currentUser\.isVerified/);
    assert.match(hook, /coach-athlete-health:\$\{coachId\}:verified:/);
    assert.match(screen, /title=\{terminalAccessError \? 'Health review unavailable' : undefined\}/);
    assert.match(screen, /terminalAccessError\n\s*\? h\.error\?\.message \?\? 'This player is not available from your roster\.'/);
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : h\.retry\}/);
    assert.doesNotMatch(screen, /delivery handoff/);
  });

  it('uses direct status copy for a coach-visible healthy record', () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), 'hooks/use-coach-athlete-health.ts'),
      'utf8',
    );
    const screen = fs.readFileSync(
      path.join(process.cwd(), 'app/roster/[athleteId]/health.tsx'),
      'utf8',
    );
    const card = fs.readFileSync(
      path.join(process.cwd(), 'components/health/health-status-card.tsx'),
      'utf8',
    );

    assert.match(hook, /injuryService\.getAthleteInjuries\(athleteId\)/);
    assert.doesNotMatch(hook, /getUserInjuriesForActor\(coachId, athleteId/);
    assert.match(screen, /Use Emergency Info for time-critical/);
    assert.doesNotMatch(screen, /Family-only notes|No shared injuries/);
    assert.match(card, /No active injuries/);
    assert.match(card, /No coach-visible injury records\./);
    assert.doesNotMatch(card, /All Clear!|Keep up the great work!/);
  });
});
