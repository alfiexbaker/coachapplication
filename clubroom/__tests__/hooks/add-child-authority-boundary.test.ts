import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('add-child authority boundary', () => {
  it('blocks direct route content and hides entry points behind one capability', () => {
    const modal = readSource('app/(modal)/add-child.tsx');
    const hook = readSource('hooks/use-add-child.ts');
    const children = readSource('app/(tabs)/children.tsx');
    const home = readSource('components/user/home-screen.tsx');
    const booking = readSource('app/book/[coachId]/details.tsx');

    assert.match(modal, /RouteAccessGate allowed=\{canCreateChild\}/);
    assert.ok(modal.indexOf('<AddChildForm />') < modal.indexOf('function AddChildForm()'));
    assert.match(hook, /childService\.canCreateChild\(\)/);
    assert.match(hook, /shouldLoadFamilyChildren\(currentUser\)/);
    assert.ok(hook.indexOf('if (!familyScopeKey)') < hook.indexOf('childService.canCreateChild()'));
    assert.match(hook, /setAccess\(\{ scopeKey: familyScopeKey, allowed: canCreate \}\)/);
    assert.match(hook, /Boolean\(familyScopeKey && access\?\.scopeKey !== familyScopeKey\)/);
    assert.match(children, /action=\{canCreateChild \?/);
    assert.match(children, /shouldLoadFamilyChildren\(currentUser\)/);
    assert.match(children, /title="Children unavailable"/);
    assert.match(home, /isNewParent && canCreateChild/);
    assert.match(booking, /canCreateChild && !isTargetLocked/);
  });
});
