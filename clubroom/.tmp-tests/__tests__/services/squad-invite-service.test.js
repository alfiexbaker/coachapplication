"use strict";
/**
 * Squad Invite Service Tests
 *
 * Tests for squad-level invite queries, member metadata, and history.
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
const squad_invite_service_1 = require("../../services/invite/squad-invite-service");
(0, node_test_1.describe)('squad-invite-service persistence helpers', () => {
    (0, node_test_1.describe)('loadSquadInvites', () => {
        (0, node_test_1.default)('returns array', async () => {
            const invites = await (0, squad_invite_service_1.loadSquadInvites)();
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('loadSquadSessionInvites', () => {
        (0, node_test_1.default)('returns array', async () => {
            const invites = await (0, squad_invite_service_1.loadSquadSessionInvites)();
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('loadInviteHistory', () => {
        (0, node_test_1.default)('returns array', async () => {
            const history = await (0, squad_invite_service_1.loadInviteHistory)();
            strict_1.default.ok(Array.isArray(history));
        });
    });
    (0, node_test_1.describe)('saveSquadInvites', () => {
        (0, node_test_1.default)('does not throw', async () => {
            await strict_1.default.doesNotReject(async () => {
                await (0, squad_invite_service_1.saveSquadInvites)([]);
            });
        });
    });
});
