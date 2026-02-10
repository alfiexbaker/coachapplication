"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const event_invite_service_1 = require("@/services/invite/event-invite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('EventInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.CLUB_EVENTS);
    });
    (0, node_test_1.describe)('getEventInvites', () => {
        (0, node_test_1.it)('should return empty array for event with no invites', async () => {
            const eventId = 'test-event-' + Math.random().toString(36).slice(2);
            const invites = await event_invite_service_1.eventInviteService.getEventInvites(eventId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by eventId', async () => {
            const eventId = 'test-event-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                targetType: 'EVENT',
                targetId: eventId,
                targetTitle: 'Test Event',
                invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                invitedByName: 'Test Coach',
                invitedAt: new Date().toISOString(),
                memberCount: 5,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 5,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            const invites = await event_invite_service_1.eventInviteService.getEventInvites(eventId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].targetId, eventId);
        });
    });
    (0, node_test_1.describe)('getOrganizerEventInvites', () => {
        (0, node_test_1.it)('should return empty array for organizer with no invites', async () => {
            const organizerId = 'test-organizer-' + Math.random().toString(36).slice(2);
            const invites = await event_invite_service_1.eventInviteService.getOrganizerEventInvites(organizerId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by organizer ID', async () => {
            const organizerId = 'test-organizer-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId: 'test-squad-' + Math.random().toString(36).slice(2),
                squadName: 'Test Squad',
                targetType: 'EVENT',
                targetId: 'test-event-' + Math.random().toString(36).slice(2),
                targetTitle: 'Test Event',
                invitedBy: organizerId,
                invitedByName: 'Test Organizer',
                invitedAt: new Date().toISOString(),
                memberCount: 10,
                responses: {
                    accepted: 0,
                    declined: 0,
                    pending: 10,
                },
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            const invites = await event_invite_service_1.eventInviteService.getOrganizerEventInvites(organizerId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].invitedBy, organizerId);
        });
    });
    (0, node_test_1.describe)('updateEventInviteResponse', () => {
        (0, node_test_1.it)('should update invite response counts', async () => {
            const eventId = 'test-event-' + Math.random().toString(36).slice(2);
            const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
            const squadInvite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                squadId,
                squadName: 'Test Squad',
                targetType: 'EVENT',
                targetId: eventId,
                targetTitle: 'Test Event',
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
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);
            await event_invite_service_1.eventInviteService.updateEventInviteResponse(eventId, squadId, 5, 2);
            const invites = await event_invite_service_1.eventInviteService.getEventInvites(eventId);
            strict_1.default.equal(invites[0].responses.accepted, 5);
            strict_1.default.equal(invites[0].responses.declined, 2);
            strict_1.default.equal(invites[0].responses.pending, 3);
        });
        (0, node_test_1.it)('should handle non-existent invite gracefully', async () => {
            const eventId = 'non-existent-event';
            const squadId = 'non-existent-squad';
            await event_invite_service_1.eventInviteService.updateEventInviteResponse(eventId, squadId, 1, 1);
            const invites = await event_invite_service_1.eventInviteService.getEventInvites(eventId);
            strict_1.default.equal(invites.length, 0);
        });
    });
    (0, node_test_1.describe)('getEventRsvpTotals', () => {
        (0, node_test_1.it)('should return zero totals for event with no invites', async () => {
            const eventId = 'test-event-' + Math.random().toString(36).slice(2);
            const totals = await event_invite_service_1.eventInviteService.getEventRsvpTotals(eventId);
            strict_1.default.equal(totals.accepted, 0);
            strict_1.default.equal(totals.declined, 0);
            strict_1.default.equal(totals.pending, 0);
            strict_1.default.equal(totals.total, 0);
        });
        (0, node_test_1.it)('should aggregate totals across multiple squads', async () => {
            const eventId = 'test-event-' + Math.random().toString(36).slice(2);
            const squadInvites = [
                {
                    id: 'test-invite-1-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-1-' + Math.random().toString(36).slice(2),
                    squadName: 'Squad 1',
                    targetType: 'EVENT',
                    targetId: eventId,
                    targetTitle: 'Test Event',
                    invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 10,
                    responses: {
                        accepted: 5,
                        declined: 2,
                        pending: 3,
                    },
                },
                {
                    id: 'test-invite-2-' + Math.random().toString(36).slice(2),
                    squadId: 'test-squad-2-' + Math.random().toString(36).slice(2),
                    squadName: 'Squad 2',
                    targetType: 'EVENT',
                    targetId: eventId,
                    targetTitle: 'Test Event',
                    invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
                    invitedByName: 'Test Coach',
                    invitedAt: new Date().toISOString(),
                    memberCount: 8,
                    responses: {
                        accepted: 4,
                        declined: 1,
                        pending: 3,
                    },
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, squadInvites);
            const totals = await event_invite_service_1.eventInviteService.getEventRsvpTotals(eventId);
            strict_1.default.equal(totals.accepted, 9);
            strict_1.default.equal(totals.declined, 3);
            strict_1.default.equal(totals.pending, 6);
            strict_1.default.equal(totals.total, 18);
        });
    });
});
