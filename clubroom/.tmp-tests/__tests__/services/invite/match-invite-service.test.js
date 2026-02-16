"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const match_invite_service_1 = require("@/services/invite/match-invite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('MatchInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.MATCHES);
    });
    (0, node_test_1.describe)('getMatchInvites', () => {
        (0, node_test_1.it)('should return empty array for match with no invites', async () => {
            const matchId = 'test-match-' + Math.random().toString(36).slice(2);
            const invites = await match_invite_service_1.matchInviteService.getMatchInvites(matchId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by matchId', async () => {
            const matchId = 'test-match-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                targetType: 'MATCH',
                targetId: matchId,
                targetTitle: 'vs Test Opponent',
                invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 11,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 11,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            const invites = await match_invite_service_1.matchInviteService.getMatchInvites(matchId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].targetId, matchId);
            strict_1.default.equal(invites[0].targetType, 'MATCH');
        });
    });
    (0, node_test_1.describe)('getCoachMatchInvites', () => {
        (0, node_test_1.it)('should return empty array for coach with no invites', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const invites = await match_invite_service_1.matchInviteService.getCoachMatchInvites(coachId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by coach ID', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                targetType: 'MATCH',
                targetId: 'test-match-' + Math.random().toString(36).slice(2),
                targetTitle: '@ Test Opponent',
                invitedBy: coachId,
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 15,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 15,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            const invites = await match_invite_service_1.matchInviteService.getCoachMatchInvites(coachId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].invitedBy, coachId);
        });
        (0, node_test_1.it)('should return only match invites (not event or session invites)', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const invites = [
                {
                    id: 'test-match-invite-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                    squadName: 'Test Squad',
                    targetType: 'MATCH',
                    targetId: 'test-match-' + Math.random().toString(36).slice(2),
                    targetTitle: 'vs Opponent',
                    invitedBy: coachId,
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 11,
                    responses: { accepted: 0, declined: 0, pending: 11 },
                },
                {
                    id: 'test-event-invite-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                    squadName: 'Test Squad',
                    targetType: 'EVENT',
                    targetId: 'test-event-' + Math.random().toString(36).slice(2),
                    targetTitle: 'Test Event',
                    invitedBy: coachId,
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 20,
                    responses: { accepted: 0, declined: 0, pending: 20 },
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, invites);
            const matchInvites = await match_invite_service_1.matchInviteService.getCoachMatchInvites(coachId);
            strict_1.default.equal(matchInvites.length, 1);
            strict_1.default.equal(matchInvites[0].targetType, 'MATCH');
        });
    });
    (0, node_test_1.describe)('updateMatchInviteResponse', () => {
        (0, node_test_1.it)('should update invite response counts', async () => {
            const matchId = 'test-match-' + Math.random().toString(36).slice(2);
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                targetType: 'MATCH',
                targetId: matchId,
                targetTitle: 'vs Test Opponent',
                invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 11,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 11,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            await match_invite_service_1.matchInviteService.updateMatchInviteResponse(matchId, squadId, 8, 2);
            const invites = await match_invite_service_1.matchInviteService.getMatchInvites(matchId);
            strict_1.default.equal(invites[0].responses.accepted, 8);
            strict_1.default.equal(invites[0].responses.declined, 2);
            strict_1.default.equal(invites[0].responses.pending, 1);
        });
        (0, node_test_1.it)('should handle non-existent invite gracefully', async () => {
            const matchId = 'non-existent-match';
            const squadId = 'non-existent-squad';
            await match_invite_service_1.matchInviteService.updateMatchInviteResponse(matchId, squadId, 1, 1);
            const invites = await match_invite_service_1.matchInviteService.getMatchInvites(matchId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should calculate correct pending count', async () => {
            const matchId = 'test-match-' + Math.random().toString(36).slice(2);
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                targetType: 'MATCH',
                targetId: matchId,
                targetTitle: '@ Away Team',
                invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 20,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 20,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            await match_invite_service_1.matchInviteService.updateMatchInviteResponse(matchId, squadId, 15, 3);
            const invites = await match_invite_service_1.matchInviteService.getMatchInvites(matchId);
            strict_1.default.equal(invites[0].responses.pending, 2);
        });
    });
});
