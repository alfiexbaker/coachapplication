"use strict";
/**
 * Availability Location Fallback Tests
 *
 * Tests the location resolution logic in getAvailableSlots() when an override
 * has customSlots. The expected behavior:
 *
 *   1. If the customSlot has an explicit location, use it.
 *   2. Otherwise, fall back to the matching day template's location.
 *   3. If there is no matching template (or the template has no location), location is undefined.
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
/**
 * Clear all storage keys used by the availability service so each test
 * starts from a clean state (no bleed-over from MOCK_TEMPLATES / MOCK_OVERRIDES).
 */
async function resetStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []);
}
/**
 * Seed templates and overrides in storage for a test scenario.
 */
async function seedData(templates, overrides) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, templates);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, overrides);
}
// ---------------------------------------------------------------------------
// We use a fixed date that falls on a known day of the week.
// 2026-03-02 is a Monday (dayOfWeek = 1).
// 2026-03-04 is a Wednesday (dayOfWeek = 3).
// 2026-03-07 is a Saturday (dayOfWeek = 6).
// ---------------------------------------------------------------------------
const COACH_ID = 'test_coach_location';
const MONDAY_DATE = '2026-03-02';
// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('getAvailableSlots – location fallback for customSlots', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    // =========================================================================
    // 1. Custom slot with explicit location beats template location
    // =========================================================================
    (0, node_test_1.it)('uses the custom slot location when explicitly set, ignoring the template location', async () => {
        const template = {
            id: 'tmpl_test_1',
            coachId: COACH_ID,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
            location: 'Hyde Park',
        };
        const override = {
            id: 'ovr_test_1',
            coachId: COACH_ID,
            date: MONDAY_DATE,
            isBlocked: false,
            customSlots: [
                {
                    date: MONDAY_DATE,
                    startTime: '10:00',
                    endTime: '11:00',
                    location: 'Victoria Park',
                },
            ],
        };
        await seedData([template], [override]);
        const slots = await availability_service_1.availabilityService.getAvailableSlots(COACH_ID, MONDAY_DATE, MONDAY_DATE, 60);
        node_assert_1.default.strictEqual(slots.length, 1, 'Should have exactly 1 slot from the custom override');
        node_assert_1.default.strictEqual(slots[0].location, 'Victoria Park', 'Custom slot explicit location should take priority over template');
    });
    // =========================================================================
    // 2. Custom slot without location falls back to template location
    // =========================================================================
    (0, node_test_1.it)('falls back to the template location when the custom slot has no location', async () => {
        const template = {
            id: 'tmpl_test_2',
            coachId: COACH_ID,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
            location: 'Hyde Park',
        };
        const override = {
            id: 'ovr_test_2',
            coachId: COACH_ID,
            date: MONDAY_DATE,
            isBlocked: false,
            customSlots: [
                {
                    date: MONDAY_DATE,
                    startTime: '10:00',
                    endTime: '11:00',
                    // no location — should fall back to template
                },
            ],
        };
        await seedData([template], [override]);
        const slots = await availability_service_1.availabilityService.getAvailableSlots(COACH_ID, MONDAY_DATE, MONDAY_DATE, 60);
        node_assert_1.default.strictEqual(slots.length, 1);
        node_assert_1.default.strictEqual(slots[0].location, 'Hyde Park', 'Should fall back to template location when custom slot has no location');
    });
    // =========================================================================
    // 3. Custom slot without location AND template without location → undefined
    // =========================================================================
    (0, node_test_1.it)('resolves to undefined when neither custom slot nor template has a location', async () => {
        const template = {
            id: 'tmpl_test_3',
            coachId: COACH_ID,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
            // no location on template
        };
        const override = {
            id: 'ovr_test_3',
            coachId: COACH_ID,
            date: MONDAY_DATE,
            isBlocked: false,
            customSlots: [
                {
                    date: MONDAY_DATE,
                    startTime: '10:00',
                    endTime: '11:00',
                    // no location on custom slot
                },
            ],
        };
        await seedData([template], [override]);
        const slots = await availability_service_1.availabilityService.getAvailableSlots(COACH_ID, MONDAY_DATE, MONDAY_DATE, 60);
        node_assert_1.default.strictEqual(slots.length, 1);
        node_assert_1.default.strictEqual(slots[0].location, undefined, 'Location should be undefined when neither custom slot nor template provides one');
    });
    // =========================================================================
    // 4. Custom slot with explicit location, no matching day template
    // =========================================================================
    (0, node_test_1.it)('uses custom slot location even when no template exists for that day', async () => {
        // Template for Wednesday (dayOfWeek 3), but override is on Monday (dayOfWeek 1).
        const wednesdayTemplate = {
            id: 'tmpl_test_4',
            coachId: COACH_ID,
            dayOfWeek: 3, // Wednesday — does NOT match Monday
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
            location: 'Regent\'s Park',
        };
        const override = {
            id: 'ovr_test_4',
            coachId: COACH_ID,
            date: MONDAY_DATE, // Monday — no template for this day
            isBlocked: false,
            customSlots: [
                {
                    date: MONDAY_DATE,
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Clapham Common',
                },
            ],
        };
        await seedData([wednesdayTemplate], [override]);
        const slots = await availability_service_1.availabilityService.getAvailableSlots(COACH_ID, MONDAY_DATE, MONDAY_DATE, 60);
        node_assert_1.default.strictEqual(slots.length, 1);
        node_assert_1.default.strictEqual(slots[0].location, 'Clapham Common', 'Custom slot explicit location should be used when there is no matching day template');
    });
    // =========================================================================
    // 5. Multiple custom slots — mixed location presence
    // =========================================================================
    (0, node_test_1.it)('resolves each custom slot location independently (some explicit, some fallback)', async () => {
        const template = {
            id: 'tmpl_test_5',
            coachId: COACH_ID,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 15,
            location: 'Hyde Park',
        };
        const override = {
            id: 'ovr_test_5',
            coachId: COACH_ID,
            date: MONDAY_DATE,
            isBlocked: false,
            customSlots: [
                {
                    date: MONDAY_DATE,
                    startTime: '09:00',
                    endTime: '10:00',
                    location: 'Victoria Park', // explicit
                },
                {
                    date: MONDAY_DATE,
                    startTime: '11:00',
                    endTime: '12:00',
                    // no location — falls back to template
                },
                {
                    date: MONDAY_DATE,
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Battersea Park', // explicit
                },
            ],
        };
        await seedData([template], [override]);
        const slots = await availability_service_1.availabilityService.getAvailableSlots(COACH_ID, MONDAY_DATE, MONDAY_DATE, 60);
        node_assert_1.default.strictEqual(slots.length, 3, 'Should produce 3 slots from 3 custom slots');
        // Slots are sorted by date + startTime, so they should be in order
        const slotAt0900 = slots.find(s => s.startTime === '09:00');
        const slotAt1100 = slots.find(s => s.startTime === '11:00');
        const slotAt1400 = slots.find(s => s.startTime === '14:00');
        node_assert_1.default.ok(slotAt0900, 'Should have slot at 09:00');
        node_assert_1.default.ok(slotAt1100, 'Should have slot at 11:00');
        node_assert_1.default.ok(slotAt1400, 'Should have slot at 14:00');
        node_assert_1.default.strictEqual(slotAt0900.location, 'Victoria Park', '09:00 slot should use its explicit location');
        node_assert_1.default.strictEqual(slotAt1100.location, 'Hyde Park', '11:00 slot should fall back to template location');
        node_assert_1.default.strictEqual(slotAt1400.location, 'Battersea Park', '14:00 slot should use its explicit location');
    });
});
