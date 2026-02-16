"use strict";
/**
 * Session CRUD Service Tests
 *
 * Tests for group session creation, publishing, cancellation, and queries.
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
const session_crud_service_1 = require("../../services/group-session/session-crud-service");
(0, node_test_1.describe)('sessionCrudService', () => {
    (0, node_test_1.describe)('createSession', () => {
        (0, node_test_1.default)('creates a group session', async () => {
            const session = await session_crud_service_1.sessionCrudService.createSession({
                coachId: 'coach_1',
                coachName: 'Coach Test',
                title: 'Test Training',
                description: 'A test session',
                sessionType: 'TRAINING',
                maxParticipants: 16,
                pricePerParticipant: 15,
                currency: 'GBP',
                location: 'Training Ground',
                schedule: [{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }],
            });
            strict_1.default.ok(session.id);
            strict_1.default.equal(session.title, 'Test Training');
            strict_1.default.equal(session.status, 'DRAFT');
        });
    });
    (0, node_test_1.describe)('getSession', () => {
        (0, node_test_1.default)('returns null for non-existent session', async () => {
            const result = await session_crud_service_1.sessionCrudService.getSession('nonexistent_gs');
            strict_1.default.equal(result, null);
        });
    });
    (0, node_test_1.describe)('getCoachSessions', () => {
        (0, node_test_1.default)('returns array of sessions', async () => {
            const sessions = await session_crud_service_1.sessionCrudService.getCoachSessions('coach_1');
            strict_1.default.ok(Array.isArray(sessions));
        });
    });
    (0, node_test_1.describe)('discoverSessions', () => {
        (0, node_test_1.default)('returns array of published sessions', async () => {
            const sessions = await session_crud_service_1.sessionCrudService.discoverSessions();
            strict_1.default.ok(Array.isArray(sessions));
        });
    });
    (0, node_test_1.describe)('publishSession (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent session', async () => {
            const result = await session_crud_service_1.sessionCrudService.publishSession('nonexistent_pub');
            strict_1.default.strictEqual(result.success, false);
        });
        (0, node_test_1.default)('publishes an existing session', async () => {
            const session = await session_crud_service_1.sessionCrudService.createSession({
                coachId: 'coach_pub',
                coachName: 'Coach',
                title: 'Publish Test',
                description: 'Test',
                sessionType: 'TRAINING',
                maxParticipants: 12,
                pricePerParticipant: 10,
                currency: 'GBP',
                location: 'Field',
                schedule: [{ date: '2026-07-01', startTime: '10:00', endTime: '11:00' }],
            });
            const result = await session_crud_service_1.sessionCrudService.publishSession(session.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'PUBLISHED');
            }
        });
    });
    (0, node_test_1.describe)('cancelSession (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent session', async () => {
            const result = await session_crud_service_1.sessionCrudService.cancelSession('nonexistent_cancel');
            strict_1.default.strictEqual(result.success, false);
        });
    });
});
