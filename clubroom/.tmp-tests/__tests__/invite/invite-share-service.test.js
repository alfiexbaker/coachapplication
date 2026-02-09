"use strict";
// @ts-nocheck
/**
 * Invite Share Service Tests
 *
 * Tests the shareable deep link generation and native share dialog:
 * - generateShareLink: creates link, caches it, returns cached on repeat
 * - shareInvite: calls Share.share, emits INVITE_SHARED event
 * - Error paths: storage failures
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
const invite_share_service_1 = require("@/services/invite/invite-share-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
// ============================================================================
// TEST HELPERS
// ============================================================================
async function clearStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
}
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.describe)('InviteShareService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.afterEach)(async () => {
        await clearStorage();
        event_bus_1.eventBus.clearAll();
    });
    // --------------------------------------------------------------------------
    // generateShareLink
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('generateShareLink', () => {
        (0, node_test_1.default)('generates a deep link and returns ok', async () => {
            const result = await invite_share_service_1.inviteShareService.generateShareLink('share_gen_invite_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.includes('session-invites/share_gen_invite_1'));
                strict_1.default.equal(typeof result.data, 'string');
            }
        });
        (0, node_test_1.default)('caches the generated link in storage', async () => {
            await invite_share_service_1.inviteShareService.generateShareLink('share_cache_invite_1');
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].inviteId, 'share_cache_invite_1');
            strict_1.default.ok(stored[0].link.includes('session-invites/share_cache_invite_1'));
        });
        (0, node_test_1.default)('returns cached link on second call (no duplicate creation)', async () => {
            const first = await invite_share_service_1.inviteShareService.generateShareLink('share_dedup_invite_1');
            const second = await invite_share_service_1.inviteShareService.generateShareLink('share_dedup_invite_1');
            strict_1.default.equal(first.success, true);
            strict_1.default.equal(second.success, true);
            if (first.success && second.success) {
                strict_1.default.equal(first.data, second.data);
            }
            // Verify only one link in storage
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            strict_1.default.equal(stored.length, 1);
        });
        (0, node_test_1.default)('generates different links for different invites', async () => {
            const link1 = await invite_share_service_1.inviteShareService.generateShareLink('share_diff_invite_1');
            const link2 = await invite_share_service_1.inviteShareService.generateShareLink('share_diff_invite_2');
            strict_1.default.equal(link1.success, true);
            strict_1.default.equal(link2.success, true);
            if (link1.success && link2.success) {
                strict_1.default.notEqual(link1.data, link2.data);
                strict_1.default.ok(link1.data.includes('share_diff_invite_1'));
                strict_1.default.ok(link2.data.includes('share_diff_invite_2'));
            }
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            strict_1.default.equal(stored.length, 2);
        });
    });
    // --------------------------------------------------------------------------
    // shareInvite
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('shareInvite', () => {
        (0, node_test_1.default)('returns ok on success', async () => {
            const result = await invite_share_service_1.inviteShareService.shareInvite('share_invoke_invite_1', 'Coach Mike', 'Finishing Drills', '2026-03-15');
            strict_1.default.equal(result.success, true);
        });
        (0, node_test_1.default)('generates a share link as part of sharing', async () => {
            await invite_share_service_1.inviteShareService.shareInvite('share_linkgen_invite_1', 'Coach Sarah', 'Ball Control', '2026-04-01');
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].inviteId, 'share_linkgen_invite_1');
        });
        (0, node_test_1.default)('emits INVITE_SHARED event with correct payload', async () => {
            let emittedPayload = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.INVITE_SHARED, (data) => {
                emittedPayload = data;
            });
            await invite_share_service_1.inviteShareService.shareInvite('share_evt_invite_1', 'Coach Dan', 'Speed Training', '2026-05-10');
            strict_1.default.ok(emittedPayload, 'INVITE_SHARED event should have been emitted');
            strict_1.default.equal(emittedPayload.inviteId, 'share_evt_invite_1');
            strict_1.default.equal(emittedPayload.sharedBy, 'Coach Dan');
            strict_1.default.ok(typeof emittedPayload.shareLink === 'string');
            strict_1.default.ok(emittedPayload.shareLink.includes('share_evt_invite_1'));
        });
        (0, node_test_1.default)('reuses cached link when sharing the same invite twice', async () => {
            let emitCount = 0;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.INVITE_SHARED, () => {
                emitCount++;
            });
            await invite_share_service_1.inviteShareService.shareInvite('share_reuse_invite_1', 'Coach A', 'Session A', '2026-06-01');
            await invite_share_service_1.inviteShareService.shareInvite('share_reuse_invite_1', 'Coach A', 'Session A', '2026-06-01');
            // Should have emitted twice (once per share action)
            strict_1.default.equal(emitCount, 2);
            // But only one link should be stored
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_SHARE_LINKS, []);
            strict_1.default.equal(stored.length, 1);
        });
    });
});
