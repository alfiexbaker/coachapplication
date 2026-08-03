import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sumPracticeMinutesForDateWindow } from '@/hooks/use-my-progress';

test('practice minutes use the server date key for an inclusive rolling window', () => {
  const total = sumPracticeMinutesForDateWindow(
    [
      { dateKey: '2025-12-31', minutes: 90 },
      { dateKey: '2026-01-01', minutes: 10 },
      { dateKey: '2026-01-04', minutes: 20 },
      { dateKey: '2026-01-07', minutes: 30 },
      { dateKey: '2026-01-08', minutes: 120 },
    ],
    '2026-01-07',
    7,
  );

  assert.equal(total, 60);
});
