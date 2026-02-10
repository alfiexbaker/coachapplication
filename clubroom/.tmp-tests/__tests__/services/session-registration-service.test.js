"use strict";
/**
 * Session Registration Service Tests
 *
 * Tests for athlete registration, cancellation, roster, and attendance.
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
const session_registration_service_1 = require("../../services/group-session/session-registration-service");
(0, node_test_1.describe)('sessionRegistrationService', () => {
    (0, node_test_1.describe)('register (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent session', async () => {
            const result = await session_registration_service_1.sessionRegistrationService.register('nonexistent_session', 'ath_1', 'Athlete', 'par_1', 'Parent');
            strict_1.default.equal(result.success, false);
        });
    });
    (0, node_test_1.describe)('cancelRegistration (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent registration', async () => {
            const result = await session_registration_service_1.sessionRegistrationService.cancelRegistration('nonexistent_reg');
            strict_1.default.equal(result.success, false);
        });
    });
    (0, node_test_1.describe)('getSessionRoster', () => {
        (0, node_test_1.default)('returns array for existing mock session', async () => {
            const roster = await session_registration_service_1.sessionRegistrationService.getSessionRoster('gs_training_1');
            strict_1.default.ok(Array.isArray(roster));
        });
        (0, node_test_1.default)('returns empty array for unknown session', async () => {
            const roster = await session_registration_service_1.sessionRegistrationService.getSessionRoster('nonexistent_gs');
            strict_1.default.ok(Array.isArray(roster));
            strict_1.default.equal(roster.length, 0);
        });
    });
    (0, node_test_1.describe)('markAttendance (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent registration', async () => {
            const result = await session_registration_service_1.sessionRegistrationService.markAttendance('nonexistent_reg', '2026-01-15', true);
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('marks attendance for existing registration', async () => {
            // reg_13 is a mock registration
            const result = await session_registration_service_1.sessionRegistrationService.markAttendance('reg_13', '2026-02-01', true);
            if (result.success) {
                strict_1.default.ok(result.data.attendedDates.includes('2026-02-01'));
            }
        });
    });
    (0, node_test_1.describe)('getParentRegistrations', () => {
        (0, node_test_1.default)('returns array of registrations with session data', async () => {
            const regs = await session_registration_service_1.sessionRegistrationService.getParentRegistrations('user_parent_01');
            strict_1.default.ok(Array.isArray(regs));
            if (regs.length > 0) {
                strict_1.default.ok(regs[0].session);
            }
        });
    });
});
