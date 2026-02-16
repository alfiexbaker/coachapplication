"use strict";
/**
 * Block Service Tests
 *
 * Tests for user blocking: block, unblock, getBlockedUsers, isBlocked.
 * isBlocked checks bidirectional blocking.
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
const block_service_1 = require("../../services/block-service");
const api_client_1 = require("../../services/api-client");
const uid = () => `u_${Math.random().toString(36).slice(2, 10)}`;
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
(0, node_test_1.describe)('blockService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.blocked_users');
    });
    // ---------------------------------------------------------------------------
    // blockUser
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('blockUser', () => {
        (0, node_test_1.default)('adds target to blocked list', async () => {
            const user = uid();
            const target = uid();
            expectOk(await block_service_1.blockService.blockUser(user, target));
            const blocked = expectOk(await block_service_1.blockService.getBlockedUsers(user));
            strict_1.default.ok(blocked.includes(target));
        });
        (0, node_test_1.default)('blocking the same user twice does not duplicate', async () => {
            const user = uid();
            const target = uid();
            expectOk(await block_service_1.blockService.blockUser(user, target));
            expectOk(await block_service_1.blockService.blockUser(user, target));
            const blocked = expectOk(await block_service_1.blockService.getBlockedUsers(user));
            strict_1.default.equal(blocked.filter((id) => id === target).length, 1);
        });
        (0, node_test_1.default)('blocking multiple users adds all', async () => {
            const user = uid();
            const t1 = uid();
            const t2 = uid();
            expectOk(await block_service_1.blockService.blockUser(user, t1));
            expectOk(await block_service_1.blockService.blockUser(user, t2));
            const blocked = expectOk(await block_service_1.blockService.getBlockedUsers(user));
            strict_1.default.equal(blocked.length, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // unblockUser
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('unblockUser', () => {
        (0, node_test_1.default)('removes target from blocked list', async () => {
            const user = uid();
            const target = uid();
            expectOk(await block_service_1.blockService.blockUser(user, target));
            expectOk(await block_service_1.blockService.unblockUser(user, target));
            const blocked = expectOk(await block_service_1.blockService.getBlockedUsers(user));
            strict_1.default.ok(!blocked.includes(target));
        });
        (0, node_test_1.default)('unblocking non-blocked user does not throw', async () => {
            const user = uid();
            expectOk(await block_service_1.blockService.unblockUser(user, uid()));
        });
    });
    // ---------------------------------------------------------------------------
    // getBlockedUsers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getBlockedUsers', () => {
        (0, node_test_1.default)('returns empty array for user with no blocks', async () => {
            const blocked = expectOk(await block_service_1.blockService.getBlockedUsers(uid()));
            strict_1.default.deepEqual(blocked, []);
        });
    });
    // ---------------------------------------------------------------------------
    // isBlocked (bidirectional)
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('isBlocked', () => {
        (0, node_test_1.default)('returns true when user has blocked target', async () => {
            const user = uid();
            const target = uid();
            expectOk(await block_service_1.blockService.blockUser(user, target));
            const result = expectOk(await block_service_1.blockService.isBlocked(user, target));
            strict_1.default.equal(result, true);
        });
        (0, node_test_1.default)('returns true when target has blocked user (reverse direction)', async () => {
            const user = uid();
            const target = uid();
            expectOk(await block_service_1.blockService.blockUser(target, user));
            const result = expectOk(await block_service_1.blockService.isBlocked(user, target));
            strict_1.default.equal(result, true);
        });
        (0, node_test_1.default)('returns false when neither has blocked', async () => {
            const result = expectOk(await block_service_1.blockService.isBlocked(uid(), uid()));
            strict_1.default.equal(result, false);
        });
    });
});
