import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('privacy settings fail closed when blocked-user authority is unavailable', () => {
  const source = readProjectFile('hooks/use-privacy-settings.ts');
  const blockReadStart = source.indexOf('blockService.getBlockedUsers(userId)');
  const returnStart = source.indexOf('return ok({', blockReadStart);

  assert.ok(blockReadStart >= 0, 'expected privacy settings to read blocked users');
  assert.ok(returnStart > blockReadStart, 'expected data return after blocked-user read');

  const beforeReturn = source.slice(blockReadStart, returnStart);

  assert.equal(
    source.includes('blockedUsers: blockedResult.success ? blockedResult.data : []'),
    false,
    'blocked-user authority failures must not render as an empty block list',
  );
  assert.ok(
    beforeReturn.includes('if (!blockedResult.success)') &&
      beforeReturn.includes('return err(blockedResult.error);'),
    'blocked-user authority failure should fail the privacy settings load',
  );
  assert.ok(
    source.includes('blockedUsers: blockedResult.data'),
    'successful blocked-user reads should still populate blockedUsers from /v1/blocks',
  );
});
