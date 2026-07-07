import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('account settings saves email and phone through auth profile API in API mode', () => {
  const source = readSource('hooks/use-account-settings.ts');
  assert.ok(
    source.includes("import { authService } from '@/services/auth-service';"),
    'account settings should use authService for live identity profile writes',
  );

  const emailStart = source.indexOf('const handleSaveEmail = async () => {');
  const emailGuard = source.indexOf('if (!apiClient.isMockMode)', emailStart);
  const emailAuthWrite = source.indexOf(
    'authService.updateProfile({ email: nextEmail })',
    emailStart,
  );
  const emailLocalWrite = source.indexOf(
    'userService.updateUserProfile(currentUser.id, { email: nextEmail })',
    emailStart,
  );

  assert.ok(emailStart >= 0, 'test should find email save handler');
  assert.ok(emailGuard >= 0, 'email save must guard API mode');
  assert.ok(emailAuthWrite >= 0, 'email save should call auth profile API');
  assert.ok(emailLocalWrite >= 0, 'test should find mock local email write');
  assert.ok(
    emailGuard < emailLocalWrite,
    'email save must not reach local USERS write in API mode',
  );

  const phoneStart = source.indexOf('const handleSavePhone = async () => {');
  const phoneGuard = source.indexOf('if (!apiClient.isMockMode)', phoneStart);
  const phoneAuthWrite = source.indexOf(
    'authService.updateProfile({ phone: nextPhone })',
    phoneStart,
  );
  const phoneLocalWrite = source.indexOf(
    'userService.updateUserProfile(currentUser.id, {\n      phone: nextPhone,\n    })',
    phoneStart,
  );

  assert.ok(phoneStart >= 0, 'test should find phone save handler');
  assert.ok(phoneGuard >= 0, 'phone save must guard API mode');
  assert.ok(phoneAuthWrite >= 0, 'phone save should call auth profile API');
  assert.ok(phoneLocalWrite >= 0, 'test should find mock local phone write');
  assert.ok(
    phoneGuard < phoneLocalWrite,
    'phone save must not reach local USERS write in API mode',
  );
});
