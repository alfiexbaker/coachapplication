import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getRestrictedTabRoutes } from '../../constants/route-access';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('legacy coach profile links route coaches to the editor and everyone else home', () => {
  const source = readSource('app/(tabs)/coach-profile.tsx');

  assert.ok(source.includes("currentUser?.role === 'COACH' ? Routes.EDIT_PROFILE : Routes.HOME"));
  assert.ok(source.includes('if (isLoading) return null'));
  assert.equal(source.includes('useEffect'), false);
  assert.equal(source.includes('LoadingState'), false);
  assert.equal(source.includes('useCoachProfile'), false);
});

test('canonical editor starts with editable information instead of dead photo cards', () => {
  const screenSource = readSource('app/(tabs)/edit-profile.tsx');
  const basicInfoSource = readSource('components/profile/edit-basic-info.tsx');

  assert.equal(
    screenSource.includes('EditPhotoSection'),
    false,
    'the editor must not render read-only cover and profile photo cards as editing controls',
  );
  assert.equal(
    fs.existsSync(path.join(ROOT, 'components/profile/edit-photo-section.tsx')),
    false,
    'the dead photo-only component should be deleted',
  );
  assert.ok(
    basicInfoSource.includes('maxLength={500}'),
    'the bio field must accept the 500 characters promised by its counter',
  );
});

test('settings has one profile-editing entry instead of a duplicate coach dashboard', () => {
  const source = readSource('app/settings/index.tsx');

  assert.ok(source.includes('router.push(Routes.EDIT_PROFILE);'));
  assert.equal(source.includes('router.push(Routes.COACH_PROFILE);'), false);
  assert.equal(source.includes('title="Coach Profile"'), false);
});

test('only coaches can reach the compatibility route', () => {
  assert.equal(getRestrictedTabRoutes('COACH').has('coach-profile'), false);
  assert.equal(getRestrictedTabRoutes('USER').has('coach-profile'), true);
  assert.equal(getRestrictedTabRoutes('PARENT').has('coach-profile'), true);
  assert.equal(getRestrictedTabRoutes('ADMIN').has('coach-profile'), true);
  assert.equal(getRestrictedTabRoutes('DEFAULT').has('coach-profile'), true);
});

test('disabled clickable controls keep their button semantics', () => {
  const source = readSource('components/primitives/clickable.tsx');

  assert.ok(
    source.includes("accessibilityRole ?? (onPress || onLongPress ? 'button' : undefined)"),
  );
  assert.ok(source.includes('{ ...accessibilityState, disabled: true }'));
  assert.equal(source.includes('(handlePress || handleLongPress ?'), false);
});
