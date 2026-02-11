"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const availability_service_1 = require("@/services/availability-service");
function toDateString(date) {
    return date.toISOString().split('T')[0];
}
function nextDateForDay(dayOfWeek) {
    const today = new Date();
    const result = new Date(today);
    const delta = (dayOfWeek - today.getDay() + 7) % 7;
    result.setDate(today.getDate() + delta);
    return toDateString(result);
}
(0, node_test_1.describe)('availabilityService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BLOCKED_DATES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS);
    });
    (0, node_test_1.it)('saves and retrieves coach templates (happy path)', async () => {
        const saved = await availability_service_1.availabilityService.saveTemplate({
            coachId: 'coach-availability-1',
            dayOfWeek: 1,
            startTime: '10:00',
            endTime: '12:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 0,
            location: 'Pitch A',
        });
        const templates = await availability_service_1.availabilityService.getTemplates('coach-availability-1');
        strict_1.default.equal(templates.some((template) => template.id === saved.id), true);
    });
    (0, node_test_1.it)('blocks and unblocks a date using overrides', async () => {
        const date = nextDateForDay(2);
        await availability_service_1.availabilityService.blockDate('coach-availability-2', date, 'Holiday');
        const blocked = await availability_service_1.availabilityService.getOverrides('coach-availability-2', date, date);
        strict_1.default.equal(blocked.length, 1);
        strict_1.default.equal(blocked[0].isBlocked, true);
        await availability_service_1.availabilityService.unblockDate('coach-availability-2', date);
        const afterUnblock = await availability_service_1.availabilityService.getOverrides('coach-availability-2', date, date);
        strict_1.default.equal(afterUnblock.length, 0);
    });
    (0, node_test_1.it)('returns no slots for coach without templates (empty path)', async () => {
        const date = nextDateForDay(3);
        const slots = await availability_service_1.availabilityService.getAvailableSlots('coach-availability-empty', date, date, 60);
        strict_1.default.deepEqual(slots, []);
    });
    (0, node_test_1.it)('removes slots on blocked date', async () => {
        const date = nextDateForDay(4);
        await availability_service_1.availabilityService.saveTemplate({
            coachId: 'coach-availability-3',
            dayOfWeek: 4,
            startTime: '10:00',
            endTime: '12:00',
            isRecurring: true,
            maxConcurrent: 1,
            bufferMinutes: 0,
            location: 'Pitch B',
        });
        const beforeBlock = await availability_service_1.availabilityService.getAvailableSlots('coach-availability-3', date, date, 60);
        strict_1.default.equal(beforeBlock.length > 0, true);
        await availability_service_1.availabilityService.blockDate('coach-availability-3', date, 'Venue closed');
        const afterBlock = await availability_service_1.availabilityService.getAvailableSlots('coach-availability-3', date, date, 60);
        strict_1.default.equal(afterBlock.length, 0);
    });
    (0, node_test_1.it)('returns zero conflicts when no dates provided', async () => {
        const result = await availability_service_1.availabilityService.checkConflicts('coach-availability-4', []);
        strict_1.default.equal(result.bookingCount, 0);
        strict_1.default.equal(result.holdCount, 0);
        strict_1.default.deepEqual(result.bookings, []);
        strict_1.default.deepEqual(result.holds, []);
    });
    (0, node_test_1.it)('falls back safely when template storage read fails (error-handling path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced availability load failure');
        };
        try {
            const templates = await availability_service_1.availabilityService.getTemplates('coach1');
            strict_1.default.equal(Array.isArray(templates), true);
            strict_1.default.equal(templates.length > 0, true);
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
