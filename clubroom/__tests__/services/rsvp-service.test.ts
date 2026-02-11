import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { rsvpService } from '@/services/rsvp-service';

describe('rsvpService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_RSVPS);
  });

  it('creates RSVPs for a session and responds successfully (happy path)', async () => {
    const created = await rsvpService.createForSession('session_rsvp_1', [
      { userId: 'parent_rsvp_1', childId: 'athlete_rsvp_1' },
      { userId: 'parent_rsvp_2' },
    ]);
    assert.equal(created.length, 2);

    const response = await rsvpService.respond(created[0].id, 'going');
    assert.equal(response.success, true);
    if (!response.success) return;

    assert.equal(response.data.status, 'going');
    const counts = await rsvpService.getSessionCounts('session_rsvp_1');
    assert.equal(counts.going, 1);
    assert.equal(counts.pending, 1);
  });

  it('returns empty pending list for user without RSVPs (empty path)', async () => {
    const pending = await rsvpService.getPendingForUser('parent_no_rsvp');
    assert.deepEqual(pending, []);
  });

  it('returns err for missing RSVP id (error path)', async () => {
    const result = await rsvpService.respond('rsvp_missing', 'maybe');
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });
});
