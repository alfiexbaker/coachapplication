"use strict";
/**
 * saveRepeatedOverride Tests
 *
 * Tests the repeated override generation logic in availabilityService.
 * Verifies correct number of overrides, 7-day spacing, shared repeatGroupId,
 * and that custom slots are propagated to each override.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const api_client_1 = require("@/services/api-client");
const availability_service_1 = require("@/services/availability-service");
const storage_keys_1 = require("@/constants/storage-keys");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function resetStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
}
const COACH_ID = 'coach_repeat_test';
// ---------------------------------------------------------------------------
// Test Suite: saveRepeatedOverride
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('availabilityService.saveRepeatedOverride', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('generates correct number of overrides for 4 weeks', async () => {
        // 4 weeks: start date + 3 more = 4 overrides
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02', // Monday
            isBlocked: false,
            repeatUntil: '2026-03-23', // 3 weeks later (4 Mondays total)
        });
        node_assert_1.default.strictEqual(results.length, 4, 'Should generate 4 overrides for 4 weeks');
    });
    (0, node_test_1.it)('generates 1 override when start and end dates are the same', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: true,
            repeatUntil: '2026-03-02',
        });
        node_assert_1.default.strictEqual(results.length, 1, 'Should generate exactly 1 override');
        node_assert_1.default.strictEqual(results[0].date, '2026-03-02');
    });
    (0, node_test_1.it)('each override date is exactly 7 days apart', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-23',
        });
        const expectedDates = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'];
        const actualDates = results.map((r) => r.date);
        node_assert_1.default.deepStrictEqual(actualDates, expectedDates, 'Dates should be 7 days apart');
    });
    (0, node_test_1.it)('all overrides share the same repeatGroupId', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-23',
        });
        const groupIds = results.map((r) => r.repeatGroupId);
        const uniqueGroupIds = new Set(groupIds);
        node_assert_1.default.strictEqual(uniqueGroupIds.size, 1, 'All overrides should share one repeatGroupId');
        node_assert_1.default.ok(groupIds[0].startsWith('rpg_'), 'repeatGroupId should start with rpg_');
    });
    (0, node_test_1.it)('each override has a unique ID', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-23',
        });
        const ids = results.map((r) => r.id);
        const uniqueIds = new Set(ids);
        node_assert_1.default.strictEqual(uniqueIds.size, results.length, 'All override IDs should be unique');
    });
    (0, node_test_1.it)('custom slots are copied to each override', async () => {
        const customSlots = [
            { date: '2026-03-02', startTime: '09:00', endTime: '10:00', location: 'Hyde Park' },
            { date: '2026-03-02', startTime: '14:00', endTime: '15:00', location: 'Victoria Park' },
        ];
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            customSlots,
            repeatUntil: '2026-03-16', // 3 weeks
        });
        node_assert_1.default.strictEqual(results.length, 3, 'Should generate 3 overrides');
        for (const override of results) {
            node_assert_1.default.ok(override.customSlots, `Override ${override.date} should have customSlots`);
            node_assert_1.default.strictEqual(override.customSlots.length, 2, `Override ${override.date} should have 2 custom slots`);
            node_assert_1.default.strictEqual(override.customSlots[0].startTime, '09:00');
            node_assert_1.default.strictEqual(override.customSlots[1].startTime, '14:00');
            node_assert_1.default.strictEqual(override.customSlots[0].location, 'Hyde Park');
            node_assert_1.default.strictEqual(override.customSlots[1].location, 'Victoria Park');
        }
    });
    (0, node_test_1.it)('overrides are persisted to storage', async () => {
        await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-16',
        });
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
        node_assert_1.default.strictEqual(stored.length, 3, 'All 3 overrides should be persisted');
    });
    (0, node_test_1.it)('all overrides have the correct coachId', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: true,
            repeatUntil: '2026-03-09',
        });
        node_assert_1.default.strictEqual(results.length, 2);
        node_assert_1.default.ok(results.every((r) => r.coachId === COACH_ID), 'All overrides should have the correct coachId');
    });
    (0, node_test_1.it)('isBlocked flag is propagated to all overrides', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: true,
            repeatUntil: '2026-03-16',
        });
        node_assert_1.default.ok(results.every((r) => r.isBlocked === true), 'All overrides should be blocked');
    });
    (0, node_test_1.it)('repeatDayOfWeek is set correctly on all overrides', async () => {
        // 2026-03-02 is a Monday (dayOfWeek = 1)
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-16',
        });
        node_assert_1.default.ok(results.every((r) => r.repeatDayOfWeek === 1), 'All overrides should have repeatDayOfWeek = 1 (Monday)');
    });
    (0, node_test_1.it)('repeatUntil is set on all overrides', async () => {
        const results = await availability_service_1.availabilityService.saveRepeatedOverride({
            coachId: COACH_ID,
            date: '2026-03-02',
            isBlocked: false,
            repeatUntil: '2026-03-23',
        });
        node_assert_1.default.ok(results.every((r) => r.repeatUntil === '2026-03-23'), 'All overrides should have the same repeatUntil date');
    });
});
