import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('Reanimated callbacks use the v4 worklets scheduler without changing arguments', () => {
  const sourceByPath = new Map(
    [
      'components/coach/availability-tutorial.tsx',
      'components/discover/PriceRangeSlider.tsx',
      'components/notification/notification-toast.tsx',
      'components/progress/animated-counter.tsx',
      'components/progress/player-card.tsx',
      'hooks/use-day-editor.ts',
    ].map((relativePath) => [relativePath, readSource(relativePath)]),
  );

  for (const [relativePath, source] of sourceByPath) {
    assert.equal(source.includes('runOnJS'), false, `${relativePath} still uses runOnJS`);
    assert.ok(
      source.includes("from 'react-native-worklets'"),
      `${relativePath} should schedule React Native callbacks through worklets`,
    );
  }

  const slider = sourceByPath.get('components/discover/PriceRangeSlider.tsx') ?? '';
  assert.ok(slider.includes('scheduleOnRN(handleMinChange, positionToValue(newPosition), false)'));
  assert.ok(slider.includes('scheduleOnRN(handleMinChange, positionToValue(minPosition.value), true)'));
  assert.ok(slider.includes('scheduleOnRN(handleMaxChange, positionToValue(newPosition), false)'));
  assert.ok(slider.includes('scheduleOnRN(handleMaxChange, positionToValue(maxPosition.value), true)'));

  assert.ok(
    (sourceByPath.get('components/coach/availability-tutorial.tsx') ?? '').includes(
      'scheduleOnRN(callback)',
    ),
  );
  assert.ok(
    (sourceByPath.get('components/notification/notification-toast.tsx') ?? '').includes(
      'scheduleOnRN(setToast, { notification: null, visible: false })',
    ),
  );
  assert.ok(
    (sourceByPath.get('components/progress/animated-counter.tsx') ?? '').includes(
      'scheduleOnRN(setDisplayValue, formatted)',
    ),
  );
  assert.ok(
    (sourceByPath.get('components/progress/player-card.tsx') ?? '').includes(
      'scheduleOnRN(handleFlipFinish)',
    ),
  );
  assert.ok(
    (sourceByPath.get('hooks/use-day-editor.ts') ?? '').includes('scheduleOnRN(onClose)'),
  );
});
