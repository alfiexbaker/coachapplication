"use strict";
/**
 * Coach Venue Service Tests
 *
 * Tests CRUD operations and default-seeding logic for CoachVenueService.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const api_client_1 = require("@/services/api-client");
const coach_venue_service_1 = require("@/services/coach-venue-service");
const storage_keys_1 = require("@/constants/storage-keys");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function resetStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
}
const COACH_ID = 'coach_venue_test';
const OTHER_COACH_ID = 'coach_venue_other';
// ---------------------------------------------------------------------------
// Test Suite 1: getVenues
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('coachVenueService.getVenues', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('returns empty array initially', async () => {
        const venues = await coach_venue_service_1.coachVenueService.getVenues(COACH_ID);
        node_assert_1.default.deepStrictEqual(venues, [], 'Should return empty array when no venues exist');
    });
    (0, node_test_1.it)('returns all saved venues for a given coach', async () => {
        // Manually seed two venues for COACH_ID
        const existing = [
            { id: 'v1', coachId: COACH_ID, label: 'Hyde Park', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'v2', coachId: COACH_ID, label: 'Victoria Park', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'v3', coachId: OTHER_COACH_ID, label: 'Other Venue', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        const venues = await coach_venue_service_1.coachVenueService.getVenues(COACH_ID);
        node_assert_1.default.strictEqual(venues.length, 2, 'Should return only venues for COACH_ID');
        node_assert_1.default.strictEqual(venues[0].label, 'Hyde Park');
        node_assert_1.default.strictEqual(venues[1].label, 'Victoria Park');
    });
    (0, node_test_1.it)('does not return venues for a different coach', async () => {
        const existing = [
            { id: 'v1', coachId: OTHER_COACH_ID, label: 'Other Venue', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        const venues = await coach_venue_service_1.coachVenueService.getVenues(COACH_ID);
        node_assert_1.default.strictEqual(venues.length, 0, 'Should not return venues belonging to other coaches');
    });
});
// ---------------------------------------------------------------------------
// Test Suite 2: ensureDefaultVenues
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('coachVenueService.ensureDefaultVenues', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('creates 5 default venues when coach has none', async () => {
        const venues = await coach_venue_service_1.coachVenueService.ensureDefaultVenues(COACH_ID);
        node_assert_1.default.strictEqual(venues.length, 5, 'Should create 5 default venues');
        node_assert_1.default.ok(venues.every((v) => v.coachId === COACH_ID), 'All venues should belong to the coach');
        node_assert_1.default.ok(venues.every((v) => v.isDefault === true), 'All venues should be marked as default');
        // Verify they are persisted
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 5, 'All 5 venues should be persisted');
    });
    (0, node_test_1.it)('returns existing venues without creating new ones when coach already has venues', async () => {
        const existing = [
            { id: 'v_existing', coachId: COACH_ID, label: 'My Custom Venue', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        const venues = await coach_venue_service_1.coachVenueService.ensureDefaultVenues(COACH_ID);
        node_assert_1.default.strictEqual(venues.length, 1, 'Should return existing venues');
        node_assert_1.default.strictEqual(venues[0].label, 'My Custom Venue');
        // Verify no new venues were created
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 1, 'No new venues should have been created');
    });
    (0, node_test_1.it)('default venues have expected labels', async () => {
        const venues = await coach_venue_service_1.coachVenueService.ensureDefaultVenues(COACH_ID);
        const labels = venues.map((v) => v.label);
        node_assert_1.default.ok(labels.includes('London Fields'), 'Should include London Fields');
        node_assert_1.default.ok(labels.includes('Victoria Park'), 'Should include Victoria Park');
        node_assert_1.default.ok(labels.includes('Hyde Park'), 'Should include Hyde Park');
        node_assert_1.default.ok(labels.includes('Indoor Facility'), 'Should include Indoor Facility');
        node_assert_1.default.ok(labels.includes('Online'), 'Should include Online');
    });
    (0, node_test_1.it)('each default venue has a unique ID and createdAt timestamp', async () => {
        const venues = await coach_venue_service_1.coachVenueService.ensureDefaultVenues(COACH_ID);
        const ids = venues.map((v) => v.id);
        const uniqueIds = new Set(ids);
        node_assert_1.default.strictEqual(uniqueIds.size, 5, 'All venue IDs should be unique');
        node_assert_1.default.ok(venues.every((v) => v.createdAt), 'All venues should have createdAt');
    });
});
// ---------------------------------------------------------------------------
// Test Suite 3: saveVenue
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('coachVenueService.saveVenue', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('adds a venue and returns it with generated ID', async () => {
        const result = await coach_venue_service_1.coachVenueService.saveVenue({
            coachId: COACH_ID,
            label: 'New Venue',
            icon: 'location-outline',
        });
        node_assert_1.default.ok(result.id, 'Should have generated an ID');
        node_assert_1.default.ok(result.id.startsWith('venue_'), 'ID should start with venue_');
        node_assert_1.default.strictEqual(result.coachId, COACH_ID);
        node_assert_1.default.strictEqual(result.label, 'New Venue');
        node_assert_1.default.strictEqual(result.icon, 'location-outline');
        node_assert_1.default.ok(result.createdAt, 'Should have generated createdAt');
        // Verify persisted
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 1);
        node_assert_1.default.strictEqual(stored[0].label, 'New Venue');
    });
    (0, node_test_1.it)('updates an existing venue when saving with same ID', async () => {
        // First save
        const original = await coach_venue_service_1.coachVenueService.saveVenue({
            id: 'v_fixed_id',
            coachId: COACH_ID,
            label: 'Original Label',
        });
        node_assert_1.default.strictEqual(original.label, 'Original Label');
        // Update with same ID
        const updated = await coach_venue_service_1.coachVenueService.saveVenue({
            id: 'v_fixed_id',
            coachId: COACH_ID,
            label: 'Updated Label',
        });
        node_assert_1.default.strictEqual(updated.label, 'Updated Label');
        // Should not have created a duplicate
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 1, 'Should not create duplicate when ID matches');
        node_assert_1.default.strictEqual(stored[0].label, 'Updated Label');
    });
    (0, node_test_1.it)('creates separate entries when saving with different explicit IDs', async () => {
        await coach_venue_service_1.coachVenueService.saveVenue({ id: 'v_a', coachId: COACH_ID, label: 'Venue A' });
        await coach_venue_service_1.coachVenueService.saveVenue({ id: 'v_b', coachId: COACH_ID, label: 'Venue B' });
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 2, 'Should create two separate venues');
        node_assert_1.default.strictEqual(stored[0].label, 'Venue A');
        node_assert_1.default.strictEqual(stored[1].label, 'Venue B');
    });
});
// ---------------------------------------------------------------------------
// Test Suite 4: deleteVenue
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('coachVenueService.deleteVenue', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('removes the venue by ID', async () => {
        const existing = [
            { id: 'v1', coachId: COACH_ID, label: 'To Keep', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'v2', coachId: COACH_ID, label: 'To Delete', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        await coach_venue_service_1.coachVenueService.deleteVenue('v2');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 1, 'Should have 1 venue remaining');
        node_assert_1.default.strictEqual(stored[0].id, 'v1', 'Remaining venue should be v1');
    });
    (0, node_test_1.it)('does nothing when deleting a non-existent venue ID', async () => {
        const existing = [
            { id: 'v1', coachId: COACH_ID, label: 'Existing', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        // Should not throw
        await coach_venue_service_1.coachVenueService.deleteVenue('nonexistent_id');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 1, 'Existing venue should remain');
    });
    (0, node_test_1.it)('removes all venues when deleting each one', async () => {
        const existing = [
            { id: 'v1', coachId: COACH_ID, label: 'First', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'v2', coachId: COACH_ID, label: 'Second', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_VENUES, existing);
        await coach_venue_service_1.coachVenueService.deleteVenue('v1');
        await coach_venue_service_1.coachVenueService.deleteVenue('v2');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_VENUES, []);
        node_assert_1.default.strictEqual(stored.length, 0, 'All venues should be removed');
    });
});
