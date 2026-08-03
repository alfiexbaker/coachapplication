import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('edit-child-profile boundary', () => {
  it('proves edit authority before rendering player controls', () => {
    const screen = readSource('app/(modal)/edit-child-profile.tsx');
    const hook = readSource('hooks/use-edit-child-profile.ts');
    const service = readSource('services/child-service.ts');

    assert.match(hook, /childService\.canManageChildProfile\(childId, currentUser\)/);
    assert.ok(
      hook.indexOf('childService.canManageChildProfile(childId, currentUser)') <
        hook.indexOf('childService.getChild(childId)'),
    );
    assert.match(screen, /editor\.access === 'denied'/);
    assert.match(screen, /Profile editing unavailable/);
    assert.match(service, /getGuardianPermissions/);
    assert.match(service, /getAccessibleChildren/);
    assert.match(service, /includes\('MANAGE_PROFILE'\)/);
  });

  it('keeps the modal focused on one player-profile intent', () => {
    const screen = readSource('app/(modal)/edit-child-profile.tsx');
    const hook = readSource('hooks/use-edit-child-profile.ts');

    assert.match(screen, /DateOfBirthField/);
    assert.match(screen, /Save changes/);
    assert.doesNotMatch(screen, /SurfaceCard|Health & Safety|Notes for Coaches/);
    assert.doesNotMatch(screen, /Manage Medical|Manage Emergency/);
    assert.doesNotMatch(
      hook,
      /communicationNotes|behavioralNotes|openMedicalInfo|openEmergencyContacts/,
    );
  });

  it('uses semantic controls, inline failure, and a single guarded save', () => {
    const screen = readSource('app/(modal)/edit-child-profile.tsx');
    const hook = readSource('hooks/use-edit-child-profile.ts');

    assert.match(screen, /accessibilityLabel="First name"/);
    assert.match(screen, /accessibilityLabel="Last name"/);
    assert.match(screen, /accessibilityRole="radio"/);
    assert.match(screen, /accessibilityState=\{\{ checked: selected \}\}/);
    assert.match(screen, /accessibilityRole="alert"/);
    assert.doesNotMatch(screen, /\n\s+accessible\n/);
    assert.match(hook, /submissionInFlight\.current/);
    assert.match(hook, /setFormError\(result\.error\.message/);
    assert.match(hook, /nickname: nickname\.trim\(\)/);
    assert.match(hook, /dateOfBirth: selectedDate/);
  });

  it('rejects surplus API fields and records validation denials without values', () => {
    const routes = readSource('apps/api/src/modules/family-athlete/routes.ts');

    assert.match(routes, /const updateAthleteRequestSchema[\s\S]*?\.strict\(\)/);
    assert.match(routes, /z\.enum\(\['GK', 'DEF', 'MID', 'ATT'\]\)/);
    assert.match(routes, /errorCode: auditErrorCode\(error\)/);
    assert.match(routes, /requestedFields,/);
    assert.doesNotMatch(routes, /metadata:\s*\{[^}]*request\.body/s);
  });
});
