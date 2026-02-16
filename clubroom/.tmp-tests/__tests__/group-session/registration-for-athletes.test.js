"use strict";
/**
 * Tests for sessionRegistrationService.getRegistrationsForAthletes()
 *
 * Verifies that the method correctly filters registrations by athlete IDs
 * and excludes CANCELLED registrations.
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
const api_client_1 = require("../../services/api-client");
const storage_keys_1 = require("../../constants/storage-keys");
const session_registration_service_1 = require("../../services/group-session/session-registration-service");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeReg(overrides) {
    return {
        parentId: 'parent-1',
        status: 'REGISTERED',
        registeredAt: '2026-01-10T10:00:00Z',
        attendedDates: [],
        ...overrides,
    };
}
const SEED_REGISTRATIONS = [
    makeReg({ id: 'reg_a1', sessionId: 'gs_1', athleteId: 'athlete-1', status: 'REGISTERED' }),
    makeReg({ id: 'reg_a2', sessionId: 'gs_1', athleteId: 'athlete-2', status: 'REGISTERED' }),
    makeReg({ id: 'reg_a3', sessionId: 'gs_2', athleteId: 'athlete-1', status: 'WAITLISTED' }),
    makeReg({ id: 'reg_a4', sessionId: 'gs_2', athleteId: 'athlete-3', status: 'CANCELLED' }),
    makeReg({ id: 'reg_a5', sessionId: 'gs_3', athleteId: 'athlete-2', status: 'ATTENDED' }),
    makeReg({ id: 'reg_a6', sessionId: 'gs_3', athleteId: 'athlete-4', status: 'REGISTERED' }),
];
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('sessionRegistrationService.getRegistrationsForAthletes', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Seed registration data via apiClient
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GROUP_REGISTRATIONS, SEED_REGISTRATIONS);
    });
    (0, node_test_1.default)('returns registrations for a single athlete', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-1']));
        // athlete-1 has reg_a1 (REGISTERED) and reg_a3 (WAITLISTED) — both non-cancelled
        strict_1.default.equal(result.length, 2);
        const ids = result.map((r) => r.id).sort();
        strict_1.default.deepEqual(ids, ['reg_a1', 'reg_a3']);
    });
    (0, node_test_1.default)('returns registrations for multiple athletes', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-1', 'athlete-2']));
        // athlete-1: reg_a1, reg_a3; athlete-2: reg_a2, reg_a5 — all non-cancelled
        strict_1.default.equal(result.length, 4);
        const ids = result.map((r) => r.id).sort();
        strict_1.default.deepEqual(ids, ['reg_a1', 'reg_a2', 'reg_a3', 'reg_a5']);
    });
    (0, node_test_1.default)('excludes CANCELLED registrations', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-3']));
        // athlete-3 only has reg_a4 which is CANCELLED
        strict_1.default.equal(result.length, 0);
    });
    (0, node_test_1.default)('returns empty array for unknown athlete IDs', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['unknown-athlete']));
        strict_1.default.equal(result.length, 0);
    });
    (0, node_test_1.default)('returns empty array for empty athlete ID set', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set());
        strict_1.default.equal(result.length, 0);
    });
    (0, node_test_1.default)('includes ATTENDED status registrations', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-2']));
        // athlete-2: reg_a2 (REGISTERED) + reg_a5 (ATTENDED) — both non-cancelled
        const statuses = result.map((r) => r.status);
        strict_1.default.ok(statuses.includes('ATTENDED'));
        strict_1.default.ok(statuses.includes('REGISTERED'));
    });
    (0, node_test_1.default)('includes WAITLISTED status registrations', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-1']));
        const statuses = result.map((r) => r.status);
        strict_1.default.ok(statuses.includes('WAITLISTED'));
    });
    (0, node_test_1.default)('does not filter registrations not in the athlete set', async () => {
        const result = await session_registration_service_1.sessionRegistrationService.getRegistrationsForAthletes(new Set(['athlete-4']));
        // athlete-4 has reg_a6 only
        strict_1.default.equal(result.length, 1);
        strict_1.default.equal(result[0].id, 'reg_a6');
        strict_1.default.equal(result[0].athleteId, 'athlete-4');
    });
});
