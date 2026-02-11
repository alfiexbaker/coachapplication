// @ts-nocheck
/**
 * No-Show Service Tests
 *
 * Tests the no-show recording and retrieval functionality
 * in the CancellationService:
 *
 * - recordNoShow: creates a NoShowRecord, increments family counter, emits event
 * - getNoShowRecords: filters by coachId
 * - getNoShowRecordsForFamily: filters by familyId
 * - NoShow categories: 'no_contact' | 'cancelled_late' | 'arrived_late' | 'weather_travel' | 'other'
 * - Family-level no-show counter increment
 */

import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import type { NoShowRecord, NoShowCategory } from '../../constants/session-types';

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

let mockStore: Record<string, string> = {};
const NO_SHOW_RECORDS_KEY = 'clubroom.no_show_records';
const NO_SHOW_COUNTS_KEY = 'clubroom.no_show_counts';

let emittedEvents: { event: string; data: unknown }[] = [];
let noShowIdSeq = 0;

function nextNoShowId(): string {
  noShowIdSeq += 1;
  return `noshow_${noShowIdSeq}`;
}

// Mock apiClient
const mockApiClient = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const raw = mockStore[key];
    if (raw) return JSON.parse(raw) as T;
    return fallback;
  },
  async set<T>(key: string, data: T): Promise<void> {
    mockStore[key] = JSON.stringify(data);
  },
};

// Mock emitTyped
function mockEmitTyped(event: string, data: unknown) {
  emittedEvents.push({ event, data });
}

// ============================================================================
// SERVICE REPLICA (mirrors cancellation-service.ts no-show logic)
// ============================================================================

async function loadNoShowRecords(): Promise<NoShowRecord[]> {
  return mockApiClient.get<NoShowRecord[]>(NO_SHOW_RECORDS_KEY, []);
}

async function saveNoShowRecords(records: NoShowRecord[]): Promise<void> {
  await mockApiClient.set(NO_SHOW_RECORDS_KEY, records);
}

async function loadNoShowCounts(): Promise<Record<string, number>> {
  return mockApiClient.get<Record<string, number>>(NO_SHOW_COUNTS_KEY, {});
}

async function saveNoShowCounts(counts: Record<string, number>): Promise<void> {
  await mockApiClient.set(NO_SHOW_COUNTS_KEY, counts);
}

async function incrementNoShow(familyId: string): Promise<void> {
  const counts = await loadNoShowCounts();
  counts[familyId] = (counts[familyId] ?? 0) + 1;
  await saveNoShowCounts(counts);
}

async function getNoShowCount(familyId: string): Promise<number> {
  const counts = await loadNoShowCounts();
  return counts[familyId] ?? 0;
}

async function resetNoShowCount(familyId: string): Promise<void> {
  const counts = await loadNoShowCounts();
  delete counts[familyId];
  await saveNoShowCounts(counts);
}

