import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('recurring booking uses the Clubroom pound price unit and direct copy', () => {
  const screen = fs.readFileSync(path.join(process.cwd(), 'app/bookings/subscribe.tsx'), 'utf8');
  const summary = fs.readFileSync(
    path.join(process.cwd(), 'components/recurring/subscribe-summary.tsx'),
    'utf8',
  );
  const form = fs.readFileSync(
    path.join(process.cwd(), 'components/recurring/SubscribeForm.tsx'),
    'utf8',
  );
  const hook = fs.readFileSync(path.join(process.cwd(), 'hooks/use-subscribe.ts'), 'utf8');

  assert.match(screen, /£\{item\.coach\.pricePerSession\}/);
  assert.match(summary, /£\{monthlyEstimate\}/);
  assert.match(screen, /Choose a coach/);
  assert.match(screen, /Set up recurring sessions\./);
  assert.match(form, /Start recurring booking/);
  assert.match(hook, /Recurring booking created\./);
  assert.match(hook, /Failed to create recurring booking\./);
  assert.doesNotMatch(screen, /\$\{item\.coach\.pricePerSession\}/);
  assert.doesNotMatch(summary, /\$\{monthlyEstimate\}/);
  assert.doesNotMatch(screen, /Choose Your Coach/);
});
