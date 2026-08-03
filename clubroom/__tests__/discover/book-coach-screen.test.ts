import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('coach search prioritises finding and booking over promo metrics', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/book-coach.tsx'), 'utf8');
  const cardAvailability = fs.readFileSync(
    path.join(process.cwd(), 'components/coach/coach-card-availability.tsx'),
    'utf8',
  );

  assert.match(source, /Find a coach/);
  assert.match(source, /Search coach, focus, city\.\.\./);
  assert.match(source, /handleOpenMap/);
  assert.match(source, /<FilterBar/);
  assert.match(source, /onBookNow=/);
  assert.match(source, /return 'Next: Tomorrow';/);
  assert.doesNotMatch(source, /reviewQuote/);
  assert.doesNotMatch(source, /toLocaleTimeString/);
  assert.doesNotMatch(source, /Map-first discovery/);
  assert.doesNotMatch(source, /Find a Coach Nearby/);
  assert.doesNotMatch(source, /Search trusted local coaches/);
  assert.doesNotMatch(source, /Starting price/);
  assert.doesNotMatch(source, /Avg rating/);
  assert.match(cardAvailability, /£\{pricePerHour\}\/session/);
  assert.doesNotMatch(cardAvailability, /\/hr/);
});
