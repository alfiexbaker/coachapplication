import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { RosterEntry } from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { rosterService } from '@/services/roster-service';

let sequence = 0;

function nextSuffix(): string {
  sequence += 1;
  return `${sequence}`;
}

function buildRosterInput(coachId: string, athleteId: string, parentId: string): Omit<RosterEntry, 'id'> {
  return {
    coachId,
    athleteId,
    parentId,
    status: 'ACTIVE',
    startDate: '2030-01-01',
    totalSessions: 0,
    totalRevenue: 0,
    averageRating: 0,
    notes: [],
    tags: [],
    primaryFocus: 'Passing',
    notificationPreference: 'ALL',
  };
}

describe('rosterService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY);
  });

  it('creates entry and returns it in getRoster (happy path)', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    const createResult = await rosterService.create(
      buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`),
    );

    assert.equal(createResult.success, true);

    const roster = await rosterService.getRoster(coachId);
    assert.equal(roster.some((entry) => entry.athleteId === athleteId), true);
  });

  it('returns empty roster search results when query does not match (empty path)', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;

    await rosterService.create(
      buildRosterInput(coachId, `athlete-roster-${suffix}`, `parent-roster-${suffix}`),
    );

    const filtered = await rosterService.getRoster(coachId, { search: 'no-match-search-term' });
    assert.deepEqual(filtered, []);
  });

  it('returns err when updating status for missing athlete (error path)', async () => {
    const result = await rosterService.updateStatus('coach-roster-missing', 'athlete-missing', 'PAUSED');

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('adds, updates, and deletes notes for an athlete', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    await rosterService.create(
      buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`),
    );

    const note = await rosterService.addNote(coachId, athleteId, 'Initial note');
    assert.equal(note.content, 'Initial note');

    const updateResult = await rosterService.updateNote(coachId, athleteId, note.id, 'Updated note');
    assert.equal(updateResult.success, true);
    if (updateResult.success) {
      assert.equal(updateResult.data.content, 'Updated note');
    }

    await rosterService.deleteNote(coachId, athleteId, note.id);

    const entry = await rosterService.getRosterEntry(coachId, athleteId);
    assert.ok(entry);
    assert.equal(entry?.notes.length, 0);
  });

  it('removes athlete to history and restores via undo', async () => {
    const suffix = nextSuffix();
    const coachId = `coach-roster-${suffix}`;
    const athleteId = `athlete-roster-${suffix}`;

    await rosterService.create(
      buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`),
    );

    const removeResult = await rosterService.removeAthlete(coachId, athleteId, 'INACTIVE', {
      archive: true,
      customReason: 'No attendance',
    });

    assert.equal(removeResult.success, true);
    if (!removeResult.success) return;

    const history = await rosterService.getRemovalHistory(coachId);
    assert.equal(history.length, 1);
    assert.equal(history[0].athleteId, athleteId);

    const undoResult = await rosterService.undoRemoval(coachId, removeResult.data.id);
    assert.equal(undoResult.success, true);
    if (!undoResult.success) return;

    const restored = await rosterService.getRosterEntry(coachId, athleteId);
    assert.ok(restored);
    assert.equal(restored?.athleteId, athleteId);
  });

  it('returns err when updating primary focus for missing athlete', async () => {
    const result = await rosterService.updatePrimaryFocus(
      'coach-roster-missing',
      'athlete-roster-missing',
      'Finishing',
    );

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });
});
