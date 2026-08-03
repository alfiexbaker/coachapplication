import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('general help keeps support and feedback distinct from booking incident reports', () => {
  const screen = readProjectFile('app/settings/help.tsx');
  const hook = readProjectFile('hooks/use-help-screen.ts');

  assert.match(screen, /title="Email support"/);
  assert.match(screen, /title="Send feedback"/);
  assert.match(hook, /const SUPPORT_EMAIL = 'support@clubroom\.app'/);
  assert.match(hook, /const FEEDBACK_EMAIL = 'feedback@clubroom\.app'/);
  assert.doesNotMatch(screen, /Report a Problem|Share Clubroom|Still need help/);
  assert.doesNotMatch(hook, /BOOKINGS_REPORT_PROBLEM|Share\.share/);
});

test('help questions expose compact accessible disclosure controls without debug copy', () => {
  const screen = readProjectFile('app/settings/help.tsx');

  assert.match(screen, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(screen, /accessibilityHint=\{expanded \? 'Hide answer' : 'Show answer'\}/);
  assert.doesNotMatch(screen, /App Version: 1\.0\.0|Support is handled by email in this build/);
});
