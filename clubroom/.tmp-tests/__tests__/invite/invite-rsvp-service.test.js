"use strict";
// @ts-nocheck
/**
 * Invite RSVP Service Tests
 *
 * Tests the Facebook-style Going/Maybe/Can't Go RSVP functionality:
 * - respondToInvite: stores response, handles duplicates, returns error for invalid invites
 * - getResponses: retrieves all responses for an invite
 * - getCounts: aggregates going/maybe/cantGo counts
 * - getRespondents: filters by status
 * - updateResponse: changes status, handles not-found
 * - Event emission: INVITE_RSVP_RESPONDED event
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const invite_rsvp_service_1 = require("@/services/invite/invite-rsvp-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
// ============================================================================
// TEST HELPERS
// ============================================================================
/**
 * Clear storage and event listeners between tests.
 */
async function clearStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, []);
}
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.describe)('InviteRsvpService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.afterEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    // --------------------------------------------------------------------------
    // respondToInvite
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('respondToInvite', () => {
        (0, node_test_1.default)('stores a new RSVP response and returns ok', async () => {
            const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_test_invite_1', 'rsvp_test_user_1', 'Alice Smith', 'going', 'rsvp_test_child_1', 'Tommy Smith', 'https://photo.example.com/alice.jpg');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.inviteId, 'rsvp_test_invite_1');
                strict_1.default.equal(result.data.userId, 'rsvp_test_user_1');
                strict_1.default.equal(result.data.userName, 'Alice Smith');
                strict_1.default.equal(result.data.status, 'going');
                strict_1.default.equal(result.data.childId, 'rsvp_test_child_1');
                strict_1.default.equal(result.data.childName, 'Tommy Smith');
                strict_1.default.equal(result.data.userPhotoUrl, 'https://photo.example.com/alice.jpg');
                strict_1.default.ok(result.data.id.startsWith('rsvp_'));
                strict_1.default.ok(result.data.respondedAt);
            }
        });
        (0, node_test_1.default)('stores response in storage', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_storage_invite_1', 'rsvp_storage_user_1', 'Bob Jones', 'maybe');
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, []);
            strict_1.default.equal(stored.length, 1);
        });
        (0, node_test_1.default)('updates existing response when user responds again to same invite', async () => {
            // First response: going
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_dup_invite_1', 'rsvp_dup_user_1', 'Charlie Brown', 'going');
            // Second response: maybe (should update, not duplicate)
            const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_dup_invite_1', 'rsvp_dup_user_1', 'Charlie Brown', 'maybe');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'maybe');
            }
            // Verify only one response exists
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, []);
            strict_1.default.equal(stored.length, 1);
        });
        (0, node_test_1.default)('preserves existing ID when updating an existing response', async () => {
            const first = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_id_invite_1', 'rsvp_id_user_1', 'Diana Prince', 'going');
            strict_1.default.equal(first.success, true);
            const firstId = first.success ? first.data.id : '';
            const second = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_id_invite_1', 'rsvp_id_user_1', 'Diana Prince', 'cant_go');
            strict_1.default.equal(second.success, true);
            if (second.success) {
                strict_1.default.equal(second.data.id, firstId);
                strict_1.default.equal(second.data.status, 'cant_go');
            }
        });
        (0, node_test_1.default)('allows different users to respond to the same invite', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_multi_invite_1', 'rsvp_multi_user_1', 'Eve Adams', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_multi_invite_1', 'rsvp_multi_user_2', 'Frank White', 'maybe');
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, []);
            strict_1.default.equal(stored.length, 2);
        });
        (0, node_test_1.default)('emits INVITE_RSVP_RESPONDED event with correct payload', async () => {
            let emittedPayload = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, (data) => {
                emittedPayload = data;
            });
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_event_invite_1', 'rsvp_event_user_1', 'Grace Lee', 'going', 'rsvp_event_child_1', 'Junior Lee');
            strict_1.default.ok(emittedPayload, 'Event should have been emitted');
            strict_1.default.equal(emittedPayload.inviteId, 'rsvp_event_invite_1');
            strict_1.default.equal(emittedPayload.userId, 'rsvp_event_user_1');
            strict_1.default.equal(emittedPayload.userName, 'Grace Lee');
            strict_1.default.equal(emittedPayload.status, 'going');
            strict_1.default.equal(emittedPayload.childName, 'Junior Lee');
            strict_1.default.ok(emittedPayload.responseId);
        });
        (0, node_test_1.default)('responds with all three RSVP statuses correctly', async () => {
            const statuses = ['going', 'maybe', 'cant_go'];
            for (const status of statuses) {
                const result = await invite_rsvp_service_1.inviteRsvpService.respondToInvite(`rsvp_status_invite_${status}`, `rsvp_status_user_${status}`, `User ${status}`, status);
                strict_1.default.equal(result.success, true, `Failed for status: ${status}`);
                if (result.success) {
                    strict_1.default.equal(result.data.status, status);
                }
            }
        });
    });
    // --------------------------------------------------------------------------
    // getResponses
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getResponses', () => {
        (0, node_test_1.default)('returns all responses for a given inviteId', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_get_invite_1', 'rsvp_get_user_1', 'User A', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_get_invite_1', 'rsvp_get_user_2', 'User B', 'maybe');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_get_invite_2', 'rsvp_get_user_3', 'User C', 'going'); // different invite
            const result = await invite_rsvp_service_1.inviteRsvpService.getResponses('rsvp_get_invite_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 2);
                const userNames = result.data.map((r) => r.userName);
                strict_1.default.ok(userNames.includes('User A'));
                strict_1.default.ok(userNames.includes('User B'));
            }
        });
        (0, node_test_1.default)('returns empty array when no responses exist for inviteId', async () => {
            const result = await invite_rsvp_service_1.inviteRsvpService.getResponses('rsvp_empty_invite_999');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 0);
            }
        });
        (0, node_test_1.default)('does not return responses from other invites', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_iso_invite_1', 'rsvp_iso_user_1', 'User X', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_iso_invite_2', 'rsvp_iso_user_2', 'User Y', 'going');
            const result = await invite_rsvp_service_1.inviteRsvpService.getResponses('rsvp_iso_invite_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 1);
                strict_1.default.equal(result.data[0].userName, 'User X');
            }
        });
    });
    // --------------------------------------------------------------------------
    // getCounts
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getCounts', () => {
        (0, node_test_1.default)('returns correct aggregation of going/maybe/cantGo counts', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u1', 'U1', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u2', 'U2', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u3', 'U3', 'maybe');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u4', 'U4', 'cant_go');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u5', 'U5', 'cant_go');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cnt_invite_1', 'rsvp_cnt_u6', 'U6', 'cant_go');
            const result = await invite_rsvp_service_1.inviteRsvpService.getCounts('rsvp_cnt_invite_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.going, 2);
                strict_1.default.equal(result.data.maybe, 1);
                strict_1.default.equal(result.data.cantGo, 3);
            }
        });
        (0, node_test_1.default)('returns all zeros when no responses exist', async () => {
            const result = await invite_rsvp_service_1.inviteRsvpService.getCounts('rsvp_zero_invite_999');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.going, 0);
                strict_1.default.equal(result.data.maybe, 0);
                strict_1.default.equal(result.data.cantGo, 0);
            }
        });
        (0, node_test_1.default)('does not count responses from other invites', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cntiso_invite_1', 'rsvp_cntiso_u1', 'U1', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_cntiso_invite_2', 'rsvp_cntiso_u2', 'U2', 'going');
            const result = await invite_rsvp_service_1.inviteRsvpService.getCounts('rsvp_cntiso_invite_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.going, 1);
            }
        });
    });
    // --------------------------------------------------------------------------
    // getRespondents
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getRespondents', () => {
        (0, node_test_1.default)('filters respondents by going status', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u1', 'Going User', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u2', 'Maybe User', 'maybe');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filt_invite_1', 'rsvp_filt_u3', 'CantGo User', 'cant_go');
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents('rsvp_filt_invite_1', 'going');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 1);
                strict_1.default.equal(result.data[0].userName, 'Going User');
                strict_1.default.equal(result.data[0].status, 'going');
            }
        });
        (0, node_test_1.default)('filters respondents by maybe status', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u1', 'User A', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u2', 'User B', 'maybe');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filtm_invite_1', 'rsvp_filtm_u3', 'User C', 'maybe');
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents('rsvp_filtm_invite_1', 'maybe');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 2);
                strict_1.default.ok(result.data.every((r) => r.status === 'maybe'));
            }
        });
        (0, node_test_1.default)('filters respondents by cant_go status', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filtc_invite_1', 'rsvp_filtc_u1', 'User X', 'going');
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filtc_invite_1', 'rsvp_filtc_u2', 'User Y', 'cant_go');
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents('rsvp_filtc_invite_1', 'cant_go');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 1);
                strict_1.default.equal(result.data[0].userName, 'User Y');
            }
        });
        (0, node_test_1.default)('returns empty array when no respondents match the status', async () => {
            await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_filte_invite_1', 'rsvp_filte_u1', 'User A', 'going');
            const result = await invite_rsvp_service_1.inviteRsvpService.getRespondents('rsvp_filte_invite_1', 'cant_go');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 0);
            }
        });
    });
    // --------------------------------------------------------------------------
    // updateResponse
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('updateResponse', () => {
        (0, node_test_1.default)('updates an existing response status', async () => {
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_upd_invite_1', 'rsvp_upd_user_1', 'Update User', 'going');
            strict_1.default.equal(createResult.success, true);
            const responseId = createResult.success ? createResult.data.id : '';
            const updateResult = await invite_rsvp_service_1.inviteRsvpService.updateResponse(responseId, 'cant_go');
            strict_1.default.equal(updateResult.success, true);
            if (updateResult.success) {
                strict_1.default.equal(updateResult.data.status, 'cant_go');
                strict_1.default.equal(updateResult.data.id, responseId);
            }
        });
        (0, node_test_1.default)('updates respondedAt timestamp when status changes', async () => {
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_updts_invite_1', 'rsvp_updts_user_1', 'Timestamp User', 'going');
            const originalTime = createResult.success ? createResult.data.respondedAt : '';
            // Small delay to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));
            const responseId = createResult.success ? createResult.data.id : '';
            const updateResult = await invite_rsvp_service_1.inviteRsvpService.updateResponse(responseId, 'maybe');
            strict_1.default.equal(updateResult.success, true);
            if (updateResult.success) {
                strict_1.default.ok(updateResult.data.respondedAt >= originalTime);
            }
        });
        (0, node_test_1.default)('returns NOT_FOUND error for non-existent responseId', async () => {
            const result = await invite_rsvp_service_1.inviteRsvpService.updateResponse('rsvp_nonexistent_id', 'going');
            strict_1.default.equal(result.success, false);
            if (!result.success) {
                strict_1.default.equal(result.error.code, 'NOT_FOUND');
                strict_1.default.ok(result.error.message.includes('rsvp_nonexistent_id'));
            }
        });
        (0, node_test_1.default)('emits INVITE_RSVP_RESPONDED event when updating', async () => {
            let emittedPayload = null;
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_updevt_invite_1', 'rsvp_updevt_user_1', 'Event User', 'going');
            const responseId = createResult.success ? createResult.data.id : '';
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, (data) => {
                emittedPayload = data;
            });
            await invite_rsvp_service_1.inviteRsvpService.updateResponse(responseId, 'maybe');
            strict_1.default.ok(emittedPayload, 'Event should have been emitted on update');
            strict_1.default.equal(emittedPayload.status, 'maybe');
            strict_1.default.equal(emittedPayload.responseId, responseId);
            strict_1.default.equal(emittedPayload.inviteId, 'rsvp_updevt_invite_1');
        });
        (0, node_test_1.default)('persists update to storage', async () => {
            const createResult = await invite_rsvp_service_1.inviteRsvpService.respondToInvite('rsvp_updstore_invite_1', 'rsvp_updstore_user_1', 'Storage User', 'going');
            const responseId = createResult.success ? createResult.data.id : '';
            await invite_rsvp_service_1.inviteRsvpService.updateResponse(responseId, 'cant_go');
            // Verify in storage
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, []);
            const updated = stored.find((r) => r.id === responseId);
            strict_1.default.ok(updated);
            strict_1.default.equal(updated.status, 'cant_go');
        });
    });
});
