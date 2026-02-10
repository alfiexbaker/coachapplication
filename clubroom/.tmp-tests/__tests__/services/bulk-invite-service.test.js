"use strict";
/**
 * Bulk Invite Service Tests
 *
 * Tests for bulk session invites to squads or selected members.
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
const bulk_invite_service_1 = require("../../services/invite/bulk-invite-service");
(0, node_test_1.describe)('bulkInviteService', () => {
    (0, node_test_1.describe)('getGroupInvites', () => {
        (0, node_test_1.default)('returns array of invites for a group', async () => {
            const invites = await bulk_invite_service_1.bulkInviteService.getGroupInvites('group_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getGroupStats', () => {
        (0, node_test_1.default)('returns stats object', async () => {
            const stats = await bulk_invite_service_1.bulkInviteService.getGroupStats('group_1');
            strict_1.default.equal(typeof stats.total, 'number');
            strict_1.default.equal(typeof stats.pending, 'number');
            strict_1.default.equal(typeof stats.accepted, 'number');
            strict_1.default.equal(typeof stats.declined, 'number');
        });
    });
    (0, node_test_1.describe)('getCoachInviteStats', () => {
        (0, node_test_1.default)('returns stats for coach', async () => {
            const stats = await bulk_invite_service_1.bulkInviteService.getCoachInviteStats('coach_1');
            strict_1.default.equal(typeof stats.sent, 'number');
            strict_1.default.equal(typeof stats.acceptanceRate, 'number');
        });
    });
});
