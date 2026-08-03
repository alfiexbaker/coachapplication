import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('the admin users surface reads backend authority instead of auth-switcher fixtures', () => {
  const screenSource = readSource('components/admin/users-screen.tsx');
  const hookSource = readSource('hooks/use-admin-user-summary.ts');
  const serviceSource = readSource('services/admin-user-service.ts');

  assert.equal(screenSource.includes('availableUsers'), false);
  assert.equal(screenSource.includes('useAuth'), false);
  assert.equal(hookSource.includes('adminUserService.getSummary()'), true);
  assert.equal(serviceSource.includes("'/v1/admin/users/summary'"), true);
});

test('club admins leave the platform-admin users surface', () => {
  const authSource = readSource('hooks/use-auth.tsx');
  const homeSource = readSource('app/(tabs)/index.tsx');

  assert.equal(
    authSource.includes(
      "normalizedRoles.includes('club_admin') || normalizedRoles.includes('security_admin')",
    ),
    false,
  );
  assert.equal(homeSource.includes('currentUser.isSystemAdmin'), true);
  assert.equal(homeSource.includes('Routes.MY_CLUBS'), true);
});
