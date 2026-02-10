"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const invite_rsvp_service_1 = require("@/services/invite/invite-rsvp-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('InviteRsvpService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_INVITES);
    });
    (0, node_test_1.describe)('respondToInvite', () => {
        (0, node_test_1.it)('should return ok() and create RSVP response', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.inviteId, inviteId);
            strict_1.default.equal(result.data.userId, userId);
            strict_1.default.equal(result.data.status, 'going');
        });
        (0, node_test_1.it)('should update existing response when user responds again', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
            const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'cant_go');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'cant_go');
            const responses = await invite_rsvp_service_1.inviteRsvpService.getResponses(inviteId);
            strict_1.default.ok(responses.success);
            strict_1.default.equal(responses.data.length, 1);
            strict_1.default.equal(responses.data[0].status, 'cant_go');
        });
        (0, node_test_1.it)('should include optional childId and childName', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const childId = 'test-child-' + Math.random().toString(36).slice(2);
            const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'maybe', childId, 'Test Child');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.childId, childId);
            strict_1.default.equal(result.data.childName, 'Test Child');
        });
        (0, node_test_1.it)('should emit INVITE_RSVP_RESPONDED event', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, (payload) => {
                events.push(payload);
            });
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].inviteId, inviteId);
            strict_1.default.equal(events[0].userId, userId);
            strict_1.default.equal(events[0].status, 'going');
            unsub();
        });
    });
    (0, node_test_1.describe)('getResponses', () => {
        (0, node_test_1.it)('should return ok() with empty array for invite with no responses', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const result = await invite_rsvp_service_1.inviteRsvpService.getResponses(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.length, 0);
        });
        (0, node_test_1.it)('should return all responses for an invite', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-1-' + Math.random().toString(36).slice(2), 'User 1', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-2-' + Math.random().toString(36).slice(2), 'User 2', 'maybe');
            const result = await invite_rsvp_service_1.inviteRsvpService.getResponses(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.length, 2);
        });
    });
    (0, node_test_1.describe)('getCounts', () => {
        (0, node_test_1.it)('should return ok() with zero counts for invite with no responses', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const result = await invite_rsvp_service_1.inviteRsvpService.getCounts(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.going, 0);
            strict_1.default.equal(result.data.maybe, 0);
            strict_1.default.equal(result.data.cantGo, 0);
        });
        (0, node_test_1.it)('should return correct counts for each status', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-1-' + Math.random().toString(36).slice(2), 'User 1', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-2-' + Math.random().toString(36).slice(2), 'User 2', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-3-' + Math.random().toString(36).slice(2), 'User 3', 'maybe');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-4-' + Math.random().toString(36).slice(2), 'User 4', 'cant_go');
            const result = await invite_rsvp_service_1.inviteRsvpService.getCounts(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.going, 2);
            strict_1.default.equal(result.data.maybe, 1);
            strict_1.default.equal(result.data.cantGo, 1);
        });
    });
    (0, node_test_1.describe)('getRespondents', () => {
        (0, node_test_1.it)('should return ok() with filtered respondents by status', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-1-' + Math.random().toString(36).slice(2), 'User 1', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, 'test-user-2-' + Math.random().toString(36).slice(2), 'User 2', 'maybe');
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents(inviteId, 'going');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.length, 1);
            strict_1.default.equal(result.data[0].status, 'going');
        });
        (0, node_test_1.it)('should return empty array when no respondents match status', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents(inviteId, 'cant_go');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.length, 0);
        });
    });
    (0, node_test_1.describe)('updateResponse', () => {
        (0, node_test_1.it)('should return err() for non-existent response', async () => {
            const result = await invite_rsvp_service_1.inviteRsvpService.updateResponse('non-existent-response', 'going');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should update existing response status', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
            const updateResult = await invite_rsvp_service_1.inviteRsvpService.updateResponse(createResult.data.id, 'cant_go');
            strict_1.default.ok(updateResult.success);
            strict_1.default.equal(updateResult.data.status, 'cant_go');
        });
        (0, node_test_1.it)('should emit INVITE_RSVP_RESPONDED event on update', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const events = [];
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, (payload) => {
                events.push(payload);
            });
            await invite_rsvp_service_1.inviteRsvpService.updateResponse(createResult.data.id, 'maybe');
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].status, 'maybe');
            unsub();
        });
    });
});
