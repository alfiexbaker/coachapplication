/**
 * Coach Venue Service Tests
 *
 * Tests CRUD operations and default-seeding logic for CoachVenueService.
 */

import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

import { apiClient } from '@/services/api-client';
import { coachVenueService } from '@/services/coach-venue-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { CoachVenue } from '@/constants/session-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resetStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.COACH_VENUES, []);
}

const COACH_ID = 'coach_venue_test';
const OTHER_COACH_ID = 'coach_venue_other';

// ---------------------------------------------------------------------------
// Test Suite 1: getVenues
// ---------------------------------------------------------------------------

describe('coachVenueService.getVenues', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('returns empty array initially', async () => {
    const venues = await coachVenueService.getVenues(COACH_ID);
    assert.deepStrictEqual(venues, [], 'Should return empty array when no venues exist');
  });

  it('returns all saved venues for a given coach', async () => {
    // Manually seed two venues for COACH_ID
    const existing: CoachVenue[] = [
      { id: 'v1', coachId: COACH_ID, label: 'Hyde Park', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'v2', coachId: COACH_ID, label: 'Victoria Park', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'v3', coachId: OTHER_COACH_ID, label: 'Other Venue', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    const venues = await coachVenueService.getVenues(COACH_ID);
    assert.strictEqual(venues.length, 2, 'Should return only venues for COACH_ID');
    assert.strictEqual(venues[0].label, 'Hyde Park');
    assert.strictEqual(venues[1].label, 'Victoria Park');
  });

  it('does not return venues for a different coach', async () => {
    const existing: CoachVenue[] = [
      { id: 'v1', coachId: OTHER_COACH_ID, label: 'Other Venue', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    const venues = await coachVenueService.getVenues(COACH_ID);
    assert.strictEqual(venues.length, 0, 'Should not return venues belonging to other coaches');
  });
});

// ---------------------------------------------------------------------------
// Test Suite 2: ensureDefaultVenues
// ---------------------------------------------------------------------------

describe('coachVenueService.ensureDefaultVenues', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('creates 5 default venues when coach has none', async () => {
    const venues = await coachVenueService.ensureDefaultVenues(COACH_ID);

    assert.strictEqual(venues.length, 5, 'Should create 5 default venues');
    assert.ok(venues.every((v) => v.coachId === COACH_ID), 'All venues should belong to the coach');
    assert.ok(venues.every((v) => v.isDefault === true), 'All venues should be marked as default');

    // Verify they are persisted
    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 5, 'All 5 venues should be persisted');
  });

  it('returns existing venues without creating new ones when coach already has venues', async () => {
    const existing: CoachVenue[] = [
      { id: 'v_existing', coachId: COACH_ID, label: 'My Custom Venue', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    const venues = await coachVenueService.ensureDefaultVenues(COACH_ID);

    assert.strictEqual(venues.length, 1, 'Should return existing venues');
    assert.strictEqual(venues[0].label, 'My Custom Venue');

    // Verify no new venues were created
    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 1, 'No new venues should have been created');
  });

  it('default venues have expected labels', async () => {
    const venues = await coachVenueService.ensureDefaultVenues(COACH_ID);

    const labels = venues.map((v) => v.label);
    assert.ok(labels.includes('London Fields'), 'Should include London Fields');
    assert.ok(labels.includes('Victoria Park'), 'Should include Victoria Park');
    assert.ok(labels.includes('Hyde Park'), 'Should include Hyde Park');
    assert.ok(labels.includes('Indoor Facility'), 'Should include Indoor Facility');
    assert.ok(labels.includes('Online'), 'Should include Online');
  });

  it('each default venue has a unique ID and createdAt timestamp', async () => {
    const venues = await coachVenueService.ensureDefaultVenues(COACH_ID);

    const ids = venues.map((v) => v.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, 5, 'All venue IDs should be unique');
    assert.ok(venues.every((v) => v.createdAt), 'All venues should have createdAt');
  });
});

// ---------------------------------------------------------------------------
// Test Suite 3: saveVenue
// ---------------------------------------------------------------------------

describe('coachVenueService.saveVenue', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('adds a venue and returns it with generated ID', async () => {
    const result = await coachVenueService.saveVenue({
      coachId: COACH_ID,
      label: 'New Venue',
      icon: 'location-outline',
    });

    assert.ok(result.id, 'Should have generated an ID');
    assert.ok(result.id.startsWith('venue_'), 'ID should start with venue_');
    assert.strictEqual(result.coachId, COACH_ID);
    assert.strictEqual(result.label, 'New Venue');
    assert.strictEqual(result.icon, 'location-outline');
    assert.ok(result.createdAt, 'Should have generated createdAt');

    // Verify persisted
    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0].label, 'New Venue');
  });

  it('updates an existing venue when saving with same ID', async () => {
    // First save
    const original = await coachVenueService.saveVenue({
      id: 'v_fixed_id',
      coachId: COACH_ID,
      label: 'Original Label',
    });
    assert.strictEqual(original.label, 'Original Label');

    // Update with same ID
    const updated = await coachVenueService.saveVenue({
      id: 'v_fixed_id',
      coachId: COACH_ID,
      label: 'Updated Label',
    });
    assert.strictEqual(updated.label, 'Updated Label');

    // Should not have created a duplicate
    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 1, 'Should not create duplicate when ID matches');
    assert.strictEqual(stored[0].label, 'Updated Label');
  });

  it('creates separate entries when saving with different explicit IDs', async () => {
    await coachVenueService.saveVenue({ id: 'v_a', coachId: COACH_ID, label: 'Venue A' });
    await coachVenueService.saveVenue({ id: 'v_b', coachId: COACH_ID, label: 'Venue B' });

    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 2, 'Should create two separate venues');
    assert.strictEqual(stored[0].label, 'Venue A');
    assert.strictEqual(stored[1].label, 'Venue B');
  });
});

// ---------------------------------------------------------------------------
// Test Suite 4: deleteVenue
// ---------------------------------------------------------------------------

describe('coachVenueService.deleteVenue', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('removes the venue by ID', async () => {
    const existing: CoachVenue[] = [
      { id: 'v1', coachId: COACH_ID, label: 'To Keep', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'v2', coachId: COACH_ID, label: 'To Delete', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    await coachVenueService.deleteVenue('v2');

    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 1, 'Should have 1 venue remaining');
    assert.strictEqual(stored[0].id, 'v1', 'Remaining venue should be v1');
  });

  it('does nothing when deleting a non-existent venue ID', async () => {
    const existing: CoachVenue[] = [
      { id: 'v1', coachId: COACH_ID, label: 'Existing', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    // Should not throw
    await coachVenueService.deleteVenue('nonexistent_id');

    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 1, 'Existing venue should remain');
  });

  it('removes all venues when deleting each one', async () => {
    const existing: CoachVenue[] = [
      { id: 'v1', coachId: COACH_ID, label: 'First', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'v2', coachId: COACH_ID, label: 'Second', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, existing);

    await coachVenueService.deleteVenue('v1');
    await coachVenueService.deleteVenue('v2');

    const stored = await apiClient.get<CoachVenue[]>(STORAGE_KEYS.COACH_VENUES, []);
    assert.strictEqual(stored.length, 0, 'All venues should be removed');
  });
});
