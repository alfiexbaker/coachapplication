"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================
let mockStore = {};
const NO_SHOW_RECORDS_KEY = 'clubroom.no_show_records';
const NO_SHOW_COUNTS_KEY = 'clubroom.no_show_counts';
let emittedEvents = [];
// Mock apiClient
const mockApiClient = {
    async get(key, fallback) {
        const raw = mockStore[key];
        if (raw)
            return JSON.parse(raw);
        return fallback;
    },
    async set(key, data) {
        mockStore[key] = JSON.stringify(data);
    },
};
// Mock emitTyped
function mockEmitTyped(event, data) {
    emittedEvents.push({ event, data });
}
// ============================================================================
// SERVICE REPLICA (mirrors cancellation-service.ts no-show logic)
// ============================================================================
async function loadNoShowRecords() {
    return mockApiClient.get(NO_SHOW_RECORDS_KEY, []);
}
async function saveNoShowRecords(records) {
    await mockApiClient.set(NO_SHOW_RECORDS_KEY, records);
}
async function loadNoShowCounts() {
    return mockApiClient.get(NO_SHOW_COUNTS_KEY, {});
}
async function saveNoShowCounts(counts) {
    await mockApiClient.set(NO_SHOW_COUNTS_KEY, counts);
}
async function incrementNoShow(familyId) {
    const counts = await loadNoShowCounts();
    counts[familyId] = (counts[familyId] ?? 0) + 1;
    await saveNoShowCounts(counts);
}
async function getNoShowCount(familyId) {
    const counts = await loadNoShowCounts();
    return counts[familyId] ?? 0;
}
async function resetNoShowCount(familyId) {
    const counts = await loadNoShowCounts();
    delete counts[familyId];
    await saveNoShowCounts(counts);
}
const cancellationService = {
    async recordNoShow(params) {
        const record = {
            id: `noshow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
        }
        catch (error) {
            return { success: false, error: { code: 'STORAGE', message: 'Failed to record no-show' } };
        }
    },
    async getNoShowRecords(coachId) {
        const records = await loadNoShowRecords();
        return records.filter((r) => r.coachId === coachId);
    },
    async getNoShowRecordsForFamily(familyId) {
        const records = await loadNoShowRecords();
        return records.filter((r) => r.familyId === familyId);
    },
    async getNoShowCount(familyId) {
        return getNoShowCount(familyId);
    },
    async incrementNoShow(familyId) {
        return incrementNoShow(familyId);
    },
    async resetNoShowCount(familyId) {
        return resetNoShowCount(familyId);
    },
};
// ============================================================================
// HELPERS
// ============================================================================
function makeNoShowParams(overrides) {
    return {
        bookingId: 'booking_100',
        coachId: 'coach_1',
        familyId: 'family_1',
        athleteId: 'athlete_1',
        athleteName: 'Tom Wilson',
        category: 'no_contact',
        sessionDate: '2026-02-10T10:00:00Z',
        ...overrides,
    };
}
// ============================================================================
// TEST SUITE
// ============================================================================
(0, node_test_1.describe)('CancellationService - No-Show Records', () => {
    (0, node_test_1.beforeEach)(() => {
        mockStore = {};
        emittedEvents = [];
    });
    // --------------------------------------------------------------------------
    // recordNoShow
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('recordNoShow', () => {
        (0, node_test_1.it)('should create a no-show record with correct fields', async () => {
            const result = await cancellationService.recordNoShow(makeNoShowParams());
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.ok(result.data);
            node_assert_1.default.ok(result.data.id.startsWith('noshow_'));
            node_assert_1.default.strictEqual(result.data.bookingId, 'booking_100');
            node_assert_1.default.strictEqual(result.data.coachId, 'coach_1');
            node_assert_1.default.strictEqual(result.data.familyId, 'family_1');
            node_assert_1.default.strictEqual(result.data.athleteId, 'athlete_1');
            node_assert_1.default.strictEqual(result.data.athleteName, 'Tom Wilson');
            node_assert_1.default.strictEqual(result.data.category, 'no_contact');
            node_assert_1.default.strictEqual(result.data.sessionDate, '2026-02-10T10:00:00Z');
            node_assert_1.default.ok(result.data.markedAt);
        });
        (0, node_test_1.it)('should persist the record to storage', async () => {
            await cancellationService.recordNoShow(makeNoShowParams());
            const stored = await loadNoShowRecords();
            node_assert_1.default.strictEqual(stored.length, 1);
            node_assert_1.default.strictEqual(stored[0].bookingId, 'booking_100');
        });
        (0, node_test_1.it)('should include optional note when provided', async () => {
            const result = await cancellationService.recordNoShow(makeNoShowParams({ note: 'No reply to calls or messages' }));
            node_assert_1.default.ok(result.success);
            node_assert_1.default.strictEqual(result.data.note, 'No reply to calls or messages');
        });
        (0, node_test_1.it)('should leave note undefined when not provided', async () => {
            const result = await cancellationService.recordNoShow(makeNoShowParams());
            node_assert_1.default.ok(result.success);
            node_assert_1.default.strictEqual(result.data.note, undefined);
        });
        (0, node_test_1.it)('should increment the family no-show counter', async () => {
            const countBefore = await cancellationService.getNoShowCount('family_1');
            node_assert_1.default.strictEqual(countBefore, 0);
            await cancellationService.recordNoShow(makeNoShowParams());
            const countAfter = await cancellationService.getNoShowCount('family_1');
            node_assert_1.default.strictEqual(countAfter, 1);
        });
        (0, node_test_1.it)('should accumulate no-show count for multiple records', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3' }));
            const count = await cancellationService.getNoShowCount('family_1');
            node_assert_1.default.strictEqual(count, 3);
        });
        (0, node_test_1.it)('should emit NO_SHOW_RECORDED event', async () => {
            await cancellationService.recordNoShow(makeNoShowParams());
            node_assert_1.default.strictEqual(emittedEvents.length, 1);
            node_assert_1.default.strictEqual(emittedEvents[0].event, 'booking:no_show_recorded');
            const payload = emittedEvents[0].data;
            node_assert_1.default.strictEqual(payload.bookingId, 'booking_100');
            node_assert_1.default.strictEqual(payload.coachId, 'coach_1');
            node_assert_1.default.strictEqual(payload.familyId, 'family_1');
            node_assert_1.default.strictEqual(payload.category, 'no_contact');
        });
        (0, node_test_1.it)('should set markedAt to the current time', async () => {
            const before = new Date().toISOString();
            const result = await cancellationService.recordNoShow(makeNoShowParams());
            const after = new Date().toISOString();
            node_assert_1.default.ok(result.success);
            node_assert_1.default.ok(result.data.markedAt >= before);
            node_assert_1.default.ok(result.data.markedAt <= after);
        });
    });
    // --------------------------------------------------------------------------
    // NoShow Categories
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('NoShow Categories', () => {
        const categories = [
            'no_contact',
            'cancelled_late',
            'arrived_late',
            'weather_travel',
            'other',
        ];
        for (const category of categories) {
            (0, node_test_1.it)(`should accept category '${category}'`, async () => {
                const result = await cancellationService.recordNoShow(makeNoShowParams({ category, bookingId: `booking_${category}` }));
                node_assert_1.default.ok(result.success);
                node_assert_1.default.strictEqual(result.data.category, category);
            });
        }
    });
    // --------------------------------------------------------------------------
    // getNoShowRecords (by coach)
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getNoShowRecords', () => {
        (0, node_test_1.it)('should return all no-show records for a coach', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', coachId: 'coach_1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', coachId: 'coach_1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', coachId: 'coach_2' }));
            const results = await cancellationService.getNoShowRecords('coach_1');
            node_assert_1.default.strictEqual(results.length, 2);
            node_assert_1.default.ok(results.every((r) => r.coachId === 'coach_1'));
        });
        (0, node_test_1.it)('should return empty array for coach with no records', async () => {
            const results = await cancellationService.getNoShowRecords('unknown_coach');
            node_assert_1.default.deepStrictEqual(results, []);
        });
        (0, node_test_1.it)('should return records across multiple families for same coach', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', familyId: 'family_1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', familyId: 'family_2' }));
            const results = await cancellationService.getNoShowRecords('coach_1');
            node_assert_1.default.strictEqual(results.length, 2);
            const familyIds = results.map((r) => r.familyId);
            node_assert_1.default.ok(familyIds.includes('family_1'));
            node_assert_1.default.ok(familyIds.includes('family_2'));
        });
    });
    // --------------------------------------------------------------------------
    // getNoShowRecordsForFamily
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getNoShowRecordsForFamily', () => {
        (0, node_test_1.it)('should return all no-show records for a family', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', familyId: 'family_1', coachId: 'coach_1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', familyId: 'family_1', coachId: 'coach_2' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', familyId: 'family_2', coachId: 'coach_1' }));
            const results = await cancellationService.getNoShowRecordsForFamily('family_1');
            node_assert_1.default.strictEqual(results.length, 2);
            node_assert_1.default.ok(results.every((r) => r.familyId === 'family_1'));
        });
        (0, node_test_1.it)('should return empty array for family with no records', async () => {
            const results = await cancellationService.getNoShowRecordsForFamily('unknown_family');
            node_assert_1.default.deepStrictEqual(results, []);
        });
        (0, node_test_1.it)('should include records from different coaches for same family', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', coachId: 'coach_A' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', coachId: 'coach_B' }));
            const results = await cancellationService.getNoShowRecordsForFamily('family_1');
            node_assert_1.default.strictEqual(results.length, 2);
            const coachIds = results.map((r) => r.coachId);
            node_assert_1.default.ok(coachIds.includes('coach_A'));
            node_assert_1.default.ok(coachIds.includes('coach_B'));
        });
    });
    // --------------------------------------------------------------------------
    // No-Show Counter
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('No-Show Counter', () => {
        (0, node_test_1.it)('should start at 0 for new family', async () => {
            const count = await cancellationService.getNoShowCount('new_family');
            node_assert_1.default.strictEqual(count, 0);
        });
        (0, node_test_1.it)('should increment independently per family', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', familyId: 'family_A' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', familyId: 'family_A' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', familyId: 'family_B' }));
            const countA = await cancellationService.getNoShowCount('family_A');
            const countB = await cancellationService.getNoShowCount('family_B');
            node_assert_1.default.strictEqual(countA, 2);
            node_assert_1.default.strictEqual(countB, 1);
        });
        (0, node_test_1.it)('should reset count for a family', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));
            let count = await cancellationService.getNoShowCount('family_1');
            node_assert_1.default.strictEqual(count, 2);
            await cancellationService.resetNoShowCount('family_1');
            count = await cancellationService.getNoShowCount('family_1');
            node_assert_1.default.strictEqual(count, 0);
        });
        (0, node_test_1.it)('should not affect other families when resetting', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', familyId: 'family_X' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', familyId: 'family_Y' }));
            await cancellationService.resetNoShowCount('family_X');
            const countX = await cancellationService.getNoShowCount('family_X');
            const countY = await cancellationService.getNoShowCount('family_Y');
            node_assert_1.default.strictEqual(countX, 0);
            node_assert_1.default.strictEqual(countY, 1);
        });
        (0, node_test_1.it)('should handle manual increment', async () => {
            await cancellationService.incrementNoShow('family_Z');
            await cancellationService.incrementNoShow('family_Z');
            const count = await cancellationService.getNoShowCount('family_Z');
            node_assert_1.default.strictEqual(count, 2);
        });
    });
    // --------------------------------------------------------------------------
    // Edge Cases
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('Edge Cases', () => {
        (0, node_test_1.it)('should handle multiple no-shows for the same booking (different athletes)', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ athleteId: 'a1', athleteName: 'Tom' }));
            await cancellationService.recordNoShow(makeNoShowParams({ athleteId: 'a2', athleteName: 'Amy' }));
            const records = await cancellationService.getNoShowRecords('coach_1');
            node_assert_1.default.strictEqual(records.length, 2);
            const names = records.map((r) => r.athleteName);
            node_assert_1.default.ok(names.includes('Tom'));
            node_assert_1.default.ok(names.includes('Amy'));
        });
        (0, node_test_1.it)('should generate unique IDs for each record', async () => {
            const result1 = await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1' }));
            const result2 = await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2' }));
            node_assert_1.default.ok(result1.success && result2.success);
            node_assert_1.default.notStrictEqual(result1.data.id, result2.data.id);
        });
        (0, node_test_1.it)('should preserve all records across multiple operations', async () => {
            // Create records for different coaches and families
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', coachId: 'c1', familyId: 'f1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', coachId: 'c1', familyId: 'f2' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', coachId: 'c2', familyId: 'f1' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b4', coachId: 'c2', familyId: 'f2' }));
            // Verify total is 4
            const allForC1 = await cancellationService.getNoShowRecords('c1');
            const allForC2 = await cancellationService.getNoShowRecords('c2');
            node_assert_1.default.strictEqual(allForC1.length, 2);
            node_assert_1.default.strictEqual(allForC2.length, 2);
            const allForF1 = await cancellationService.getNoShowRecordsForFamily('f1');
            const allForF2 = await cancellationService.getNoShowRecordsForFamily('f2');
            node_assert_1.default.strictEqual(allForF1.length, 2);
            node_assert_1.default.strictEqual(allForF2.length, 2);
        });
        (0, node_test_1.it)('should record different categories for the same family', async () => {
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b1', category: 'no_contact' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b2', category: 'weather_travel' }));
            await cancellationService.recordNoShow(makeNoShowParams({ bookingId: 'b3', category: 'cancelled_late' }));
            const records = await cancellationService.getNoShowRecordsForFamily('family_1');
            node_assert_1.default.strictEqual(records.length, 3);
            const categories = records.map((r) => r.category);
            node_assert_1.default.ok(categories.includes('no_contact'));
            node_assert_1.default.ok(categories.includes('weather_travel'));
            node_assert_1.default.ok(categories.includes('cancelled_late'));
        });
    });
});
