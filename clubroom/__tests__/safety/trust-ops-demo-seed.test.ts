import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { apiClient } from '@/services/api-client';

type SeedInjury = {
  id: string;
  userId: string;
};

type SeedConcern = {
  id: string;
  coachId: string;
  athleteId: string;
  status: string;
};

type SeedReport = {
  id: string;
  type: string;
};

type SeedProblemReport = {
  id: string;
  bookingId: string;
  category: string;
};

const cleanupKeys = [
  STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
  STORAGE_KEYS.INJURIES,
  STORAGE_KEYS.CONCERNS,
  STORAGE_KEYS.REPORTS,
  STORAGE_KEYS.PROBLEM_REPORTS,
];

describe('Trust/Ops demo seed coverage', () => {
  beforeEach(async () => {
    await Promise.all(cleanupKeys.map((key) => apiClient.remove(key)));
  });

  it('seeds injury/concern/report/problem-report fixtures for pre-API UI testing', async () => {
    await ensureRelationalDemoSeeded({ force: true });

    const [injuries, concerns, reports, problemReports] = await Promise.all([
      apiClient.get<SeedInjury[]>(STORAGE_KEYS.INJURIES, []),
      apiClient.get<SeedConcern[]>(STORAGE_KEYS.CONCERNS, []),
      apiClient.get<SeedReport[]>(STORAGE_KEYS.REPORTS, []),
      apiClient.get<SeedProblemReport[]>(STORAGE_KEYS.PROBLEM_REPORTS, []),
    ]);

    assert.ok(
      injuries.some((injury) => injury.id === 'injury_seed_user1_ankle' && injury.userId === 'user1'),
      'Expected seeded injury for user1 to support health/injury UI paths',
    );
    assert.ok(
      concerns.some(
        (concern) =>
          concern.id === 'concern_seed_user1_safeguarding' &&
          concern.coachId === 'coach1' &&
          concern.athleteId === 'user1' &&
          concern.status === 'ESCALATED',
      ),
      'Expected seeded escalated concern for coach->athlete flow coverage',
    );
    assert.ok(
      reports.some((report) => report.id === 'report_seed_safety_1' && report.type === 'safety_concern'),
      'Expected seeded safety report for trust escalation coverage',
    );

    const safetyProblem = problemReports.find((problem) => problem.category === 'safety');
    assert.ok(safetyProblem, 'Expected seeded booking safety problem report');
    assert.notEqual(safetyProblem?.bookingId, 'unknown');
  });
});
