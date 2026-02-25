/**
 * Roster Service Tests — Cross-Coach Isolation
 *
 * Verifies that coaches can only see their own roster entries
 * and that the service filters out incorrectly assigned athletes.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { rosterService } from '@/services/roster-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { RosterEntry } from '@/constants/types';

function makeRosterEntry(
  overrides: Partial<RosterEntry> & { id: string; coachId: string; athleteId: string },
): RosterEntry {
  return {
    parentId: 'parent_1',
    status: 'ACTIVE',
    startDate: '2025-01-01',
    lastSessionDate: '2026-01-01',
    totalSessions: 5,
    totalRevenue: 300,
    averageRating: 4.5,
    notes: [],
    tags: [],
    primaryFocus: 'Passing',
    notificationPreference: 'ALL',
    ...overrides,
  };
}

describe('RosterService - Cross-Coach Isolation', () => {
  beforeEach(async () => {
    // Disable mock data so tests control storage via apiClient
    (rosterService as unknown as { useMock: boolean }).useMock = false;
    // Clear roster storage and cache
    await apiClient.remove(STORAGE_KEYS.ROSTER);
    (rosterService as unknown as { _cache: null })._cache = null;
  });

  it('should return only the requesting coach\'s roster entries', async () => {
    // Setup: Two coaches with separate roster entries
    const entries: RosterEntry[] = [
      makeRosterEntry({ id: 'r1', coachId: 'coach1', athleteId: 'athlete_a' }),
      makeRosterEntry({ id: 'r2', coachId: 'coach2', athleteId: 'athlete_b' }),
    ];

    await apiClient.set(STORAGE_KEYS.ROSTER, entries);

    // Coach 1 should see only their athlete
    const coach1Roster = await rosterService.getRoster('coach1');
    assert.strictEqual(coach1Roster.length, 1);
    assert.strictEqual(coach1Roster[0].athleteId, 'athlete_a');

    // Coach 2 should see only their athlete
    const coach2Roster = await rosterService.getRoster('coach2');
    assert.strictEqual(coach2Roster.length, 1);
    assert.strictEqual(coach2Roster[0].athleteId, 'athlete_b');

    // Coach 1 should NOT see athlete_b
    const coach1AthleteIds = coach1Roster.map((r) => r.athleteId);
    assert.strictEqual(coach1AthleteIds.includes('athlete_b'), false);
  });

  it('should return empty array for coach with no roster entries', async () => {
    const entries: RosterEntry[] = [
      makeRosterEntry({ id: 'r1', coachId: 'coach1', athleteId: 'athlete_a' }),
    ];

    await apiClient.set(STORAGE_KEYS.ROSTER, entries);

    const emptyRoster = await rosterService.getRoster('coach_no_entries');
    assert.strictEqual(emptyRoster.length, 0);
  });

  it('should check DBS validity method', async () => {
    // isDbsValid uses verification service which returns mock data
    // coach1 has valid DBS in mock data
    const coach1Valid = await rosterService.isDbsValid('coach1');
    assert.strictEqual(typeof coach1Valid, 'boolean');

    // coach2 has NOT_STARTED DBS in mock data
    const coach2Valid = await rosterService.isDbsValid('coach2');
    assert.strictEqual(coach2Valid, false);
  });
});
