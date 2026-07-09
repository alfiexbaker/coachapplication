import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

function readCount(content: string, label: string): number {
  const match = content.match(new RegExp(`- ${label}: (\\d+)`));
  assert.ok(match, `Expected fixture coverage count for ${label}`);
  return Number(match[1]);
}

function accountBlock(content: string, email: string): string {
  const start = content.indexOf(`Email: ${email}`);
  assert.notEqual(start, -1, `Expected ${email} in generated test credentials`);
  const next = content.indexOf('\nEmail: ', start + 1);
  return content.slice(start, next === -1 ? undefined : next);
}

describe('test account credentials generator', () => {
  it('writes fixture-derived demo credentials with attached coach coverage', () => {
    const repoRoot = process.cwd();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'clubroom-test-accounts-'));
    const outputPath = path.join(tempDir, 'TEST_ACCOUNTS.local.txt');

    try {
      execFileSync(
        process.execPath,
        ['scripts/write-test-account-credentials.js', `--out=${outputPath}`],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        },
      );

      const content = readFileSync(outputPath, 'utf8');
      assert.match(content, /Scope: local\/staging\/demo only/);
      assert.match(content, /PasswordCredential\.passwordHash as salted scrypt hashes/);
      assert.ok(readCount(content, 'usersWithEmail') > 0);
      assert.ok(readCount(content, 'attachedCoaches') > 0);
      assert.ok(readCount(content, 'athletes') > 0);
      assert.ok(readCount(content, 'guardianChildLinks') > 0);

      const coach = accountBlock(content, 'amelia.shaw@clubroom.demo');
      assert.match(coach, /Password: coach/);
      assert.match(coach, /Roles: coach/);
      assert.match(coach, /Attached: .*coachProfile=yes/);
      assert.match(coach, /Attached: .*clubs=.*:coach/);

      const admin = accountBlock(content, 'clara.finch@clubroom.demo');
      assert.match(admin, /Password: admin/);
      assert.match(admin, /Roles: club_admin/);

      const parent = accountBlock(content, 'olivia.barton@clubroom.demo');
      assert.match(parent, /Password: user/);
      assert.match(parent, /Roles: parent/);
      assert.match(parent, /Attached: .*children=/);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
