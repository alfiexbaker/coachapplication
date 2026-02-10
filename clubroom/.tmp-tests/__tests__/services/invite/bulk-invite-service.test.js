"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const bulk_invite_service_1 = require("@/services/invite/bulk-invite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('BulkInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_SESSION_INVITES);
    });
    (0, node_test_1.describe)('createBulk', () => {
        (0, node_test_1.it)('should create multiple session invites successfully', async () => {
            const inputs = [
                {
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-1-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Athlete One'],
                    parentId: 'test-parent-1-' + Math.random().toString(36).slice(2),
                    parentName: 'Parent One',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Shooting',
                    expiresInDays: 7,
                },
                {
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-2-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Athlete Two'],
                    parentId: 'test-parent-2-' + Math.random().toString(36).slice(2),
                    parentName: 'Parent Two',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Shooting',
                    expiresInDays: 7,
                },
            ];
            const result = await bulk_invite_service_1.bulkInviteService.createBulk(inputs);
            strict_1.default.equal(result.successful.length, 2);
            strict_1.default.equal(result.failed.length, 0);
            strict_1.default.ok(result.groupId);
        });
        (0, node_test_1.it)('should return groupId for all invites', async () => {
            const inputs = [
                {
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Test Athlete'],
                    parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                    parentName: 'Test Parent',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Dribbling',
                },
            ];
            const result = await bulk_invite_service_1.bulkInviteService.createBulk(inputs);
            strict_1.default.ok(result.groupId);
            strict_1.default.equal(result.successful[0].groupId, result.groupId);
        });
        (0, node_test_1.it)('should handle empty inputs array', async () => {
            const result = await bulk_invite_service_1.bulkInviteService.createBulk([]);
            strict_1.default.equal(result.successful.length, 0);
            strict_1.default.equal(result.failed.length, 0);
        });
    });
    (0, node_test_1.describe)('getGroupInvites', () => {
        (0, node_test_1.it)('should retrieve invites by groupId', async () => {
            const inputs = [
                {
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Test Athlete'],
                    parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                    parentName: 'Test Parent',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Passing',
                    groupId: 'test-group-' + Math.random().toString(36).slice(2),
                },
            ];
            const createResult = await bulk_invite_service_1.bulkInviteService.createBulk(inputs);
            const groupId = createResult.groupId;
            const invites = await bulk_invite_service_1.bulkInviteService.getGroupInvites(groupId);
            strict_1.default.ok(invites.length > 0);
            strict_1.default.equal(invites[0].groupId, groupId);
        });
        (0, node_test_1.it)('should return empty array for non-existent groupId', async () => {
            const invites = await bulk_invite_service_1.bulkInviteService.getGroupInvites('non-existent-group');
            strict_1.default.equal(invites.length, 0);
        });
    });
    (0, node_test_1.describe)('getGroupStats', () => {
        (0, node_test_1.it)('should return stats for a group', async () => {
            const inputs = [
                {
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Test Athlete'],
                    parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                    parentName: 'Test Parent',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Tactics',
                },
            ];
            const createResult = await bulk_invite_service_1.bulkInviteService.createBulk(inputs);
            const stats = await bulk_invite_service_1.bulkInviteService.getGroupStats(createResult.groupId);
            strict_1.default.equal(stats.total, 1);
            strict_1.default.equal(stats.pending, 1);
            strict_1.default.equal(stats.accepted, 0);
            strict_1.default.equal(stats.declined, 0);
        });
        (0, node_test_1.it)('should return zero stats for non-existent group', async () => {
            const stats = await bulk_invite_service_1.bulkInviteService.getGroupStats('non-existent-group');
            strict_1.default.equal(stats.total, 0);
            strict_1.default.equal(stats.pending, 0);
            strict_1.default.equal(stats.accepted, 0);
            strict_1.default.equal(stats.declined, 0);
        });
    });
    (0, node_test_1.describe)('createBulkInvite', () => {
        (0, node_test_1.it)('should return err() for non-existent squad', async () => {
            const input = {
                squadId: 'non-existent-squad',
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Skills',
            };
            const result = await bulk_invite_service_1.bulkInviteService.createBulkInvite(input);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('inviteSelectedMembers', () => {
        (0, node_test_1.it)('should return err() for empty memberIds array', async () => {
            const input = {
                memberIds: [],
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Defense',
            };
            const result = await bulk_invite_service_1.bulkInviteService.inviteSelectedMembers(input);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.it)('should return err() for invalid member IDs', async () => {
            const input = {
                memberIds: ['invalid-member-1', 'invalid-member-2'],
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Attack',
            };
            const result = await bulk_invite_service_1.bulkInviteService.inviteSelectedMembers(input);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
    });
});
