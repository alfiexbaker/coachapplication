import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('emergency access authority boundary', () => {
  it('requires a roster entry before reading emergency data', () => {
    const hook = readSource('hooks/use-emergency-access.ts');

    assert.match(
      hook,
      /if \(!entry\) \{\s+return err\(serviceError\('NOT_FOUND', 'Emergency information is unavailable\.'\)\);/,
    );
    assert.ok(hook.indexOf('if (!entry) {') < hook.indexOf('safetyService.getAthleteEmergency('));
    assert.match(hook, /currentUser\?\.role === 'COACH' && currentUser\.isVerified/);
    assert.match(hook, /isVerifiedCoach: true/);
  });

  it('does not expose a retry control on terminal access errors', () => {
    const screen = readSource('app/roster/[athleteId]/emergency.tsx');

    assert.match(
      screen,
      /title=\{terminalAccessError \? 'Emergency information unavailable' : undefined\}/,
    );
    assert.match(
      screen,
      /e\.error\?\.message \?\? 'This player is not available from your roster\.'/,
    );
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : e\.retry\}/);
    assert.match(screen, /accessibilityLabel="Refresh emergency information"/);
  });

  it('keeps complete medical alert labels in one detail section', () => {
    const screen = readSource('app/roster/[athleteId]/emergency.tsx');
    const card = readSource('components/safety/EmergencyQuickCard.tsx');

    assert.doesNotMatch(screen, /allergies=\{e\.emergencyData\.allergies\}/);
    assert.doesNotMatch(card, /MedicalItemChips/);
  });
});
