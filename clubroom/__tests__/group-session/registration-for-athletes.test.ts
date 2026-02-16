/**
 * Tests for sessionRegistrationService.getRegistrationsForAthletes()
 *
 * Verifies that the method correctly filters registrations by athlete IDs
 * and excludes CANCELLED registrations.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { apiClient } from '../../services/api-client';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { sessionRegistrationService } from '../../services/group-session/session-registration-service';
import type { GroupRegistration } from '../../constants/session-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReg(overrides: Partial<GroupRegistration> & { id: string; sessionId: string; athleteId: string }): GroupRegistration {
  return {
    parentId: 'parent-1',
    status: 'REGISTERED',
    registeredAt: '2026-01-10T10:00:00Z',
    attendedDates: [],
    ...overrides,
  };
}

const SEED_REGISTRATIONS: GroupRegistration[] = [
  makeReg({ id: 'reg_a1', sessionId: 'gs_1', athleteId: 'athlete-1', status: 'REGISTERED' }),
  makeReg({ id: 'reg_a2', sessionId: 'gs_1', athleteId: 'athlete-2', status: 'REGISTERED' }),
  makeReg({ id: 'reg_a3', sessionId: 'gs_2', athleteId: 'athlete-1', status: 'WAITLISTED' }),
  makeReg({ id: 'reg_a4', sessionId: 'gs_2', athleteId: 'athlete-3', status: 'CANCELLED' }),
  makeReg({ id: 'reg_a5', sessionId: 'gs_3', athleteId: 'athlete-2', status: 'ATTENDED' }),
  makeReg({ id: 'reg_a6', sessionId: 'gs_3', athleteId: 'athlete-4', status: 'REGISTERED' }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sessionRegistrationService.getRegistrationsForAthletes', () => {

  beforeEach(async () => {
    // Seed registration data via apiClient
    await apiClient.set(STORAGE_KEYS.GROUP_REGISTRATIONS, SEED_REGISTRATIONS);
  });

  test('returns registrations for a single athlete', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-1']),
    );

    // athlete-1 has reg_a1 (REGISTERED) and reg_a3 (WAITLISTED) — both non-cancelled
    assert.equal(result.length, 2);
    const ids = result.map((r) => r.id).sort();
    assert.deepEqual(ids, ['reg_a1', 'reg_a3']);
  });

  test('returns registrations for multiple athletes', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-1', 'athlete-2']),
    );

    // athlete-1: reg_a1, reg_a3; athlete-2: reg_a2, reg_a5 — all non-cancelled
    assert.equal(result.length, 4);
    const ids = result.map((r) => r.id).sort();
    assert.deepEqual(ids, ['reg_a1', 'reg_a2', 'reg_a3', 'reg_a5']);
  });

  test('excludes CANCELLED registrations', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-3']),
    );

    // athlete-3 only has reg_a4 which is CANCELLED
    assert.equal(result.length, 0);
  });

  test('returns empty array for unknown athlete IDs', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['unknown-athlete']),
    );

    assert.equal(result.length, 0);
  });

  test('returns empty array for empty athlete ID set', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(),
    );

    assert.equal(result.length, 0);
  });

  test('includes ATTENDED status registrations', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-2']),
    );

    // athlete-2: reg_a2 (REGISTERED) + reg_a5 (ATTENDED) — both non-cancelled
    const statuses = result.map((r) => r.status);
    assert.ok(statuses.includes('ATTENDED'));
    assert.ok(statuses.includes('REGISTERED'));
  });

  test('includes WAITLISTED status registrations', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-1']),
    );

    const statuses = result.map((r) => r.status);
    assert.ok(statuses.includes('WAITLISTED'));
  });

  test('does not filter registrations not in the athlete set', async () => {
    const result = await sessionRegistrationService.getRegistrationsForAthletes(
      new Set(['athlete-4']),
    );

    // athlete-4 has reg_a6 only
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'reg_a6');
    assert.equal(result[0].athleteId, 'athlete-4');
  });
});
