"use strict";
/**
 * Event Invite Service Tests
 *
 * Tests for squad invites to events with RSVP tracking.
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
const event_invite_service_1 = require("../../services/invite/event-invite-service");
(0, node_test_1.describe)('eventInviteService', () => {
    (0, node_test_1.describe)('getEventInvites', () => {
        (0, node_test_1.default)('returns array of squad invites for event', async () => {
            const invites = await event_invite_service_1.eventInviteService.getEventInvites('event_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getOrganizerEventInvites', () => {
        (0, node_test_1.default)('returns array of invites by organizer', async () => {
            const invites = await event_invite_service_1.eventInviteService.getOrganizerEventInvites('coach_1');
            strict_1.default.ok(Array.isArray(invites));
        });
    });
    (0, node_test_1.describe)('getEventRsvpTotals', () => {
        (0, node_test_1.default)('returns totals object', async () => {
            const totals = await event_invite_service_1.eventInviteService.getEventRsvpTotals('event_1');
            strict_1.default.equal(typeof totals.accepted, 'number');
            strict_1.default.equal(typeof totals.declined, 'number');
            strict_1.default.equal(typeof totals.pending, 'number');
            strict_1.default.equal(typeof totals.total, 'number');
        });
    });
});
