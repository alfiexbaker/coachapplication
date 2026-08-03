import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('connection status has one authoritative initial state source', () => {
  const source = readSource('hooks/useConnectionStatus.ts');

  assert.equal(
    source.includes('NetInfo.fetch'),
    false,
    'a late fetch must not overwrite the state delivered by the subscription',
  );
  assert.ok(source.includes('NetInfo.addEventListener'));
  assert.ok(
    source.includes("if (Platform.OS === 'web')"),
    'web should use the browser connectivity source instead of NetInfo reachability probes',
  );
  assert.ok(
    source.includes("window.addEventListener('online', updateBrowserConnection)"),
    'web should recover from a confirmed online transition',
  );
  assert.ok(
    source.includes("window.addEventListener('offline', updateBrowserConnection)"),
    'web should surface a confirmed offline transition',
  );
  assert.ok(
    source.includes('isConnectedRef.current = connected;'),
    'the transition ref should update in the same callback as React state',
  );
});

test('API mode does not claim that offline writes were saved for later sync', () => {
  const source = readSource('components/ui/offline-banner.tsx');

  assert.ok(source.includes('const USE_MOCK = api.useMock;'));
  assert.ok(source.includes('USE_MOCK && queueSize > 0'));
  assert.ok(
    source.includes('!isConnected && (!USE_MOCK || queueSize > 0)'),
    'an idle mock runtime must not spend screen chrome on an offline warning',
  );
  assert.ok(source.includes(`: "You're offline. Check your connection.";`));
  assert.ok(
    source.includes('if (!showBanner)'),
    'an inactive banner must not remain in the accessibility tree',
  );
});
