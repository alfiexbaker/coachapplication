import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('booking draft state is reset at authenticated provider boundaries', () => {
  const contextSource = readFileSync(path.join(root, 'context/booking-flow-context.tsx'), 'utf8');
  const layoutSource = readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');

  assert.match(
    contextSource,
    /useState<BookingDraft>\(\{\}\)/,
    'a remounted provider must not render the service singleton draft',
  );
  assert.match(
    contextSource,
    /useEffect\(\(\) => \{[\s\S]*bookingService\.resetDraft\(\);[\s\S]*return \(\) => \{[\s\S]*bookingService\.resetDraft\(\);[\s\S]*\};[\s\S]*\}, \[\]\);/,
    'provider mount and unmount must clear the service singleton draft',
  );
  assert.match(
    layoutSource,
    /<BookingFlowProvider key=\{currentUserId\}>/,
    'auth identity changes must remount the booking flow provider',
  );
});
