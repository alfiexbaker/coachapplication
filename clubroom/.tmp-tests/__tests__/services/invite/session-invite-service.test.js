"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const session_invite_service_1 = require("@/services/invite/session-invite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('SessionInviteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_INVITES);
    });
    (0, node_test_1.describe)('getCoachInvites', () => {
        (0, node_test_1.it)('should return empty array for coach with no invites', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const invites = await session_invite_service_1.sessionInviteService.getCoachInvites(coachId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by coachId', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const invite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                coachId,
                coachName: 'Test Coach',
                athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Skills',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, [invite]);
            const invites = await session_invite_service_1.sessionInviteService.getCoachInvites(coachId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].coachId, coachId);
        });
    });
    (0, node_test_1.describe)('getParentInvites', () => {
        (0, node_test_1.it)('should return empty array for parent with no invites', async () => {
            const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
            const invites = await session_invite_service_1.sessionInviteService.getParentInvites(parentId);
            strict_1.default.equal(invites.length, 0);
        });
        (0, node_test_1.it)('should filter invites by parentId', async () => {
            const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
            const invite = {
                id: 'test-invite-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                parentId,
                parentName: 'Test Parent',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Passing',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, [invite]);
            const invites = await session_invite_service_1.sessionInviteService.getParentInvites(parentId);
            strict_1.default.equal(invites.length, 1);
            strict_1.default.equal(invites[0].parentId, parentId);
        });
    });
    (0, node_test_1.describe)('getInviteById', () => {
        (0, node_test_1.it)('should return ok() with invite when found', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const invite = {
                id: inviteId,
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Tactics',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, [invite]);
            const result = await session_invite_service_1.sessionInviteService.getInviteById(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.id, inviteId);
        });
        (0, node_test_1.it)('should return err() when invite not found', async () => {
            const inviteId = 'non-existent-invite';
            const result = await session_invite_service_1.sessionInviteService.getInviteById(inviteId);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('cancelInvite', () => {
        (0, node_test_1.it)('should return ok() and update status to CANCELLED', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const invite = {
                id: inviteId,
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Defense',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, [invite]);
            const result = await session_invite_service_1.sessionInviteService.cancelInvite(inviteId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'CANCELLED');
        });
        (0, node_test_1.it)('should emit INVITE_CANCELLED event', async () => {
            const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
            const invite = {
                id: inviteId,
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                sessionType: '1-on-1',
                focus: 'Shooting',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, [invite]);
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.INVITE_CANCELLED, (payload) => {
                events.push(payload);
            });
            await session_invite_service_1.sessionInviteService.cancelInvite(inviteId);
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].inviteId, inviteId);
            unsub();
        });
        (0, node_test_1.it)('should return err() for non-existent invite', async () => {
            const result = await session_invite_service_1.sessionInviteService.cancelInvite('non-existent-invite');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('getPendingInvites', () => {
        (0, node_test_1.it)('should return only PENDING invites for parent', async () => {
            const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
            const invites = [
                {
                    id: 'test-invite-1-' + Math.random().toString(36).slice(2),
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Test Athlete'],
                    parentId,
                    parentName: 'Test Parent',
                    proposedSlots: [{ date: '2026-03-15', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Skills',
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'test-invite-2-' + Math.random().toString(36).slice(2),
                    coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                    coachName: 'Test Coach',
                    athleteIds: ['test-athlete-' + Math.random().toString(36).slice(2)],
                    athleteNames: ['Test Athlete'],
                    parentId,
                    parentName: 'Test Parent',
                    proposedSlots: [{ date: '2026-03-16', startTime: '14:00', endTime: '15:00' }],
                    sessionType: '1-on-1',
                    focus: 'Passing',
                    status: 'ACCEPTED',
                    createdAt: new Date().toISOString(),
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, invites);
            const result = await session_invite_service_1.sessionInviteService.getPendingInvites(parentId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.length, 1);
            strict_1.default.equal(result.data[0].status, 'PENDING');
        });
    });
});
