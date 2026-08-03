import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('availability navigation goes directly to the canonical Schedule segment', () => {
  const routesSource = readSource('navigation/routes.ts');
  assert.ok(
    routesSource.includes("SCHEDULE_AVAILABILITY: '/(tabs)/schedule?segment=availability'"),
  );

  for (const relativePath of [
    'app/availability/block-date.tsx',
    'app/settings/index.tsx',
    'hooks/use-bookings.ts',
  ]) {
    const source = readSource(relativePath);
    assert.ok(
      source.includes('Routes.SCHEDULE_AVAILABILITY'),
      `${relativePath} should use the canonical availability route`,
    );
    assert.equal(source.includes('Routes.AVAILABILITY'), false);
  }
});

test('the legacy availability route redirects without rendering a fake loading screen', () => {
  const source = readSource('app/(tabs)/availability.tsx');

  assert.ok(source.includes('<Redirect href={Routes.SCHEDULE_AVAILABILITY} />'));
  assert.equal(source.includes('LoadingState'), false);
  assert.equal(source.includes('useEffect'), false);
  assert.equal(source.includes('router.replace'), false);
});

test('restricted tab routes fall back to the real tab-group home', () => {
  const layoutSource = readSource('app/(tabs)/_layout.tsx');
  const routesSource = readSource('navigation/routes.ts');

  assert.ok(layoutSource.includes('router.replace(Routes.HOME);'));
  assert.ok(layoutSource.includes('redirectHref={Routes.HOME}'));
  assert.equal(layoutSource.includes('Routes.HOME_INDEX'), false);
  assert.equal(routesSource.includes('HOME_INDEX'), false);
});

test('the day editor dismiss gesture stays on the native gesture thread', () => {
  const hookSource = readSource('hooks/use-day-editor.ts');
  const sheetSource = readSource('components/coach/day-editor-sheet.tsx');

  assert.ok(hookSource.includes('Gesture.Pan()'));
  assert.ok(hookSource.includes('scheduleOnRN(onClose)'));
  assert.equal(hookSource.includes('PanResponder'), false);
  assert.ok(sheetSource.includes('<GestureDetector gesture={ed.dismissGesture}>'));
  assert.equal(sheetSource.includes('panHandlers'), false);
});
