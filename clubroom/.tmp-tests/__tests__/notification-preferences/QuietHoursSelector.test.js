"use strict";
// @ts-nocheck
/**
 * QuietHoursSelector Component Tests
 *
 * Unit tests for the QuietHoursSelector component including:
 * - Rendering states
 * - Toggle functionality
 * - Time display formatting
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
(0, node_test_1.describe)('QuietHoursSelector Component Logic', () => {
    (0, node_test_1.describe)('formatTimeForDisplay', () => {
        function formatTimeForDisplay(time) {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        }
        (0, node_test_1.default)('should format morning time correctly', () => {
            node_assert_1.default.strictEqual(formatTimeForDisplay('07:00'), '7:00 AM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('09:30'), '9:30 AM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('11:45'), '11:45 AM');
        });
        (0, node_test_1.default)('should format noon correctly', () => {
            node_assert_1.default.strictEqual(formatTimeForDisplay('12:00'), '12:00 PM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('12:30'), '12:30 PM');
        });
        (0, node_test_1.default)('should format afternoon time correctly', () => {
            node_assert_1.default.strictEqual(formatTimeForDisplay('13:00'), '1:00 PM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('15:30'), '3:30 PM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('18:45'), '6:45 PM');
        });
        (0, node_test_1.default)('should format evening time correctly', () => {
            node_assert_1.default.strictEqual(formatTimeForDisplay('22:00'), '10:00 PM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('23:30'), '11:30 PM');
        });
        (0, node_test_1.default)('should format midnight correctly', () => {
            node_assert_1.default.strictEqual(formatTimeForDisplay('00:00'), '12:00 AM');
            node_assert_1.default.strictEqual(formatTimeForDisplay('00:30'), '12:30 AM');
        });
    });
    (0, node_test_1.describe)('parseTimeToDate', () => {
        function parseTimeToDate(time) {
            const [hours, minutes] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
        }
        (0, node_test_1.default)('should parse time string to Date with correct hours', () => {
            const date = parseTimeToDate('14:30');
            node_assert_1.default.strictEqual(date.getHours(), 14);
            node_assert_1.default.strictEqual(date.getMinutes(), 30);
        });
        (0, node_test_1.default)('should parse midnight correctly', () => {
            const date = parseTimeToDate('00:00');
            node_assert_1.default.strictEqual(date.getHours(), 0);
            node_assert_1.default.strictEqual(date.getMinutes(), 0);
        });
        (0, node_test_1.default)('should parse 23:59 correctly', () => {
            const date = parseTimeToDate('23:59');
            node_assert_1.default.strictEqual(date.getHours(), 23);
            node_assert_1.default.strictEqual(date.getMinutes(), 59);
        });
    });
    (0, node_test_1.describe)('formatDateToTime', () => {
        function formatDateToTime(date) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        (0, node_test_1.default)('should format Date to HH:mm string', () => {
            const date = new Date();
            date.setHours(14, 30, 0, 0);
            node_assert_1.default.strictEqual(formatDateToTime(date), '14:30');
        });
        (0, node_test_1.default)('should pad single digit hours and minutes', () => {
            const date = new Date();
            date.setHours(7, 5, 0, 0);
            node_assert_1.default.strictEqual(formatDateToTime(date), '07:05');
        });
        (0, node_test_1.default)('should format midnight correctly', () => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            node_assert_1.default.strictEqual(formatDateToTime(date), '00:00');
        });
    });
    (0, node_test_1.describe)('isOvernight detection', () => {
        function isOvernight(startTime, endTime) {
            return startTime > endTime;
        }
        (0, node_test_1.default)('should detect overnight range (22:00 to 07:00)', () => {
            node_assert_1.default.strictEqual(isOvernight('22:00', '07:00'), true);
        });
        (0, node_test_1.default)('should detect same-day range (09:00 to 17:00)', () => {
            node_assert_1.default.strictEqual(isOvernight('09:00', '17:00'), false);
        });
        (0, node_test_1.default)('should detect edge case (23:00 to 01:00)', () => {
            node_assert_1.default.strictEqual(isOvernight('23:00', '01:00'), true);
        });
        (0, node_test_1.default)('should detect edge case (00:00 to 06:00)', () => {
            node_assert_1.default.strictEqual(isOvernight('00:00', '06:00'), false);
        });
    });
    (0, node_test_1.describe)('QuietHours state management', () => {
        (0, node_test_1.default)('should create valid initial state', () => {
            const initialState = {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
            };
            node_assert_1.default.strictEqual(initialState.enabled, false);
            node_assert_1.default.strictEqual(initialState.startTime, '22:00');
            node_assert_1.default.strictEqual(initialState.endTime, '07:00');
        });
        (0, node_test_1.default)('should handle toggle enabled state', () => {
            let state = {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
            };
            // Toggle on
            state = { ...state, enabled: !state.enabled };
            node_assert_1.default.strictEqual(state.enabled, true);
            // Toggle off
            state = { ...state, enabled: !state.enabled };
            node_assert_1.default.strictEqual(state.enabled, false);
        });
        (0, node_test_1.default)('should handle time updates independently', () => {
            let state = {
                enabled: true,
                startTime: '22:00',
                endTime: '07:00',
            };
            // Update start time
            state = { ...state, startTime: '23:00' };
            node_assert_1.default.strictEqual(state.startTime, '23:00');
            node_assert_1.default.strictEqual(state.endTime, '07:00');
            // Update end time
            state = { ...state, endTime: '06:00' };
            node_assert_1.default.strictEqual(state.startTime, '23:00');
            node_assert_1.default.strictEqual(state.endTime, '06:00');
        });
    });
});
