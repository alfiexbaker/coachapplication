"use strict";
/**
 * Session Scheduling Service Tests
 *
 * Tests for training session queries and recurring pattern utilities.
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
const session_scheduling_service_1 = require("../../services/group-session/session-scheduling-service");
(0, node_test_1.describe)('sessionSchedulingService', () => {
    (0, node_test_1.describe)('getClubTrainingSessions', () => {
        (0, node_test_1.default)('returns array of training sessions', async () => {
            const sessions = await session_scheduling_service_1.sessionSchedulingService.getClubTrainingSessions('club_1');
            strict_1.default.ok(Array.isArray(sessions));
        });
    });
    (0, node_test_1.describe)('getSquadTrainingSessions', () => {
        (0, node_test_1.default)('returns array of training sessions', async () => {
            const sessions = await session_scheduling_service_1.sessionSchedulingService.getSquadTrainingSessions('squad_1');
            strict_1.default.ok(Array.isArray(sessions));
        });
    });
    (0, node_test_1.describe)('getChildTrainingSessions', () => {
        (0, node_test_1.default)('returns array for a registered child', async () => {
            const sessions = await session_scheduling_service_1.sessionSchedulingService.getChildTrainingSessions('user1');
            strict_1.default.ok(Array.isArray(sessions));
        });
    });
    (0, node_test_1.describe)('formatDayOfWeek', () => {
        (0, node_test_1.default)('formats known days', () => {
            strict_1.default.equal(session_scheduling_service_1.sessionSchedulingService.formatDayOfWeek(0), 'Sunday');
            strict_1.default.equal(session_scheduling_service_1.sessionSchedulingService.formatDayOfWeek(1), 'Monday');
            strict_1.default.equal(session_scheduling_service_1.sessionSchedulingService.formatDayOfWeek(6), 'Saturday');
        });
        (0, node_test_1.default)('returns fallback for invalid day', () => {
            const result = session_scheduling_service_1.sessionSchedulingService.formatDayOfWeek(99);
            strict_1.default.ok(result.includes('99'));
        });
    });
    (0, node_test_1.describe)('formatRecurringPattern', () => {
        (0, node_test_1.default)('formats a pattern', () => {
            const result = session_scheduling_service_1.sessionSchedulingService.formatRecurringPattern({
                dayOfWeek: 2,
                startTime: '09:00',
                endTime: '10:00',
            });
            strict_1.default.ok(result.includes('Tuesday'));
            strict_1.default.ok(result.includes('09:00'));
            strict_1.default.ok(result.includes('10:00'));
        });
    });
    (0, node_test_1.describe)('getNextTrainingDate', () => {
        (0, node_test_1.default)('returns null for session with no future dates', () => {
            const session = {
                schedule: [{ date: '2020-01-01', startTime: '09:00', endTime: '10:00' }],
            };
            strict_1.default.equal(session_scheduling_service_1.sessionSchedulingService.getNextTrainingDate(session), null);
        });
        (0, node_test_1.default)('returns next date for session with future dates', () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const session = {
                schedule: [
                    { date: '2020-01-01', startTime: '09:00', endTime: '10:00' },
                    { date: futureDate, startTime: '09:00', endTime: '10:00' },
                ],
            };
            const next = session_scheduling_service_1.sessionSchedulingService.getNextTrainingDate(session);
            strict_1.default.ok(next);
            strict_1.default.equal(next.date, futureDate);
        });
    });
});
