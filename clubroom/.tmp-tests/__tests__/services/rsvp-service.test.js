"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const rsvp_service_1 = require("@/services/rsvp-service");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('rsvpService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_RSVPS);
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // createForSession
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('creates RSVPs for a session and responds successfully (happy path)', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_rsvp_1', [
            { userId: 'parent_rsvp_1', childId: 'athlete_rsvp_1' },
            { userId: 'parent_rsvp_2' },
        ]);
        strict_1.default.equal(created.length, 2);
        const response = await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        strict_1.default.equal(response.success, true);
        if (!response.success)
            return;
        strict_1.default.equal(response.data.status, 'going');
        const counts = await rsvp_service_1.rsvpService.getSessionCounts('session_rsvp_1');
        strict_1.default.equal(counts.going, 1);
        strict_1.default.equal(counts.pending, 1);
    });
    (0, node_test_1.it)('does not create duplicate RSVPs for same user + session', async () => {
        await rsvp_service_1.rsvpService.createForSession('session_dup_1', [
            { userId: 'parent_dup_1' },
        ]);
        const second = await rsvp_service_1.rsvpService.createForSession('session_dup_1', [
            { userId: 'parent_dup_1' },
            { userId: 'parent_dup_2' },
        ]);
        // Only the new user should be created
        strict_1.default.equal(second.length, 1);
        strict_1.default.equal(second[0].userId, 'parent_dup_2');
        const all = await rsvp_service_1.rsvpService.getForSession('session_dup_1');
        strict_1.default.equal(all.length, 2);
    });
    (0, node_test_1.it)('returns empty array when creating for empty members list', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_empty_create', []);
        strict_1.default.equal(created.length, 0);
    });
    // ---------------------------------------------------------------------------
    // respond
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('returns empty pending list for user without RSVPs (empty path)', async () => {
        const pending = await rsvp_service_1.rsvpService.getPendingForUser('parent_no_rsvp');
        strict_1.default.deepEqual(pending, []);
    });
    (0, node_test_1.it)('returns err for missing RSVP id (error path)', async () => {
        const result = await rsvp_service_1.rsvpService.respond('rsvp_missing_abc', 'maybe');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.it)('emits RSVP_RESPONDED event on successful respond', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_evt_1', [
            { userId: 'parent_evt_1', childId: 'child_evt_1' },
        ]);
        let emittedPayload = null;
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.RSVP_RESPONDED, (data) => {
            emittedPayload = data;
        });
        const result = await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        strict_1.default.equal(result.success, true);
        strict_1.default.notEqual(emittedPayload, null, 'RSVP_RESPONDED event should have been emitted');
        strict_1.default.equal(emittedPayload['rsvpId'], created[0].id);
        strict_1.default.equal(emittedPayload['sessionId'], 'session_evt_1');
        strict_1.default.equal(emittedPayload['userId'], 'parent_evt_1');
        strict_1.default.equal(emittedPayload['childId'], 'child_evt_1');
        strict_1.default.equal(emittedPayload['previousStatus'], 'pending');
        strict_1.default.equal(emittedPayload['newStatus'], 'going');
    });
    (0, node_test_1.it)('tracks previous status correctly across multiple respond calls', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_multi_resp', [
            { userId: 'parent_multi_1' },
        ]);
        const payloads = [];
        event_bus_1.eventBus.on(event_bus_1.ServiceEvents.RSVP_RESPONDED, (data) => {
            payloads.push(data);
        });
        // First respond: pending -> going
        await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        strict_1.default.equal(payloads[0]['previousStatus'], 'pending');
        strict_1.default.equal(payloads[0]['newStatus'], 'going');
        // Second respond: going -> maybe
        await rsvp_service_1.rsvpService.respond(created[0].id, 'maybe');
        strict_1.default.equal(payloads[1]['previousStatus'], 'going');
        strict_1.default.equal(payloads[1]['newStatus'], 'maybe');
        // Third respond: maybe -> not_going
        await rsvp_service_1.rsvpService.respond(created[0].id, 'not_going');
        strict_1.default.equal(payloads[2]['previousStatus'], 'maybe');
        strict_1.default.equal(payloads[2]['newStatus'], 'not_going');
    });
    (0, node_test_1.it)('sets respondedAt timestamp on respond', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_ts_1', [
            { userId: 'parent_ts_1' },
        ]);
        const result = await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.ok(result.data.respondedAt, 'respondedAt should be set');
        // Verify it parses as a valid date
        const ts = new Date(result.data.respondedAt);
        strict_1.default.ok(!isNaN(ts.getTime()), 'respondedAt should be a valid ISO date');
    });
    // ---------------------------------------------------------------------------
    // getBatchCounts
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('returns empty counts for empty session IDs array', async () => {
        const result = await rsvp_service_1.rsvpService.getBatchCounts([]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.it)('returns zeroed counts for a single session with no RSVPs', async () => {
        const result = await rsvp_service_1.rsvpService.getBatchCounts(['session_no_rsvps']);
        strict_1.default.equal(result.size, 1);
        const counts = result.get('session_no_rsvps');
        strict_1.default.ok(counts);
        strict_1.default.equal(counts.going, 0);
        strict_1.default.equal(counts.notGoing, 0);
        strict_1.default.equal(counts.maybe, 0);
        strict_1.default.equal(counts.pending, 0);
    });
    (0, node_test_1.it)('returns correct counts for a single session with RSVPs', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_batch_1', [
            { userId: 'p_batch_1' },
            { userId: 'p_batch_2' },
            { userId: 'p_batch_3' },
        ]);
        await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        await rsvp_service_1.rsvpService.respond(created[1].id, 'not_going');
        // third stays pending
        const result = await rsvp_service_1.rsvpService.getBatchCounts(['session_batch_1']);
        const counts = result.get('session_batch_1');
        strict_1.default.equal(counts.going, 1);
        strict_1.default.equal(counts.notGoing, 1);
        strict_1.default.equal(counts.maybe, 0);
        strict_1.default.equal(counts.pending, 1);
    });
    (0, node_test_1.it)('returns correct counts for multiple sessions', async () => {
        // Session A: 2 RSVPs (1 going, 1 pending)
        const createdA = await rsvp_service_1.rsvpService.createForSession('session_batch_a', [
            { userId: 'p_batchA_1' },
            { userId: 'p_batchA_2' },
        ]);
        await rsvp_service_1.rsvpService.respond(createdA[0].id, 'going');
        // Session B: 3 RSVPs (1 maybe, 2 pending)
        const createdB = await rsvp_service_1.rsvpService.createForSession('session_batch_b', [
            { userId: 'p_batchB_1' },
            { userId: 'p_batchB_2' },
            { userId: 'p_batchB_3' },
        ]);
        await rsvp_service_1.rsvpService.respond(createdB[0].id, 'maybe');
        const result = await rsvp_service_1.rsvpService.getBatchCounts(['session_batch_a', 'session_batch_b']);
        strict_1.default.equal(result.size, 2);
        const countsA = result.get('session_batch_a');
        strict_1.default.equal(countsA.going, 1);
        strict_1.default.equal(countsA.pending, 1);
        strict_1.default.equal(countsA.maybe, 0);
        strict_1.default.equal(countsA.notGoing, 0);
        const countsB = result.get('session_batch_b');
        strict_1.default.equal(countsB.maybe, 1);
        strict_1.default.equal(countsB.pending, 2);
        strict_1.default.equal(countsB.going, 0);
        strict_1.default.equal(countsB.notGoing, 0);
    });
    (0, node_test_1.it)('returns zeroed counts for unknown session IDs (no crash)', async () => {
        // Create some RSVPs for a session NOT in the batch request
        await rsvp_service_1.rsvpService.createForSession('session_other_xyz', [
            { userId: 'p_other_1' },
        ]);
        const result = await rsvp_service_1.rsvpService.getBatchCounts(['session_unknown_1', 'session_unknown_2']);
        strict_1.default.equal(result.size, 2);
        const c1 = result.get('session_unknown_1');
        strict_1.default.equal(c1.going, 0);
        strict_1.default.equal(c1.pending, 0);
        const c2 = result.get('session_unknown_2');
        strict_1.default.equal(c2.going, 0);
        strict_1.default.equal(c2.pending, 0);
    });
    (0, node_test_1.it)('does not include RSVPs from unrequested sessions in batch counts', async () => {
        await rsvp_service_1.rsvpService.createForSession('session_incl_1', [
            { userId: 'p_incl_1' },
        ]);
        const createdB = await rsvp_service_1.rsvpService.createForSession('session_incl_2', [
            { userId: 'p_incl_2' },
        ]);
        await rsvp_service_1.rsvpService.respond(createdB[0].id, 'going');
        // Only request session_incl_1
        const result = await rsvp_service_1.rsvpService.getBatchCounts(['session_incl_1']);
        strict_1.default.equal(result.size, 1);
        const counts = result.get('session_incl_1');
        strict_1.default.equal(counts.pending, 1);
        strict_1.default.equal(counts.going, 0); // session_incl_2's going should NOT leak
    });
    // ---------------------------------------------------------------------------
    // getSessionCounts
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('returns all zeroes for session with no RSVPs', async () => {
        const counts = await rsvp_service_1.rsvpService.getSessionCounts('session_zero_counts');
        strict_1.default.equal(counts.going, 0);
        strict_1.default.equal(counts.notGoing, 0);
        strict_1.default.equal(counts.maybe, 0);
        strict_1.default.equal(counts.pending, 0);
    });
    // ---------------------------------------------------------------------------
    // deleteForSession
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('deletes all RSVPs for a session', async () => {
        await rsvp_service_1.rsvpService.createForSession('session_del_1', [
            { userId: 'p_del_1' },
            { userId: 'p_del_2' },
        ]);
        await rsvp_service_1.rsvpService.createForSession('session_del_other', [
            { userId: 'p_del_3' },
        ]);
        await rsvp_service_1.rsvpService.deleteForSession('session_del_1');
        const deleted = await rsvp_service_1.rsvpService.getForSession('session_del_1');
        strict_1.default.equal(deleted.length, 0);
        // Other session should be unaffected
        const other = await rsvp_service_1.rsvpService.getForSession('session_del_other');
        strict_1.default.equal(other.length, 1);
    });
    // ---------------------------------------------------------------------------
    // getById
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('returns null for non-existent RSVP ID', async () => {
        const result = await rsvp_service_1.rsvpService.getById('rsvp_nonexistent_xyz');
        strict_1.default.equal(result, null);
    });
    (0, node_test_1.it)('returns the correct RSVP by ID', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_byid_1', [
            { userId: 'p_byid_1', childId: 'c_byid_1' },
        ]);
        const found = await rsvp_service_1.rsvpService.getById(created[0].id);
        strict_1.default.ok(found);
        strict_1.default.equal(found.userId, 'p_byid_1');
        strict_1.default.equal(found.childId, 'c_byid_1');
        strict_1.default.equal(found.sessionId, 'session_byid_1');
    });
    // ---------------------------------------------------------------------------
    // Concurrent / edge cases
    // ---------------------------------------------------------------------------
    (0, node_test_1.it)('handles sequential respond calls to different RSVPs in same session', async () => {
        const created = await rsvp_service_1.rsvpService.createForSession('session_concurrent_1', [
            { userId: 'p_conc_1' },
            { userId: 'p_conc_2' },
            { userId: 'p_conc_3' },
        ]);
        // Respond to all three sequentially
        const r1 = await rsvp_service_1.rsvpService.respond(created[0].id, 'going');
        const r2 = await rsvp_service_1.rsvpService.respond(created[1].id, 'maybe');
        const r3 = await rsvp_service_1.rsvpService.respond(created[2].id, 'not_going');
        strict_1.default.equal(r1.success, true);
        strict_1.default.equal(r2.success, true);
        strict_1.default.equal(r3.success, true);
        const counts = await rsvp_service_1.rsvpService.getSessionCounts('session_concurrent_1');
        strict_1.default.equal(counts.going, 1);
        strict_1.default.equal(counts.maybe, 1);
        strict_1.default.equal(counts.notGoing, 1);
        strict_1.default.equal(counts.pending, 0);
    });
});
