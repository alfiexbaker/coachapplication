import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('family sharing authority boundary', () => {
  it('does not create a family through a read and only exposes admin actions to an admin', () => {
    const hook = readSource('hooks/use-family-sharing.ts');
    const screen = readSource('app/family/sharing.tsx');
    const relationshipService = readSource('services/family/family-relationship-service.ts');

    assert.match(hook, /familyService\.findFamilyAccount\(/);
    assert.doesNotMatch(
      hook,
      /familyService\.getFamilyAccount\(/,
      'opening Family Sharing must not create a mock family account',
    );
    assert.match(hook, /guardian\.permissions\.includes\('ADMIN'\)/);
    assert.match(hook, /!family \|\| !currentUser \|\| !canManageFamily/);
    assert.match(
      relationshipService,
      /async findFamilyAccount\([\s\S]*?return this\.getFamilyAccount/,
    );
    assert.match(screen, /onRemove=\{canManageFamily \? handleRemoveGuardian : undefined\}/);
    assert.match(screen, /onCancel=\{canManageFamily \? handleCancelInvite : undefined\}/);
    assert.match(screen, /\{canManageFamily \? \(/);
    assert.doesNotMatch(screen, /actionLabel="Retry"/);
  });
});
