/**
 * Schedule Conflict Detection Tests
 *
 * Tests for detectScheduleConflicts() and buildConflictsByEventId() —
 * the pure algorithm behind useScheduleConflicts hook.
 *
 * Phase 5, Multi-Child Sprint.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  detectScheduleConflicts,
  buildConflictsByEventId,
} from '../../hooks/use-schedule-conflicts';
import type { FamilyCalendarEvent } from '../../constants/family-types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal FamilyCalendarEvent for testing. */
function makeEvent(
  overrides: Partial<FamilyCalendarEvent> & { id: string; childId: string },
): FamilyCalendarEvent {
  return {
    title: 'Training',
    colorCode: '#FF0000',
    start: '2026-03-10T10:00:00Z',
    end: '2026-03-10T11:00:00Z',
    status: 'CONFIRMED',
    ...overrides,
  };
}

// ─── detectScheduleConflicts ────────────────────────────────────────────────

describe('detectScheduleConflicts', () => {
  test('empty events → no conflicts', () => {
    const result = detectScheduleConflicts([], true);
    assert.deepStrictEqual(result, []);
  });

  test('single event → no conflicts', () => {
    const events = [makeEvent({ id: 'e1', childId: 'c1' })];
    const result = detectScheduleConflicts(events, true);
    assert.deepStrictEqual(result, []);
  });

  test('isMultiChild=false → no conflicts regardless of events', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, false);
    assert.deepStrictEqual(result, []);
  });

  test('different children, different coaches, overlapping → CONFLICT', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eventA.id, 'e1');
    assert.strictEqual(result[0].eventB.id, 'e2');
  });

  test('different children, SAME coach, overlapping → NOT a conflict', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach1', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('different children, different coaches, NOT overlapping → no conflict', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T10:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T11:00:00Z', end: '2026-03-10T12:00:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('same child, overlapping → NOT a conflict', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c1', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('adjacent events (end of A = start of B) → NOT a conflict', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T11:00:00Z', end: '2026-03-10T12:00:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('cancelled event → excluded from conflict detection', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z', status: 'CANCELLED' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('event without start time → excluded', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('event without end time → excluded', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('three events, two overlap → correct pair detected', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T10:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T09:30:00Z', end: '2026-03-10T10:30:00Z' }),
      makeEvent({ id: 'e3', childId: 'c3', coachId: 'coach3', start: '2026-03-10T12:00:00Z', end: '2026-03-10T13:00:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].eventA.id, 'e1');
    assert.strictEqual(result[0].eventB.id, 'e2');
  });

  test('three events, all overlap → detects all pairs', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:15:00Z', end: '2026-03-10T11:15:00Z' }),
      makeEvent({ id: 'e3', childId: 'c3', coachId: 'coach3', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    // e1-e2, e1-e3, e2-e3 = 3 conflicts
    assert.strictEqual(result.length, 3);
  });

  test('same location (no coachId) → NOT a conflict', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', location: 'Sports Centre', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('different locations (no coachId) → CONFLICT', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', location: 'Park Field', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
  });

  test('one has coachId, other has same location but no coachId → uses location fallback', () => {
    // When one event has no coachId, falls back to location comparison
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', location: 'Sports Centre', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    // b has no coachId → location fallback kicks in → same location → NOT a conflict
    assert.strictEqual(result.length, 0);
  });

  test('overlapMinutes is calculated correctly — 30 min overlap', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].overlapMinutes, 30);
  });

  test('overlapMinutes — fully contained event', () => {
    // e2 is fully inside e1
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T12:00:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].overlapMinutes, 60);
  });

  test('overlapMinutes — 15 min overlap', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T10:45:00Z' }),
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].overlapMinutes, 15);
  });

  test('events without childId → excluded', () => {
    const events = [
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
      // childId is empty string — falsy
      makeEvent({ id: 'e2', childId: '', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 0);
  });

  test('unsorted input events still detected correctly', () => {
    // Provide events in reverse order — algorithm should sort internally
    const events = [
      makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
      makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
    ];
    const result = detectScheduleConflicts(events, true);
    assert.strictEqual(result.length, 1);
    // After sorting, e1 should be eventA (earlier start)
    assert.strictEqual(result[0].eventA.id, 'e1');
    assert.strictEqual(result[0].eventB.id, 'e2');
  });
});

// ─── buildConflictsByEventId ────────────────────────────────────────────────

describe('buildConflictsByEventId', () => {
  test('empty conflicts → empty map', () => {
    const result = buildConflictsByEventId([]);
    assert.strictEqual(result.size, 0);
  });

  test('single conflict → both event IDs indexed', () => {
    const eventA = makeEvent({ id: 'e1', childId: 'c1' });
    const eventB = makeEvent({ id: 'e2', childId: 'c2' });
    const conflict = { eventA, eventB, overlapMinutes: 30 };

    const result = buildConflictsByEventId([conflict]);
    assert.strictEqual(result.size, 2);
    assert.strictEqual(result.get('e1')?.length, 1);
    assert.strictEqual(result.get('e2')?.length, 1);
    assert.strictEqual(result.get('e1')?.[0], conflict);
    assert.strictEqual(result.get('e2')?.[0], conflict);
  });

  test('event in multiple conflicts → all conflicts indexed', () => {
    const eventA = makeEvent({ id: 'e1', childId: 'c1' });
    const eventB = makeEvent({ id: 'e2', childId: 'c2' });
    const eventC = makeEvent({ id: 'e3', childId: 'c3' });
    const conflict1 = { eventA, eventB, overlapMinutes: 30 };
    const conflict2 = { eventA, eventB: eventC, overlapMinutes: 15 };

    const result = buildConflictsByEventId([conflict1, conflict2]);
    // e1 is in both conflicts
    assert.strictEqual(result.get('e1')?.length, 2);
    // e2 is in one conflict
    assert.strictEqual(result.get('e2')?.length, 1);
    // e3 is in one conflict
    assert.strictEqual(result.get('e3')?.length, 1);
  });

  test('non-existent event ID returns undefined', () => {
    const result = buildConflictsByEventId([]);
    assert.strictEqual(result.get('nonexistent'), undefined);
  });
});
