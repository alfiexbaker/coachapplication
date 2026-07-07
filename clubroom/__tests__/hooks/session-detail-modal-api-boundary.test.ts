import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('session detail modal API boundaries', () => {
  it('does not derive display names from the local user directory', () => {
    const source = readProjectFile('hooks/use-session-detail-modal.ts');

    assert.doesNotMatch(source, /STORAGE_KEYS\.USERS/);
    assert.doesNotMatch(source, /apiClient\.get<User\[\]>/);
    assert.match(source, /staffingResult\.data\.staff[\s\S]*member\.canTakeAssignments/);
    assert.match(source, /offering\.registrations/);
  });
});
