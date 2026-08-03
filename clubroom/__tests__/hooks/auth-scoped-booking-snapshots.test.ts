import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { buildAuthScopedSnapshotKey } from '@/utils/auth-scoped-snapshot-key';

const root = process.cwd();
const hookPaths = [
  'hooks/use-bookings.ts',
  'hooks/use-bookings-discover.ts',
  'hooks/use-discover-sessions.ts',
  'hooks/use-booking-detail.ts',
  'hooks/use-booking-cancel.ts',
];

describe('auth-scoped booking snapshots', () => {
  it('does not produce cache keys for signed-out viewers', () => {
    assert.equal(buildAuthScopedSnapshotKey(undefined, 'bookings'), null);
    assert.equal(buildAuthScopedSnapshotKey(null, 'bookings'), null);
    assert.equal(buildAuthScopedSnapshotKey('  ', 'bookings'), null);
  });

  it('separates identities and child scopes', () => {
    const firstViewer = buildAuthScopedSnapshotKey('usr_parent_one', 'bookings', 'ath_one');
    const secondViewer = buildAuthScopedSnapshotKey('usr_parent_two', 'bookings', 'ath_one');
    const secondChild = buildAuthScopedSnapshotKey('usr_parent_one', 'bookings', 'ath_two');

    assert.notEqual(firstViewer, secondViewer);
    assert.notEqual(firstViewer, secondChild);
  });

  it('keys every booking and invite warm snapshot by authenticated identity', () => {
    for (const relativePath of hookPaths) {
      const source = readFileSync(path.join(root, relativePath), 'utf8');
      assert.match(source, /buildAuthScopedSnapshotKey\(\s*currentUser\?\.id/);
      assert.match(
        source,
        /status === 'loading' && snapshotKey/,
        `${relativePath} must not use a warm snapshot after an API error or empty response`,
      );
    }
  });
});
