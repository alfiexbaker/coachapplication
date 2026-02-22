import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import {
  progressPracticeLogService,
  type PracticeLogEntry,
} from '@/services/progress/progress-practice-log-service';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('progressPracticeLogService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS);
  });

  it('creates today log entry and rounds minutes', async () => {
    const result = await progressPracticeLogService.logPractice({
      athleteId: 'athlete_practice_a',
      minutes: 19.6,
      note: 'First touch work',
    });

    assert.equal(result.success, true);
    assert.equal(result.success ? result.data.minutes : 0, 20);
    assert.equal(result.success ? result.data.dateKey : '', todayKey());

    const logs = await apiClient.get<PracticeLogEntry[]>(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, []);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].id, `practice_athlete_practice_a_${todayKey()}`);
  });

  it('aggregates repeated logs for the same athlete/day into one entry', async () => {
    await progressPracticeLogService.logPractice({
      athleteId: 'athlete_practice_b',
      minutes: 10,
    });
    await progressPracticeLogService.logPractice({
      athleteId: 'athlete_practice_b',
      minutes: 30,
      note: 'Finishing reps',
    });

    const logs = await progressPracticeLogService.listAthleteLogs('athlete_practice_b');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].minutes, 40);
    assert.equal(logs[0].note, 'Finishing reps');
    assert.ok(logs[0].updatedAt);
  });

  it('returns athlete-scoped logs and today lookup', async () => {
    const seeded: PracticeLogEntry[] = [
      {
        id: 'practice_athlete_practice_c_2026-02-01',
        athleteId: 'athlete_practice_c',
        dateKey: '2026-02-01',
        minutes: 25,
        createdAt: '2026-02-01T10:00:00.000Z',
      },
      {
        id: `practice_athlete_practice_c_${todayKey()}`,
        athleteId: 'athlete_practice_c',
        dateKey: todayKey(),
        minutes: 35,
        createdAt: new Date().toISOString(),
      },
      {
        id: `practice_other_${todayKey()}`,
        athleteId: 'athlete_practice_other',
        dateKey: todayKey(),
        minutes: 60,
        createdAt: new Date().toISOString(),
      },
    ];
    await apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, seeded);

    const athleteLogs = await progressPracticeLogService.listAthleteLogs('athlete_practice_c');
    assert.equal(athleteLogs.length, 2);
    assert.equal(athleteLogs[0].dateKey, todayKey());
    assert.ok(athleteLogs.every((entry) => entry.athleteId === 'athlete_practice_c'));

    const today = await progressPracticeLogService.getTodayLog('athlete_practice_c');
    assert.ok(today);
    assert.equal(today?.minutes, 35);
  });
});
