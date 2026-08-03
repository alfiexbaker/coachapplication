import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('profile connection controls fail closed when API relationship reads fail', () => {
  const source = readSource('app/profile/[userId].tsx');
  const effectStart = source.indexOf('void getConnectionSnapshot(currentUser?.id, data.id)');
  const labelStart = source.indexOf('const connectionButtonLabel = (() => {', effectStart);
  const actionStart = source.indexOf('const canTriggerConnectionAction =', labelStart);
  const renderStart = source.indexOf('{canManageConnection && (', actionStart);

  assert.ok(effectStart >= 0, 'test should find connection snapshot load');
  assert.ok(labelStart > effectStart, 'test should find connection label derivation');
  assert.ok(actionStart > labelStart, 'test should find connection action guard');
  assert.ok(renderStart > actionStart, 'test should find connection render block');

  const effectBlock = source.slice(effectStart, labelStart);
  const labelBlock = source.slice(labelStart, actionStart);
  const actionGuardBlock = source.slice(actionStart, renderStart);
  const renderBlock = source.slice(renderStart, source.indexOf('{canMessage ?', renderStart));

  assert.ok(
    source.includes('const [connectionError, setConnectionError] = useState<string | null>(null);'),
    'profile should track unknown live connection state',
  );
  assert.match(
    effectBlock,
    /setConnectionError\(null\);[\s\S]*applyConnectionSnapshot\(snapshot, setConnectionState, setIncomingRequestId\);/,
    'successful live relationship reads should clear the fail-closed state',
  );
  assert.match(
    effectBlock,
    /if \(!api\.useMock\) \{[\s\S]*setConnectionError\('Could not load connection status\. Pull to retry\.'\);[\s\S]*return;[\s\S]*\}/,
    'API relationship read failures must not fall through to the mock fallback snapshot',
  );
  assert.match(
    effectBlock,
    /\{ connectionState: 'none', incomingRequestId: null \}/,
    'mock compatibility may still use the local none fallback',
  );
  assert.ok(
    labelBlock.includes("if (connectionError) return 'Connection unavailable';"),
    'connection button should not advertise Connect while relationship state is unknown',
  );
  assert.ok(
    actionGuardBlock.includes('!connectionError &&'),
    'connection action should be disabled until live relationship state is known',
  );
  assert.ok(
    renderBlock.includes('styles.connectionError') && renderBlock.includes('{connectionError}'),
    'profile should show why the connection action is disabled',
  );
});
