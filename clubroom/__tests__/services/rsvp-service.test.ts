import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { rsvpService } from '@/services/rsvp-service';
import { eventBus, ServiceEvents } from '@/services/event-bus';

describe('rsvpService', () => {
  beforeEach(async () => {
    rsvpService.__seedMockRsvps([]);
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // createForSession
  // ---------------------------------------------------------------------------

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

  it('does not create duplicate RSVPs for same user + session', async () => {
    await rsvpService.createForSession('session_dup_1', [
      { userId: 'parent_dup_1' },
    ]);
    const second = await rsvpService.createForSession('session_dup_1', [
      { userId: 'parent_dup_1' },
      { userId: 'parent_dup_2' },
    ]);
    // Only the new user should be created
    assert.equal(second.length, 1);
    assert.equal(second[0].userId, 'parent_dup_2');

    const all = await rsvpService.getForSession('session_dup_1');
    assert.equal(all.length, 2);
  });

  it('returns empty array when creating for empty members list', async () => {
    const created = await rsvpService.createForSession('session_empty_create', []);
    assert.equal(created.length, 0);
  });

  // ---------------------------------------------------------------------------
  // respond
  // ---------------------------------------------------------------------------

  it('returns empty pending list for user without RSVPs (empty path)', async () => {
    const pending = await rsvpService.getPendingForUser('parent_no_rsvp');
    assert.deepEqual(pending, []);
  });

  it('returns err for missing RSVP id (error path)', async () => {
    const result = await rsvpService.respond('rsvp_missing_abc', 'maybe');
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('emits RSVP_RESPONDED event on successful respond', async () => {
    const created = await rsvpService.createForSession('session_evt_1', [
      { userId: 'parent_evt_1', childId: 'child_evt_1' },
    ]);

    let emittedPayload: Record<string, unknown> | null = null;
    eventBus.on(ServiceEvents.RSVP_RESPONDED, (data: unknown) => {
      emittedPayload = data as Record<string, unknown>;
    });

    const result = await rsvpService.respond(created[0].id, 'going');
    assert.equal(result.success, true);

    assert.notEqual(emittedPayload, null, 'RSVP_RESPONDED event should have been emitted');
    assert.equal(emittedPayload!['rsvpId'], created[0].id);
    assert.equal(emittedPayload!['sessionId'], 'session_evt_1');
    assert.equal(emittedPayload!['userId'], 'parent_evt_1');
    assert.equal(emittedPayload!['childId'], 'child_evt_1');
    assert.equal(emittedPayload!['previousStatus'], 'pending');
    assert.equal(emittedPayload!['newStatus'], 'going');
  });

  it('tracks previous status correctly across multiple respond calls', async () => {
    const created = await rsvpService.createForSession('session_multi_resp', [
      { userId: 'parent_multi_1' },
    ]);

    const payloads: Array<Record<string, unknown>> = [];
    eventBus.on(ServiceEvents.RSVP_RESPONDED, (data: unknown) => {
      payloads.push(data as Record<string, unknown>);
    });

    // First respond: pending -> going
    await rsvpService.respond(created[0].id, 'going');
    assert.equal(payloads[0]['previousStatus'], 'pending');
    assert.equal(payloads[0]['newStatus'], 'going');

    // Second respond: going -> maybe
    await rsvpService.respond(created[0].id, 'maybe');
    assert.equal(payloads[1]['previousStatus'], 'going');
    assert.equal(payloads[1]['newStatus'], 'maybe');

    // Third respond: maybe -> not_going
    await rsvpService.respond(created[0].id, 'not_going');
    assert.equal(payloads[2]['previousStatus'], 'maybe');
    assert.equal(payloads[2]['newStatus'], 'not_going');
  });

  it('sets respondedAt timestamp on respond', async () => {
    const created = await rsvpService.createForSession('session_ts_1', [
      { userId: 'parent_ts_1' },
    ]);

    const result = await rsvpService.respond(created[0].id, 'going');
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.data.respondedAt, 'respondedAt should be set');
    // Verify it parses as a valid date
    const ts = new Date(result.data.respondedAt!);
    assert.ok(!isNaN(ts.getTime()), 'respondedAt should be a valid ISO date');
  });

  // ---------------------------------------------------------------------------
  // getBatchCounts
  // ---------------------------------------------------------------------------

  it('returns empty counts for empty session IDs array', async () => {
    const result = await rsvpService.getBatchCounts([]);
    assert.equal(result.size, 0);
  });

  it('returns zeroed counts for a single session with no RSVPs', async () => {
    const result = await rsvpService.getBatchCounts(['session_no_rsvps']);
    assert.equal(result.size, 1);
    const counts = result.get('session_no_rsvps');
    assert.ok(counts);
    assert.equal(counts.going, 0);
    assert.equal(counts.notGoing, 0);
    assert.equal(counts.maybe, 0);
    assert.equal(counts.pending, 0);
  });

  it('returns correct counts for a single session with RSVPs', async () => {
    const created = await rsvpService.createForSession('session_batch_1', [
      { userId: 'p_batch_1' },
      { userId: 'p_batch_2' },
      { userId: 'p_batch_3' },
    ]);

    await rsvpService.respond(created[0].id, 'going');
    await rsvpService.respond(created[1].id, 'not_going');
    // third stays pending

    const result = await rsvpService.getBatchCounts(['session_batch_1']);
    const counts = result.get('session_batch_1')!;
    assert.equal(counts.going, 1);
    assert.equal(counts.notGoing, 1);
    assert.equal(counts.maybe, 0);
    assert.equal(counts.pending, 1);
  });

  it('returns correct counts for multiple sessions', async () => {
    // Session A: 2 RSVPs (1 going, 1 pending)
    const createdA = await rsvpService.createForSession('session_batch_a', [
      { userId: 'p_batchA_1' },
      { userId: 'p_batchA_2' },
    ]);
    await rsvpService.respond(createdA[0].id, 'going');

    // Session B: 3 RSVPs (1 maybe, 2 pending)
    const createdB = await rsvpService.createForSession('session_batch_b', [
      { userId: 'p_batchB_1' },
      { userId: 'p_batchB_2' },
      { userId: 'p_batchB_3' },
    ]);
    await rsvpService.respond(createdB[0].id, 'maybe');

    const result = await rsvpService.getBatchCounts(['session_batch_a', 'session_batch_b']);
    assert.equal(result.size, 2);

    const countsA = result.get('session_batch_a')!;
    assert.equal(countsA.going, 1);
    assert.equal(countsA.pending, 1);
    assert.equal(countsA.maybe, 0);
    assert.equal(countsA.notGoing, 0);

    const countsB = result.get('session_batch_b')!;
    assert.equal(countsB.maybe, 1);
    assert.equal(countsB.pending, 2);
    assert.equal(countsB.going, 0);
    assert.equal(countsB.notGoing, 0);
  });

  it('returns zeroed counts for unknown session IDs (no crash)', async () => {
    // Create some RSVPs for a session NOT in the batch request
    await rsvpService.createForSession('session_other_xyz', [
      { userId: 'p_other_1' },
    ]);

    const result = await rsvpService.getBatchCounts(['session_unknown_1', 'session_unknown_2']);
    assert.equal(result.size, 2);

    const c1 = result.get('session_unknown_1')!;
    assert.equal(c1.going, 0);
    assert.equal(c1.pending, 0);

    const c2 = result.get('session_unknown_2')!;
    assert.equal(c2.going, 0);
    assert.equal(c2.pending, 0);
  });

  it('does not include RSVPs from unrequested sessions in batch counts', async () => {
    await rsvpService.createForSession('session_incl_1', [
      { userId: 'p_incl_1' },
    ]);
    const createdB = await rsvpService.createForSession('session_incl_2', [
      { userId: 'p_incl_2' },
    ]);
    await rsvpService.respond(createdB[0].id, 'going');

    // Only request session_incl_1
    const result = await rsvpService.getBatchCounts(['session_incl_1']);
    assert.equal(result.size, 1);
    const counts = result.get('session_incl_1')!;
    assert.equal(counts.pending, 1);
    assert.equal(counts.going, 0); // session_incl_2's going should NOT leak
  });

  // ---------------------------------------------------------------------------
  // getSessionCounts
  // ---------------------------------------------------------------------------

  it('returns all zeroes for session with no RSVPs', async () => {
    const counts = await rsvpService.getSessionCounts('session_zero_counts');
    assert.equal(counts.going, 0);
    assert.equal(counts.notGoing, 0);
    assert.equal(counts.maybe, 0);
    assert.equal(counts.pending, 0);
  });

  // ---------------------------------------------------------------------------
  // deleteForSession
  // ---------------------------------------------------------------------------

  it('deletes all RSVPs for a session', async () => {
    await rsvpService.createForSession('session_del_1', [
      { userId: 'p_del_1' },
      { userId: 'p_del_2' },
    ]);
    await rsvpService.createForSession('session_del_other', [
      { userId: 'p_del_3' },
    ]);

    await rsvpService.deleteForSession('session_del_1');

    const deleted = await rsvpService.getForSession('session_del_1');
    assert.equal(deleted.length, 0);

    // Other session should be unaffected
    const other = await rsvpService.getForSession('session_del_other');
    assert.equal(other.length, 1);
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------

  it('returns null for non-existent RSVP ID', async () => {
    const result = await rsvpService.getById('rsvp_nonexistent_xyz');
    assert.equal(result, null);
  });

  it('returns the correct RSVP by ID', async () => {
    const created = await rsvpService.createForSession('session_byid_1', [
      { userId: 'p_byid_1', childId: 'c_byid_1' },
    ]);

    const found = await rsvpService.getById(created[0].id);
    assert.ok(found);
    assert.equal(found.userId, 'p_byid_1');
    assert.equal(found.childId, 'c_byid_1');
    assert.equal(found.sessionId, 'session_byid_1');
  });

  // ---------------------------------------------------------------------------
  // Concurrent / edge cases
  // ---------------------------------------------------------------------------

  it('handles sequential respond calls to different RSVPs in same session', async () => {
    const created = await rsvpService.createForSession('session_concurrent_1', [
      { userId: 'p_conc_1' },
      { userId: 'p_conc_2' },
      { userId: 'p_conc_3' },
    ]);

    // Respond to all three sequentially
    const r1 = await rsvpService.respond(created[0].id, 'going');
    const r2 = await rsvpService.respond(created[1].id, 'maybe');
    const r3 = await rsvpService.respond(created[2].id, 'not_going');

    assert.equal(r1.success, true);
    assert.equal(r2.success, true);
    assert.equal(r3.success, true);

    const counts = await rsvpService.getSessionCounts('session_concurrent_1');
    assert.equal(counts.going, 1);
    assert.equal(counts.maybe, 1);
    assert.equal(counts.notGoing, 1);
    assert.equal(counts.pending, 0);
  });
});
