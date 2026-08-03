import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('account settings exposes only truthful self-service account actions', () => {
  const source = readSource('hooks/use-account-settings.ts');
  const screen = readSource('app/settings/account.tsx');
  assert.ok(
    source.includes("import { authService } from '@/services/auth-service';"),
    'account settings should use authService for live identity profile writes',
  );
  assert.ok(
    source.includes(
      "import { dataDeletionRequestService, type DataDeletionRequest } from '@/services/trust';",
    ),
    'account settings should use the trust service for live closure requests',
  );

  assert.equal(source.includes('handleSaveEmail'), false, 'email must remain read-only here');
  assert.equal(screen.includes('setEditingEmail'), false, 'screen must not imply editable email');
  assert.equal(
    source.includes('userService.updateUserProfile'),
    false,
    'account writes must not bypass authService in mock or API mode',
  );

  const phoneStart = source.indexOf('const handleSavePhone = async () => {');
  const phoneAuthWrite = source.indexOf('.updateProfile({ phone: nextPhone })', phoneStart);

  assert.ok(phoneStart >= 0, 'test should find phone save handler');
  assert.ok(phoneAuthWrite >= 0, 'phone save should call auth profile API');
  assert.ok(
    source.includes('if (!currentUser?.id || savingPhone) return;'),
    'phone save should reject duplicate submissions',
  );

  assert.ok(
    source.includes('.forgotPassword(currentUser.email)'),
    'password reset should use the real auth endpoint contract',
  );
  assert.ok(
    source.includes("uiFeedback.showToast('Password reset link sent.', 'success')"),
    'password reset success should only be shown after a successful Result',
  );
  assert.equal(source.includes("logger.press('SavePhone', { phone })"), false);
  assert.equal(source.includes("logger.press('SaveEmail', { email })"), false);

  assert.equal(screen.includes('Contact details vs verification'), false);
  assert.equal(screen.includes('Account Type'), false);
  assert.equal(screen.includes('Member since'), false);
  assert.equal(screen.includes('Change Password'), false);
  assert.ok(screen.includes('Send password reset link'));

  const deleteStart = source.indexOf('const handleDeleteAccount = () => {');
  const deleteApiGuard = source.indexOf('if (!apiClient.isMockMode)', deleteStart);
  const deleteApiWrite = source.indexOf('void requestAccountClosure();', deleteStart);
  const deleteSupportEmail = source.indexOf("handleRequestLifecycleSupport('close')", deleteStart);

  assert.ok(deleteStart >= 0, 'test should find account closure handler');
  assert.ok(deleteApiGuard >= 0, 'account closure must guard API mode');
  assert.ok(deleteApiWrite >= 0, 'account closure should create a live deletion request');
  assert.ok(deleteSupportEmail >= 0, 'test should find mock support-email fallback');
  assert.ok(
    source.includes("logger.error('Account closure request rejected', error)"),
    'unexpected closure request rejections must restore a truthful error state',
  );
  assert.ok(
    deleteApiWrite < deleteSupportEmail,
    'account closure must not open the support-email fallback in API mode',
  );
});
