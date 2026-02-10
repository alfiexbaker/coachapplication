"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const squad_invite_service_1 = require("@/services/invite/squad-invite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('SquadInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY);
    });
    (0, node_test_1.describe)('getSquadInvites', () => {
        (0, node_test_1.it)('should return empty array when no invites exist', async () => {
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const invites = await squad_invite_service_1.squadInviteService.getSquadInvites(squadId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by squadId', async () => {
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const invite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                targetType: 'SESSION',
                targetId: 'test-session-' + Math.random().toString(36).slice(2),
                targetTitle: 'Test Session',
                invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 10,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 10,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [invite]);
            const invites = await squad_invite_service_1.squadInviteService.getSquadInvites(squadId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].squadId, squadId);
        });
    });
    (0, node_test_1.describe)('getSquadInvitesByTarget', () => {
        (0, node_test_1.it)('should return empty array for target with no invites', async () => {
            const targetId = 'test-target-' + Math.random().toString(36).slice(2);
            const invites = await squad_invite_service_1.squadInviteService.getSquadInvitesByTarget(targetId, 'SESSION');
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by targetId and targetType', async () => {
            const targetId = 'test-session-' + Math.random().toString(36).slice(2);
            const invites = [
                {
                    id: 'test-invite-1-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-1-' + Math.random().toString(36).slice(2),
                    squadName: 'Squad 1',
                    targetType: 'SESSION',
                    targetId,
                    targetTitle: 'Test Session',
                    invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 10,
                    responses: { accepted: 0, declined: 0, pending: 10 },
                },
                {
                    id: 'test-invite-2-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-2-' + Math.random().toString(36).slice(2),
                    squadName: 'Squad 2',
                    targetType: 'EVENT',
                    targetId,
                    targetTitle: 'Test Event',
                    invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 15,
                    responses: { accepted: 0, declined: 0, pending: 15 },
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, invites);
            const sessionInvites = await squad_invite_service_1.squadInviteService.getSquadInvitesByTarget(targetId, 'SESSION');
            strict_1.default.equal(sessionInvites.length, 1);
            strict_1.default.equal(sessionInvites[0].targetType, 'SESSION');
        });
    });
    (0, node_test_1.describe)('getInviteHistory', () => {
        (0, node_test_1.it)('should return empty array when no history exists', async () => {
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const history = await squad_invite_service_1.squadInviteService.getInviteHistory(squadId);
            strict_1.default.equal(history.length, 0);
        });
        (0, node_test_1.it)('should filter history by squadId', async () => {
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const historyEntry = {
                id: 'test-history-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                sessionType: '1-on-1',
                focus: 'Skills',
                sentAt: new Date().toISOString(),
                sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
                sentByName: 'Test Coach',
                inviteCount: 10,
                acceptedCount: 5,
                declinedCount: 2,
                pendingCount: 3,
                status: 'ACTIVE',
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, [historyEntry]);
            const history = await squad_invite_service_1.squadInviteService.getInviteHistory(squadId);
            strict_1.default.equal(history.length, 1);
            strict_1.default.equal(history[0].squadId, squadId);
        });
    });
    (0, node_test_1.describe)('addToInviteHistory', () => {
        (0, node_test_1.it)('should add new history entry', async () => {
            const historyEntry = {
                id: 'test-history-' + Math.random().toString(36).slice(2),
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                sessionType: '1-on-1',
                focus: 'Passing',
                sentAt: new Date().toISOString(),
                sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
                sentByName: 'Test Coach',
                inviteCount: 8,
                acceptedCount: 0,
                declinedCount: 0,
                pendingCount: 8,
                status: 'ACTIVE',
            };
            await squad_invite_service_1.squadInviteService.addToInviteHistory(historyEntry);
            const history = await squad_invite_service_1.squadInviteService.getInviteHistory(historyEntry.squadId);
            strict_1.default.equal(history.length, 1);
            strict_1.default.equal(history[0].id, historyEntry.id);
        });
        (0, node_test_1.it)('should append to existing history', async () => {
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const entry1 = {
                id: 'test-history-1-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                sessionId: 'test-session-1-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Session 1',
                sessionType: '1-on-1',
                focus: 'Skills',
                sentAt: new Date().toISOString(),
                sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
                sentByName: 'Test Coach',
                inviteCount: 5,
                acceptedCount: 0,
                declinedCount: 0,
                pendingCount: 5,
                status: 'ACTIVE',
            };
            const entry2 = {
                id: 'test-history-2-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                sessionId: 'test-session-2-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Session 2',
                sessionType: 'Group',
                focus: 'Tactics',
                sentAt: new Date().toISOString(),
                sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
                sentByName: 'Test Coach',
                inviteCount: 10,
                acceptedCount: 0,
                declinedCount: 0,
                pendingCount: 10,
                status: 'ACTIVE',
            };
            await squad_invite_service_1.squadInviteService.addToInviteHistory(entry1);
            await squad_invite_service_1.squadInviteService.addToInviteHistory(entry2);
            const history = await squad_invite_service_1.squadInviteService.getInviteHistory(squadId);
            strict_1.default.equal(history.length, 2);
        });
    });
    (0, node_test_1.describe)('updateHistoryStatus', () => {
        (0, node_test_1.it)('should update history entry status', async () => {
            const historyId = 'test-history-' + Math.random().toString(36).slice(2);
            const historyEntry = {
                id: historyId,
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                sessionId: 'test-session-' + Math.random().toString(36).slice(2),
                sessionTitle: 'Test Session',
                sessionType: '1-on-1',
                focus: 'Defense',
                sentAt: new Date().toISOString(),
                sentBy: 'test-coach-' + Math.random().toString(36).slice(2),
                sentByName: 'Test Coach',
                inviteCount: 10,
                acceptedCount: 0,
                declinedCount: 0,
                pendingCount: 10,
                status: 'ACTIVE',
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, [historyEntry]);
            await squad_invite_service_1.squadInviteService.updateHistoryStatus(historyId, 'COMPLETED');
            const allHistory = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
            const updated = allHistory.find((h) => h.id === historyId);
            strict_1.default.equal(updated?.status, 'COMPLETED');
        });
        (0, node_test_1.it)('should handle non-existent history entry gracefully', async () => {
            await squad_invite_service_1.squadInviteService.updateHistoryStatus('non-existent-id', 'COMPLETED');
            // Should not throw
            const allHistory = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
            strict_1.default.equal(allHistory.length, 0);
        });
    });
});
