import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('mutable collection refs initialize once through the shared lazy boundary', () => {
  const lazyRefSource = readProjectFile('hooks/use-lazy-ref.ts');
  assert.match(
    lazyRefSource,
    /const \[ref\] = useState\(\(\) => \(\{ current: createValue\(\) \}\)\);/,
  );
  assert.doesNotMatch(lazyRefSource, /ref\.current\s*=/);

  const targets = [
    'app/(tabs)/feed.tsx',
    'app/chat/[threadId].tsx',
    'components/group/roll-call-modal.tsx',
    'hooks/use-bookings.ts',
    'hooks/use-progress-loop.ts',
    'hooks/use-screen.ts',
    'hooks/use-session-payments.ts',
  ];
  let lazyInitializerCount = 0;
  for (const target of targets) {
    const source = readProjectFile(target);
    lazyInitializerCount += source.match(/useLazyRef\(\(\) => new (?:Map|Set)</g)?.length ?? 0;
    assert.doesNotMatch(source, /useRef(?:<[^>]+>)?\(new (?:Map|Set)/);
  }

  assert.equal(lazyInitializerCount, 10);
});
