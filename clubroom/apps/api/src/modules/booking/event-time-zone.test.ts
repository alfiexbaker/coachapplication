import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatInstantInTimeZone,
  isSupportedTimeZone,
  localDateTimeToUtc,
} from '../../lib/time-zone.js';

describe('club event timezone conversion', () => {
  it('converts London winter and summer wall-clock times to UTC', () => {
    assert.equal(
      localDateTimeToUtc('2026-01-15', '10:00', 'Europe/London')?.toISOString(),
      '2026-01-15T10:00:00.000Z',
    );
    assert.equal(
      localDateTimeToUtc('2026-07-15', '10:00', 'Europe/London')?.toISOString(),
      '2026-07-15T09:00:00.000Z',
    );
  });

  it('rejects a nonexistent spring-forward wall-clock time', () => {
    assert.equal(localDateTimeToUtc('2026-03-29', '01:30', 'Europe/London'), null);
  });

  it('uses the first occurrence of a repeated fall-back wall-clock time', () => {
    assert.equal(
      localDateTimeToUtc('2026-10-25', '01:30', 'Europe/London')?.toISOString(),
      '2026-10-25T00:30:00.000Z',
    );
  });

  it('formats a UTC instant in its event timezone', () => {
    assert.deepEqual(
      formatInstantInTimeZone(new Date('2026-07-15T09:00:00.000Z'), 'Europe/London'),
      { date: '2026-07-15', time: '10:00' },
    );
  });

  it('rejects invalid timezone identifiers and invalid local dates', () => {
    assert.equal(isSupportedTimeZone('Not/A_Time_Zone'), false);
    assert.equal(localDateTimeToUtc('2026-02-30', '10:00', 'Europe/London'), null);
  });
});
