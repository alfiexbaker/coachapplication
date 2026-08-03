import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('useScreen mounted lifecycle', () => {
  it('restores its mounted flag when an effect is mounted again', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'hooks/use-screen.ts'), 'utf8');

    assert.match(
      source,
      /useEffect\(\(\) => \{\s+mountedRef\.current = true;\s+return \(\) => \{\s+markUnmounted\(mountedRef\);/,
    );
  });
});
