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
        await squad_invite_service_1.squadInviteService.clearCache();
    });
    (0, node_test_1.describe)('getSquadInvitesForTarget', () => {
        (0, node_test_1.it)('filters invites by target type and target id', async () => {
            const targetId = `session-${Math.random().toString(36).slice(2)}`;
            const invites = [
                {
                    id: `invite-${Math.random().toString(36).slice(2)}`,
                    squadId: `squad-${Math.random().toString(36).slice(2)}`,
                    targetType: 'SESSION',
                    targetId,
                    invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
                    invitedAt: new Date().toISOString(),
                    memberCount: 10,
                    responses: { accepted: 3, declined: 1, pending: 6 },
                },
                {
                    id: `invite-${Math.random().toString(36).slice(2)}`,
                    squadId: `squad-${Math.random().toString(36).slice(2)}`,
                    targetType: 'EVENT',
                    targetId,
                    invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
                    invitedAt: new Date().toISOString(),
                    memberCount: 8,
                    responses: { accepted: 2, declined: 1, pending: 5 },
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, invites);
            const filtered = await squad_invite_service_1.squadInviteService.getSquadInvitesForTarget('SESSION', targetId);
            strict_1.default.equal(filtered.length, 1);
            strict_1.default.equal(filtered[0]?.targetType, 'SESSION');
            strict_1.default.equal(filtered[0]?.targetId, targetId);
        });
    });
    (0, node_test_1.describe)('getSquadInvitesByCoach', () => {
        (0, node_test_1.it)('returns only invites sent by the selected coach', async () => {
            const coachId = `coach-${Math.random().toString(36).slice(2)}`;
            const invites = [
                {
                    id: `invite-${Math.random().toString(36).slice(2)}`,
                    squadId: `squad-${Math.random().toString(36).slice(2)}`,
                    targetType: 'SESSION',
                    targetId: `session-${Math.random().toString(36).slice(2)}`,
                    invitedBy: coachId,
                    invitedAt: new Date().toISOString(),
                    memberCount: 6,
                    responses: { accepted: 1, declined: 1, pending: 4 },
                },
                {
                    id: `invite-${Math.random().toString(36).slice(2)}`,
                    squadId: `squad-${Math.random().toString(36).slice(2)}`,
                    targetType: 'MATCH',
                    targetId: `match-${Math.random().toString(36).slice(2)}`,
                    invitedBy: `coach-${Math.random().toString(36).slice(2)}`,
                    invitedAt: new Date().toISOString(),
                    memberCount: 7,
                    responses: { accepted: 2, declined: 0, pending: 5 },
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, invites);
            const filtered = await squad_invite_service_1.squadInviteService.getSquadInvitesByCoach(coachId);
            strict_1.default.equal(filtered.length, 1);
            strict_1.default.equal(filtered[0]?.invitedBy, coachId);
        });
    });
    (0, node_test_1.describe)('invite history', () => {
        (0, node_test_1.it)('adds and retrieves squad invite history in descending sentAt order', async () => {
            const squadId = `squad-${Math.random().toString(36).slice(2)}`;
            const olderEntry = {
                id: `history-${Math.random().toString(36).slice(2)}`,
                squadId,
                sessionId: `session-${Math.random().toString(36).slice(2)}`,
                sessionType: 'Group',
                focus: 'Passing',
                sentAt: '2026-01-01T09:00:00.000Z',
                sentBy: `coach-${Math.random().toString(36).slice(2)}`,
                inviteCount: 8,
                acceptedCount: 2,
                declinedCount: 1,
                pendingCount: 5,
                status: 'ACTIVE',
            };
            const newerEntry = {
                ...olderEntry,
                id: `history-${Math.random().toString(36).slice(2)}`,
                sentAt: '2026-01-02T09:00:00.000Z',
            };
            await squad_invite_service_1.squadInviteService.addToInviteHistory(olderEntry);
            await squad_invite_service_1.squadInviteService.addToInviteHistory(newerEntry);
            const history = await squad_invite_service_1.squadInviteService.getSquadInviteHistory(squadId);
            strict_1.default.equal(history.length, 2);
            strict_1.default.equal(history[0]?.id, newerEntry.id);
            strict_1.default.equal(history[1]?.id, olderEntry.id);
        });
    });
    (0, node_test_1.describe)('updateInviteHistoryEntry', () => {
        (0, node_test_1.it)('updates history status and counts', async () => {
            const entry = {
                id: `history-${Math.random().toString(36).slice(2)}`,
                squadId: `squad-${Math.random().toString(36).slice(2)}`,
                sessionId: `session-${Math.random().toString(36).slice(2)}`,
                sessionType: '1:1',
                focus: 'Defending',
                sentAt: new Date().toISOString(),
                sentBy: `coach-${Math.random().toString(36).slice(2)}`,
                inviteCount: 4,
                acceptedCount: 0,
                declinedCount: 0,
                pendingCount: 4,
                status: 'ACTIVE',
            };
            await squad_invite_service_1.squadInviteService.addToInviteHistory(entry);
            await squad_invite_service_1.squadInviteService.updateInviteHistoryEntry(entry.id, {
                acceptedCount: 3,
                declinedCount: 1,
                pendingCount: 0,
                status: 'COMPLETED',
            });
            const history = await squad_invite_service_1.squadInviteService.getSquadInviteHistory(entry.squadId);
            strict_1.default.equal(history.length, 1);
            strict_1.default.equal(history[0]?.status, 'COMPLETED');
            strict_1.default.equal(history[0]?.acceptedCount, 3);
            strict_1.default.equal(history[0]?.pendingCount, 0);
        });
    });
    (0, node_test_1.describe)('getSquadInviteStats', () => {
        (0, node_test_1.it)('aggregates counts and acceptance rate from history entries', async () => {
            const squadId = `squad-${Math.random().toString(36).slice(2)}`;
            await squad_invite_service_1.squadInviteService.addToInviteHistory({
                id: `history-${Math.random().toString(36).slice(2)}`,
                squadId,
                sessionId: `session-${Math.random().toString(36).slice(2)}`,
                sessionType: 'Group',
                focus: 'Attacking',
                sentAt: '2026-01-01T09:00:00.000Z',
                sentBy: `coach-${Math.random().toString(36).slice(2)}`,
                inviteCount: 10,
                acceptedCount: 6,
                declinedCount: 2,
                pendingCount: 2,
                status: 'COMPLETED',
            });
            await squad_invite_service_1.squadInviteService.addToInviteHistory({
                id: `history-${Math.random().toString(36).slice(2)}`,
                squadId,
                sessionId: `session-${Math.random().toString(36).slice(2)}`,
                sessionType: 'Group',
                focus: 'Transition',
                sentAt: '2026-01-02T09:00:00.000Z',
                sentBy: `coach-${Math.random().toString(36).slice(2)}`,
                inviteCount: 5,
                acceptedCount: 2,
                declinedCount: 1,
                pendingCount: 2,
                status: 'ACTIVE',
            });
            const stats = await squad_invite_service_1.squadInviteService.getSquadInviteStats(squadId);
            strict_1.default.equal(stats.totalInvitesSent, 15);
            strict_1.default.equal(stats.totalAccepted, 8);
            strict_1.default.equal(stats.totalDeclined, 3);
            strict_1.default.equal(stats.lastInviteSentAt, '2026-01-02T09:00:00.000Z');
            strict_1.default.ok(Math.abs(stats.acceptanceRate - 72.72727272727273) < 0.0001);
        });
    });
});
