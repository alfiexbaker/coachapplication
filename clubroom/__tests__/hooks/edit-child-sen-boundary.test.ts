import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('edit-child-sen boundary', () => {
  it('proves profile-management authority before loading support data', () => {
    const screen = readSource('app/(modal)/edit-child-sen.tsx');
    const hook = readSource('hooks/use-edit-child-sen.ts');

    assert.match(hook, /childService\.canManageChildProfile\(childId, currentUser\)/);
    assert.ok(
      hook.indexOf('childService.canManageChildProfile(childId, currentUser)') <
        hook.indexOf('childService.getChild(childId)'),
    );
    assert.match(screen, /editor\.access === 'denied'/);
    assert.match(hook, /access: 'not_found'/);
    assert.match(screen, /editor\.access === 'not_found'/);
    assert.match(screen, /Support editing unavailable/);
    assert.match(screen, /You do not have permission to edit this player’s support information\./);
  });

  it('keeps support changes local until one guarded, atomic save', () => {
    const hook = readSource('hooks/use-edit-child-sen.ts');

    assert.equal(hook.match(/childService\.updateChild\(/g)?.length, 1);
    assert.doesNotMatch(
      hook,
      /childService\.(addDisability|removeDisability|addSpecialNeed|removeSpecialNeed)\(/,
    );
    assert.match(
      hook,
      /childService\.updateChild\(child\.id, \{[\s\S]*?disabilities,[\s\S]*?specialNeeds,[\s\S]*?communicationNotes: communicationNotes\.trim\(\),[\s\S]*?behavioralNotes: behavioralNotes\.trim\(\),/,
    );
    assert.match(hook, /submissionInFlight\.current/);
    assert.match(hook, /setFormError\(result\.error\.message/);
    assert.doesNotMatch(hook, /communicationNotes\.trim\(\) \|\| undefined/);
  });

  it('uses one lean intent with semantic controls and inline feedback', () => {
    const screen = readSource('app/(modal)/edit-child-sen.tsx');
    const sections = readSource('components/family/medical-special-needs-form-sections.tsx');

    assert.match(screen, /title="Player support"/);
    assert.match(screen, /accessibilityRole="alert"/);
    assert.match(screen, /accessibilityLabel="Communication guidance, optional"/);
    assert.match(screen, /accessibilityLabel="Behaviour and regulation guidance, optional"/);
    assert.match(screen, /label=\{editor\.saving \? 'Saving…' : 'Save changes'\}/);
    assert.doesNotMatch(screen, /SurfaceCard|Current Disabilities|Notes for Coaches|Edit SEN/);
    assert.doesNotMatch(screen, /\n\s+accessible\n/);
    assert.match(sections, /accessibilityRole="radio"/);
    assert.match(sections, /label="Add condition"/);
    assert.match(sections, /label="Add adjustment"/);
    assert.match(sections, /Conditions and access needs/);
    assert.match(sections, /Session adjustments/);
    assert.match(sections, /removeAction: \{[\s\S]*?width: 44,[\s\S]*?height: 44,/);
  });

  it('bounds nested support payloads and audits only field names', () => {
    const routes = readSource('apps/api/src/modules/family-athlete/routes.ts');

    assert.match(routes, /const supportTextSchema = z\.string\(\)\.trim\(\)\.max\(500\)/);
    assert.match(routes, /const supportTagListSchema = z\.array[\s\S]*?\.max\(10\)/);
    assert.match(routes, /const disabilitySchema[\s\S]*?\.strict\(\)/);
    assert.match(routes, /const specialNeedSchema[\s\S]*?\.strict\(\)/);
    assert.match(routes, /disabilities: z\.array\(disabilitySchema\)\.max\(20\)/);
    assert.match(routes, /specialNeeds: z\.array\(specialNeedSchema\)\.max\(20\)/);
    assert.match(routes, /metadata: \{\s+familyId,\s+fields: Object\.keys\(body\)\.sort\(\),\s+\}/);
    assert.match(routes, /requestedFields,/);
    assert.doesNotMatch(routes, /metadata:\s*\{[^}]*request\.body/s);
  });
});
