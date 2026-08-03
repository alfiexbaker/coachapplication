import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('booking feedback entry uses explicit completion and canonical notes routes', () => {
  assert.equal(
    fs.existsSync(path.join(ROOT, 'app/(tabs)/bookings/session-feedback.tsx')),
    false,
    'the loading-only feedback bridge must stay retired',
  );

  const routes = readSource('navigation/routes.ts');
  const layout = readSource('app/(tabs)/bookings/_layout.tsx');
  const completionCard = readSource('components/coach/development-completion-card.tsx');
  const coachView = readSource('components/bookings/booking-coach-view.tsx');
  const notesCard = readSource('components/bookings/booking-notes-card.tsx');
  const completionHook = readSource('hooks/use-session-completion.ts');
  const notesRoute = readSource('app/session-notes/[bookingId].tsx');
  const notesForm = readSource('components/session/session-notes-form.tsx');
  const quickRateHook = readSource('hooks/use-quick-rate.ts');

  assert.equal(routes.includes('sessionFeedback:'), false);
  assert.equal(routes.includes("pathname: '/bookings/session-feedback'"), false);
  assert.equal(layout.includes('name="session-feedback"'), false);
  assert.ok(
    completionCard.includes('return Routes.sessionComplete(booking.id);'),
    'unfinished individual bookings must enter the explicit completion wizard',
  );
  assert.equal(
    completionCard.includes('Routes.sessionFeedback'),
    false,
    'completion cards must not enter a hidden mutation bridge',
  );
  assert.equal(
    coachView.includes('Add session feedback'),
    false,
    'completed booking actions must not duplicate the canonical notes control',
  );
  assert.ok(
    notesCard.includes('router.push(Routes.sessionNotes(bookingId))'),
    'completed booking notes must open the canonical session-notes route',
  );
  assert.ok(
    completionHook.includes("!apiClient.isMockMode && sessionId.startsWith('bok_')"),
    'API-mode booking completion must not probe the unrelated group-session endpoint',
  );
  assert.ok(notesRoute.includes('<PageHeader title={screenTitle} showBack />'));
  assert.equal(notesForm.includes('Select at least one focus area'), false);
  assert.equal(notesForm.includes('Rate athlete effort'), false);
  assert.equal(notesForm.includes('<ScrollView'), false, 'notes form must not nest a scroll view');
  assert.ok(
    quickRateHook.includes('if (controller.signal.aborted) return;'),
    'completion prefill must stop logging and setting state after navigation',
  );
  assert.ok(
    quickRateHook.includes('void Promise.all(') && quickRateHook.includes(').then(() => {'),
    'completion prefill must commit its aggregate result only in the guarded continuation',
  );
});
