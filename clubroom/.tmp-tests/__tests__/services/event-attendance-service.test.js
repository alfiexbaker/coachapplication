"use strict";
/**
 * Event Attendance Service Tests
 *
 * Tests for check-in, attendance tracking, and stats.
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
const event_attendance_service_1 = require("../../services/event/event-attendance-service");
(0, node_test_1.describe)('eventAttendanceService', () => {
    (0, node_test_1.describe)('checkIn', () => {
        (0, node_test_1.default)('creates an attendance record', async () => {
            const attendance = await event_attendance_service_1.eventAttendanceService.checkIn({
                eventId: 'event_1',
                userId: 'user_checkin_1',
                userName: 'Test User',
                userRole: 'PARENT',
                checkedInBy: 'user_checkin_1',
                checkedInByName: 'Test User',
                checkInMethod: 'SELF',
                guestsCheckedIn: 0,
            });
            strict_1.default.ok(attendance.id);
            strict_1.default.equal(attendance.eventId, 'event_1');
            strict_1.default.equal(attendance.userId, 'user_checkin_1');
            strict_1.default.ok(attendance.checkedInAt);
        });
    });
    (0, node_test_1.describe)('getAttendeeList', () => {
        (0, node_test_1.default)('returns array of attendance records', async () => {
            const list = await event_attendance_service_1.eventAttendanceService.getAttendeeList('event_1');
            strict_1.default.ok(Array.isArray(list));
        });
    });
    (0, node_test_1.describe)('isUserCheckedIn', () => {
        (0, node_test_1.default)('returns false for user who has not checked in', async () => {
            const result = await event_attendance_service_1.eventAttendanceService.isUserCheckedIn('event_1', 'random_user_xyz');
            strict_1.default.equal(result, false);
        });
    });
    (0, node_test_1.describe)('getAttendanceStats', () => {
        (0, node_test_1.default)('returns stats object with required fields', async () => {
            const stats = await event_attendance_service_1.eventAttendanceService.getAttendanceStats('event_1');
            strict_1.default.equal(typeof stats.checkedInCount, 'number');
            strict_1.default.equal(typeof stats.guestsCheckedInCount, 'number');
        });
    });
    (0, node_test_1.describe)('isEventToday', () => {
        (0, node_test_1.default)('returns true for an event dated today', () => {
            const today = new Date().toISOString().split('T')[0];
            const event = { date: today };
            strict_1.default.equal(event_attendance_service_1.eventAttendanceService.isEventToday(event), true);
        });
        (0, node_test_1.default)('returns false for a past event', () => {
            const event = { date: '2020-01-01' };
            strict_1.default.equal(event_attendance_service_1.eventAttendanceService.isEventToday(event), false);
        });
    });
    (0, node_test_1.describe)('isCheckInAvailable', () => {
        (0, node_test_1.default)('returns false for non-published event', () => {
            const today = new Date().toISOString().split('T')[0];
            const event = { date: today, status: 'DRAFT', startTime: '09:00', endTime: '10:00' };
            strict_1.default.equal(event_attendance_service_1.eventAttendanceService.isCheckInAvailable(event), false);
        });
        (0, node_test_1.default)('returns boolean for published event', () => {
            const today = new Date().toISOString().split('T')[0];
            const event = { date: today, status: 'PUBLISHED', startTime: '09:00', endTime: '17:00' };
            const result = event_attendance_service_1.eventAttendanceService.isCheckInAvailable(event);
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
});
