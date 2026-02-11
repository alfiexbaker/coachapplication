"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const roster_service_1 = require("@/services/roster-service");
let sequence = 0;
function nextSuffix() {
    sequence += 1;
    return `${sequence}`;
}
function buildRosterInput(coachId, athleteId, parentId) {
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
(0, node_test_1.describe)('rosterService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ROSTER_REMOVAL_HISTORY);
    });
    (0, node_test_1.it)('creates entry and returns it in getRoster (happy path)', async () => {
        const suffix = nextSuffix();
        const coachId = `coach-roster-${suffix}`;
        const athleteId = `athlete-roster-${suffix}`;
        const createResult = await roster_service_1.rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));
        strict_1.default.equal(createResult.success, true);
        const roster = await roster_service_1.rosterService.getRoster(coachId);
        strict_1.default.equal(roster.some((entry) => entry.athleteId === athleteId), true);
    });
    (0, node_test_1.it)('returns empty roster search results when query does not match (empty path)', async () => {
        const suffix = nextSuffix();
        const coachId = `coach-roster-${suffix}`;
        await roster_service_1.rosterService.create(buildRosterInput(coachId, `athlete-roster-${suffix}`, `parent-roster-${suffix}`));
        const filtered = await roster_service_1.rosterService.getRoster(coachId, { search: 'no-match-search-term' });
        strict_1.default.deepEqual(filtered, []);
    });
    (0, node_test_1.it)('returns err when updating status for missing athlete (error path)', async () => {
        const result = await roster_service_1.rosterService.updateStatus('coach-roster-missing', 'athlete-missing', 'PAUSED');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.it)('adds, updates, and deletes notes for an athlete', async () => {
        const suffix = nextSuffix();
        const coachId = `coach-roster-${suffix}`;
        const athleteId = `athlete-roster-${suffix}`;
        await roster_service_1.rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));
        const note = await roster_service_1.rosterService.addNote(coachId, athleteId, 'Initial note');
        strict_1.default.equal(note.content, 'Initial note');
        const updateResult = await roster_service_1.rosterService.updateNote(coachId, athleteId, note.id, 'Updated note');
        strict_1.default.equal(updateResult.success, true);
        if (updateResult.success) {
            strict_1.default.equal(updateResult.data.content, 'Updated note');
        }
        await roster_service_1.rosterService.deleteNote(coachId, athleteId, note.id);
        const entry = await roster_service_1.rosterService.getRosterEntry(coachId, athleteId);
        strict_1.default.ok(entry);
        strict_1.default.equal(entry?.notes.length, 0);
    });
    (0, node_test_1.it)('removes athlete to history and restores via undo', async () => {
        const suffix = nextSuffix();
        const coachId = `coach-roster-${suffix}`;
        const athleteId = `athlete-roster-${suffix}`;
        await roster_service_1.rosterService.create(buildRosterInput(coachId, athleteId, `parent-roster-${suffix}`));
        const removeResult = await roster_service_1.rosterService.removeAthlete(coachId, athleteId, 'INACTIVE', {
            archive: true,
            customReason: 'No attendance',
        });
        strict_1.default.equal(removeResult.success, true);
        if (!removeResult.success)
            return;
        const history = await roster_service_1.rosterService.getRemovalHistory(coachId);
        strict_1.default.equal(history.length, 1);
        strict_1.default.equal(history[0].athleteId, athleteId);
        const undoResult = await roster_service_1.rosterService.undoRemoval(coachId, removeResult.data.id);
        strict_1.default.equal(undoResult.success, true);
        if (!undoResult.success)
            return;
        const restored = await roster_service_1.rosterService.getRosterEntry(coachId, athleteId);
        strict_1.default.ok(restored);
        strict_1.default.equal(restored?.athleteId, athleteId);
    });
    (0, node_test_1.it)('returns err when updating primary focus for missing athlete', async () => {
        const result = await roster_service_1.rosterService.updatePrimaryFocus('coach-roster-missing', 'athlete-roster-missing', 'Finishing');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
});