const cancellationService = {
  async recordNoShow(params: {
    bookingId: string;
    coachId: string;
    familyId: string;
    athleteId: string;
    athleteName: string;
    category: NoShowCategory;
    note?: string;
    sessionDate: string;
  }) {
    const record: NoShowRecord = {
      id: nextNoShowId(),
      bookingId: params.bookingId,
      coachId: params.coachId,
      familyId: params.familyId,
      athleteId: params.athleteId,
      athleteName: params.athleteName,
      category: params.category,
      note: params.note,
      sessionDate: params.sessionDate,
      markedAt: new Date().toISOString(),
    };

    try {
      const records = await loadNoShowRecords();
      records.push(record);
      await saveNoShowRecords(records);

      // Increment the family-level counter
      await incrementNoShow(params.familyId);

      // Emit event
      mockEmitTyped('booking:no_show_recorded', {
        bookingId: params.bookingId,
        coachId: params.coachId,
        familyId: params.familyId,
        category: params.category,
      });

      return { success: true, data: record };
    } catch (error) {
      return { success: false, error: { code: 'STORAGE', message: 'Failed to record no-show' } };
    }
  },

  async getNoShowRecords(coachId: string): Promise<NoShowRecord[]> {
    const records = await loadNoShowRecords();
    return records.filter((r) => r.coachId === coachId);
  },

  async getNoShowRecordsForFamily(familyId: string): Promise<NoShowRecord[]> {
    const records = await loadNoShowRecords();
    return records.filter((r) => r.familyId === familyId);
  },

  async getNoShowCount(familyId: string): Promise<number> {
    return getNoShowCount(familyId);
  },

  async incrementNoShow(familyId: string): Promise<void> {
    return incrementNoShow(familyId);
  },

  async resetNoShowCount(familyId: string): Promise<void> {
    return resetNoShowCount(familyId);
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function makeNoShowParams(overrides?: Record<string, unknown>) {
  return {
    bookingId: 'booking_100',
    coachId: 'coach_1',
    familyId: 'family_1',
    athleteId: 'athlete_1',
    athleteName: 'Tom Wilson',
    category: 'no_contact' as NoShowCategory,
    sessionDate: '2026-02-10T10:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CancellationService - No-Show Records', () => {
  beforeEach(() => {
    mockStore = {};
    emittedEvents = [];
    noShowIdSeq = 0;
  });

  // --------------------------------------------------------------------------
  // recordNoShow
  // --------------------------------------------------------------------------

  describe('recordNoShow', () => {
    it('should create a no-show record with correct fields', async () => {
      const result = await cancellationService.recordNoShow(makeNoShowParams());

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.ok(result.data.id.startsWith('noshow_'));
      assert.strictEqual(result.data.bookingId, 'booking_100');
      assert.strictEqual(result.data.coachId, 'coach_1');
      assert.strictEqual(result.data.familyId, 'family_1');
      assert.strictEqual(result.data.athleteId, 'athlete_1');
      assert.strictEqual(result.data.athleteName, 'Tom Wilson');
      assert.strictEqual(result.data.category, 'no_contact');
      assert.strictEqual(result.data.sessionDate, '2026-02-10T10:00:00Z');
      assert.ok(result.data.markedAt);
    });

    it('should persist the record to storage', async () => {
      await cancellationService.recordNoShow(makeNoShowParams());

      const stored = await loadNoShowRecords();
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].bookingId, 'booking_100');
    });

    it('should include optional note when provided', async () => {
      const result = await cancellationService.recordNoShow(
        makeNoShowParams({ note: 'No reply to calls or messages' }),
      );

      assert.ok(result.success);
      assert.strictEqual(result.data.note, 'No reply to calls or messages');
    });

    it('should leave note undefined when not provided', async () => {
      const result = await cancellationService.recordNoShow(makeNoShowParams());

      assert.ok(result.success);
      assert.strictEqual(result.data.note, undefined);
    });

    it('should increment the family no-show counter', async () => {
      const countBefore = await cancellationService.getNoShowCount('family_1');
      assert.strictEqual(countBefore, 0);

      await cancellationService.recordNoShow(makeNoShowParams());

      const countAfter = await cancellationService.getNoShowCount('family_1');
      assert.strictEqual(countAfter, 1);
    });

    it('should accumulate no-show count for multiple records', async () => {
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3' }));

      const count = await cancellationService.getNoShowCount('family_1');
      assert.strictEqual(count, 3);
    });

    it('should emit NO_SHOW_RECORDED event', async () => {
      await cancellationService.recordNoShow(makeNoShowParams());

      assert.strictEqual(emittedEvents.length, 1);
      assert.strictEqual(emittedEvents[0].event, 'booking:no_show_recorded');
      const payload = emittedEvents[0].data as Record<string, unknown>;
      assert.strictEqual(payload.bookingId, 'booking_100');
      assert.strictEqual(payload.coachId, 'coach_1');
      assert.strictEqual(payload.familyId, 'family_1');
      assert.strictEqual(payload.category, 'no_contact');
    });

    it('should set markedAt to the current time', async () => {
      const before = new Date().toISOString();
      const result = await cancellationService.recordNoShow(makeNoShowParams());
      const after = new Date().toISOString();

      assert.ok(result.success);
      assert.ok(result.data.markedAt >= before);
      assert.ok(result.data.markedAt <= after);
    });
  });

  // --------------------------------------------------------------------------
  // NoShow Categories
  // --------------------------------------------------------------------------

  describe('NoShow Categories', () => {
    const categories: NoShowCategory[] = [
      'no_contact',
      'cancelled_late',
      'arrived_late',
      'weather_travel',
      'other',
    ];

    for (const category of categories) {
      it(`should accept category '${category}'`, async () => {
        const result = await cancellationService.recordNoShow(
          makeNoShowParams({ category, bookingId: `booking_${category}` }),
        );

        assert.ok(result.success);
        assert.strictEqual(result.data.category, category);
      });
    }
  });

  // --------------------------------------------------------------------------
  // getNoShowRecords (by coach)
  // --------------------------------------------------------------------------

  describe('getNoShowRecords', () => {
    it('should return all no-show records for a coach', async () => {
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', coachId: 'coach_1' }));
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', coachId: 'coach_1' }));
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', coachId: 'coach_2' }));

      const results = await cancellationService.getNoShowRecords('coach_1');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.coachId === 'coach_1'));
    });

    it('should return empty array for coach with no records', async () => {
      const results = await cancellationService.getNoShowRecords('unknown_coach');
      assert.deepStrictEqual(results, []);
    });

    it('should return records across multiple families for same coach', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', familyId: 'family_1' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', familyId: 'family_2' }),
      );

      const results = await cancellationService.getNoShowRecords('coach_1');
      assert.strictEqual(results.length, 2);

      const familyIds = results.map((r) => r.familyId);
      assert.ok(familyIds.includes('family_1'));
      assert.ok(familyIds.includes('family_2'));
    });
  });

  // --------------------------------------------------------------------------
  // getNoShowRecordsForFamily
  // --------------------------------------------------------------------------

  describe('getNoShowRecordsForFamily', () => {
    it('should return all no-show records for a family', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', familyId: 'family_1', coachId: 'coach_1' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', familyId: 'family_1', coachId: 'coach_2' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b3', familyId: 'family_2', coachId: 'coach_1' }),
      );

      const results = await cancellationService.getNoShowRecordsForFamily('family_1');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.familyId === 'family_1'));
    });

    it('should return empty array for family with no records', async () => {
      const results = await cancellationService.getNoShowRecordsForFamily('unknown_family');
      assert.deepStrictEqual(results, []);
    });

    it('should include records from different coaches for same family', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', coachId: 'coach_A' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', coachId: 'coach_B' }),
      );

      const results = await cancellationService.getNoShowRecordsForFamily('family_1');
      assert.strictEqual(results.length, 2);

      const coachIds = results.map((r) => r.coachId);
      assert.ok(coachIds.includes('coach_A'));
      assert.ok(coachIds.includes('coach_B'));
    });
  });

  // --------------------------------------------------------------------------
  // No-Show Counter
  // --------------------------------------------------------------------------

  describe('No-Show Counter', () => {
    it('should start at 0 for new family', async () => {
      const count = await cancellationService.getNoShowCount('new_family');
      assert.strictEqual(count, 0);
    });

    it('should increment independently per family', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', familyId: 'family_A' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', familyId: 'family_A' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b3', familyId: 'family_B' }),
      );

      const countA = await cancellationService.getNoShowCount('family_A');
      const countB = await cancellationService.getNoShowCount('family_B');

      assert.strictEqual(countA, 2);
      assert.strictEqual(countB, 1);
    });

    it('should reset count for a family', async () => {
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
      await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));

      let count = await cancellationService.getNoShowCount('family_1');
      assert.strictEqual(count, 2);

      await cancellationService.resetNoShowCount('family_1');

      count = await cancellationService.getNoShowCount('family_1');
      assert.strictEqual(count, 0);
    });

    it('should not affect other families when resetting', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', familyId: 'family_X' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', familyId: 'family_Y' }),
      );

      await cancellationService.resetNoShowCount('family_X');

      const countX = await cancellationService.getNoShowCount('family_X');
      const countY = await cancellationService.getNoShowCount('family_Y');

      assert.strictEqual(countX, 0);
      assert.strictEqual(countY, 1);
    });

    it('should handle manual increment', async () => {
      await cancellationService.incrementNoShow('family_Z');
      await cancellationService.incrementNoShow('family_Z');

      const count = await cancellationService.getNoShowCount('family_Z');
      assert.strictEqual(count, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle multiple no-shows for the same booking (different athletes)', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ athleteId: 'a1', athleteName: 'Tom' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ athleteId: 'a2', athleteName: 'Amy' }),
      );

      const records = await cancellationService.getNoShowRecords('coach_1');
      assert.strictEqual(records.length, 2);

      const names = records.map((r) => r.athleteName);
      assert.ok(names.includes('Tom'));
      assert.ok(names.includes('Amy'));
    });

    it('should generate unique IDs for each record', async () => {
      const result1 = await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
      const result2 = await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));

      assert.ok(result1.success && result2.success);
      assert.notStrictEqual(result1.data.id, result2.data.id);
    });

    it('should preserve all records across multiple operations', async () => {
      // Create records for different coaches and families
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', coachId: 'c1', familyId: 'f1' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', coachId: 'c1', familyId: 'f2' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b3', coachId: 'c2', familyId: 'f1' }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b4', coachId: 'c2', familyId: 'f2' }),
      );

      // Verify total is 4
      const allForC1 = await cancellationService.getNoShowRecords('c1');
      const allForC2 = await cancellationService.getNoShowRecords('c2');
      assert.strictEqual(allForC1.length, 2);
      assert.strictEqual(allForC2.length, 2);

      const allForF1 = await cancellationService.getNoShowRecordsForFamily('f1');
      const allForF2 = await cancellationService.getNoShowRecordsForFamily('f2');
      assert.strictEqual(allForF1.length, 2);
      assert.strictEqual(allForF2.length, 2);
    });

    it('should record different categories for the same family', async () => {
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b1', category: 'no_contact' as NoShowCategory }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b2', category: 'weather_travel' as NoShowCategory }),
      );
      await cancellationService.recordNoShow(
        makeNoShowParams({ bookingId: 'b3', category: 'cancelled_late' as NoShowCategory }),
      );

      const records = await cancellationService.getNoShowRecordsForFamily('family_1');
      assert.strictEqual(records.length, 3);

      const categories = records.map((r) => r.category);
      assert.ok(categories.includes('no_contact'));
      assert.ok(categories.includes('weather_travel'));
      assert.ok(categories.includes('cancelled_late'));
    });
  });
});
