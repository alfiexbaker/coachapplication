/**
 * Tests for useSessionRegistrationBadges hook logic.
 *
 * Since the hook wraps pure logic in useMemo, we mock React.useMemo
 * to execute the factory synchronously and test the mapping directly.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

// Mock React.useMemo to just execute the factory
const React = require('react');
const originalUseMemo = React.useMemo;
React.useMemo = (factory: () => unknown) => factory();

import { useSessionRegistrationBadges } from '../../hooks/use-session-registration-badges';
import type { ChildInfo } from '../../types/child-context';
import type { GroupRegistration } from '../../constants/session-types';

// Restore after import (tests run synchronously per describe block)
// We keep the mock active for the duration of these tests.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChild(overrides: Partial<ChildInfo> & { id: string; name: string; referenceId: string; colorCode: string }): ChildInfo {
  return {
    profileId: null,
    fullName: overrides.name,
    initials: overrides.name.slice(0, 2).toUpperCase(),
    avatarUrl: null,
    age: 10,
    dateOfBirth: null,
    squadIds: [],
    clubIds: [],
    hasSpecialNeeds: false,
    profile: null,
    ...overrides,
  };
}

function makeReg(overrides: Partial<GroupRegistration> & { id: string; sessionId: string; athleteId: string }): GroupRegistration {
  return {
    parentId: 'parent-1',
    status: 'REGISTERED',
    registeredAt: '2026-01-10T10:00:00Z',
    attendedDates: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOM = makeChild({ id: 'user1', referenceId: 'user1', name: 'Tom', colorCode: '#6366F1' });
const EMMA = makeChild({ id: 'user2', referenceId: 'user2', name: 'Emma', colorCode: '#EC4899' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSessionRegistrationBadges', () => {

  test('returns empty map when children is empty', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })],
    );
    assert.equal(result.size, 0);
  });

  test('returns empty map when registrations is empty', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [],
    );
    assert.equal(result.size, 0);
  });

  test('maps a single registered child to one session', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })],
    );

    assert.equal(result.size, 1);
    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses.length, 1);
    assert.equal(badge.childStatuses[0].childId, 'user1');
    assert.equal(badge.childStatuses[0].name, 'Tom');
    assert.equal(badge.childStatuses[0].status, 'registered');
    assert.equal(badge.childStatuses[0].colorCode, '#6366F1');
  });

  test('maps two children registered for same session', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM, EMMA],
      [
        makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
        makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user2' }),
      ],
    );

    assert.equal(result.size, 1);
    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses.length, 2);
    assert.equal(badge.childStatuses[0].name, 'Tom');
    assert.equal(badge.childStatuses[1].name, 'Emma');
  });

  test('maps children across multiple sessions', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }, { id: 'gs_2' }],
      [TOM, EMMA],
      [
        makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
        makeReg({ id: 'r2', sessionId: 'gs_2', athleteId: 'user2' }),
      ],
    );

    assert.equal(result.size, 2);
    assert.equal(result.get('gs_1')!.childStatuses[0].name, 'Tom');
    assert.equal(result.get('gs_2')!.childStatuses[0].name, 'Emma');
  });

  test('normalizes WAITLISTED status correctly', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'WAITLISTED' })],
    );

    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses[0].status, 'waitlisted');
  });

  test('filters out CANCELLED registrations', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'CANCELLED' })],
    );

    assert.equal(result.size, 0);
  });

  test('filters out NO_SHOW registrations', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'NO_SHOW' })],
    );

    assert.equal(result.size, 0);
  });

  test('filters out ATTENDED registrations (normalizeStatus returns null)', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'ATTENDED' })],
    );

    assert.equal(result.size, 0);
  });

  test('deduplicates athlete registrations within same session', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [
        makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
        makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user1' }),
      ],
    );

    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses.length, 1, 'should deduplicate same athleteId');
  });

  test('matches child by referenceId when athleteId differs from id', () => {
    const child = makeChild({ id: 'child-1', referenceId: 'user1', name: 'Tom', colorCode: '#6366F1' });
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [child],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })],
    );

    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses.length, 1);
    assert.equal(badge.childStatuses[0].childId, 'child-1');
  });

  test('ignores registrations for unknown athletes', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'unknown-athlete' })],
    );

    assert.equal(result.size, 0);
  });

  test('skips sessions with no matching registrations', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }, { id: 'gs_2' }],
      [TOM],
      [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })],
    );

    assert.equal(result.size, 1);
    assert.ok(result.has('gs_1'));
    assert.ok(!result.has('gs_2'));
  });

  test('mixed statuses — one registered, one waitlisted', () => {
    const result = useSessionRegistrationBadges(
      [{ id: 'gs_1' }],
      [TOM, EMMA],
      [
        makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'REGISTERED' }),
        makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user2', status: 'WAITLISTED' }),
      ],
    );

    const badge = result.get('gs_1');
    assert.ok(badge);
    assert.equal(badge.childStatuses.length, 2);
    assert.equal(badge.childStatuses[0].status, 'registered');
    assert.equal(badge.childStatuses[1].status, 'waitlisted');
  });
});

// Cleanup: restore original useMemo
test.after(() => {
  React.useMemo = originalUseMemo;
});
