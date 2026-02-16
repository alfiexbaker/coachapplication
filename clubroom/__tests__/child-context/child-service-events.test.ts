/**
 * Tests for child-service event emissions (CHILD_PROFILES_UPDATED)
 *
 * Verifies that createChild, updateChild, deleteChild emit the correct
 * typed event on the event bus.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { childService, type ChildProfile } from '../../services/child-service';
import { eventBus, ServiceEvents, type EventPayloads } from '../../services/event-bus';
import { apiClient } from '../../services/api-client';
import { STORAGE_KEYS } from '../../constants/storage-keys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ChildProfilesPayload = EventPayloads[typeof ServiceEvents.CHILD_PROFILES_UPDATED];

/** Collect all CHILD_PROFILES_UPDATED events during a test. */
function collectEvents(): { events: ChildProfilesPayload[]; unsub: () => void } {
  const events: ChildProfilesPayload[] = [];
  const unsub = eventBus.on<ChildProfilesPayload>(
    ServiceEvents.CHILD_PROFILES_UPDATED,
    (payload) => events.push(payload),
  );
  return { events, unsub };
}

const TEST_PARENT_ID = 'test-parent-evt-1';

const baseInput = {
  firstName: 'Test',
  lastName: 'Child',
  gender: 'MALE' as const,
  relationship: 'SON' as const,
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '+44 7700 000001',
  emergencyContactRelation: 'Mother',
};

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  // Clear storage to start with empty state per test
  await apiClient.remove(STORAGE_KEYS.CHILDREN_PROFILES);
  // Seed with an empty array so loadFromStorage returns [] instead of mock defaults
  await apiClient.set(STORAGE_KEYS.CHILDREN_PROFILES, []);
});

afterEach(() => {
  eventBus.clearAll();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('child-service event emissions', () => {
  test('createChild emits CHILD_PROFILES_UPDATED with action=created', async () => {
    const { events, unsub } = collectEvents();

    const created = await childService.createChild(TEST_PARENT_ID, baseInput);

    unsub();

    assert.equal(events.length, 1);
    assert.equal(events[0].parentId, TEST_PARENT_ID);
    assert.equal(events[0].action, 'created');
    assert.equal(events[0].childId, created.id);
  });

  test('updateChild emits CHILD_PROFILES_UPDATED with action=updated', async () => {
    // Create a child first
    const created = await childService.createChild(TEST_PARENT_ID, baseInput);
    eventBus.clearAll(); // Reset events from create

    const { events, unsub } = collectEvents();

    const result = await childService.updateChild(created.id, { firstName: 'Updated' });

    unsub();

    assert.equal(result.success, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].parentId, TEST_PARENT_ID);
    assert.equal(events[0].action, 'updated');
    assert.equal(events[0].childId, created.id);
  });

  test('updateChild returns NOT_FOUND for non-existent child', async () => {
    const { events, unsub } = collectEvents();

    const result = await childService.updateChild('non-existent-xyz', { firstName: 'Nope' });

    unsub();

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
    // No event should be emitted on failure
    assert.equal(events.length, 0);
  });

  test('deleteChild emits CHILD_PROFILES_UPDATED with action=deleted', async () => {
    const created = await childService.createChild(TEST_PARENT_ID, baseInput);
    eventBus.clearAll();

    const { events, unsub } = collectEvents();

    await childService.deleteChild(created.id);

    unsub();

    assert.equal(events.length, 1);
    assert.equal(events[0].parentId, TEST_PARENT_ID);
    assert.equal(events[0].action, 'deleted');
    assert.equal(events[0].childId, created.id);
  });

  test('deleteChild does not emit when child does not exist', async () => {
    const { events, unsub } = collectEvents();

    await childService.deleteChild('non-existent-xyz');

    unsub();

    // No event because deletedChild was not found
    assert.equal(events.length, 0);
  });

  test('setActiveChildId emits FAMILY_ACTIVE_CHILD_CHANGED', async () => {
    type ActivePayload = EventPayloads[typeof ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED];
    const events: ActivePayload[] = [];
    const unsub = eventBus.on<ActivePayload>(
      ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED,
      (payload) => events.push(payload),
    );

    await childService.setActiveChildId('child-abc', 'Tom');

    unsub();

    assert.equal(events.length, 1);
    assert.equal(events[0].childId, 'child-abc');
    assert.equal(events[0].childName, 'Tom');
  });

  test('setActiveChildId with null clears active child', async () => {
    type ActivePayload = EventPayloads[typeof ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED];
    const events: ActivePayload[] = [];
    const unsub = eventBus.on<ActivePayload>(
      ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED,
      (payload) => events.push(payload),
    );

    await childService.setActiveChildId(null);

    unsub();

    assert.equal(events.length, 1);
    assert.equal(events[0].childId, null);
  });

  test('getActiveChildId returns stored value', async () => {
    await childService.setActiveChildId('child-xyz', 'Lily');

    const result = await childService.getActiveChildId();

    assert.equal(result, 'child-xyz');
  });

  test('getActiveChildId returns null when no active child set', async () => {
    await apiClient.remove(STORAGE_KEYS.ACTIVE_CHILD_ID);

    const result = await childService.getActiveChildId();

    assert.equal(result, null);
  });
});
