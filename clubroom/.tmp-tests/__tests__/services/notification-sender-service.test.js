"use strict";
/**
 * Notification Sender Service Tests
 *
 * Tests for the notification sender which applies preference filters.
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
const notification_sender_1 = require("../../services/notification/notification-sender");
(0, node_test_1.describe)('notificationSenderService', () => {
    (0, node_test_1.default)('exports notificationSenderService', () => {
        strict_1.default.ok(notification_sender_1.notificationSenderService);
    });
    (0, node_test_1.describe)('coach notification triggers', () => {
        (0, node_test_1.default)('has notifyCoachNewBooking method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyCoachNewBooking, 'function');
        });
        (0, node_test_1.default)('has notifyCoachBookingCancelled method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyCoachBookingCancelled, 'function');
        });
        (0, node_test_1.default)('has notifyCoachInviteAccepted method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyCoachInviteAccepted, 'function');
        });
        (0, node_test_1.default)('has notifyCoachNewReview method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyCoachNewReview, 'function');
        });
    });
    (0, node_test_1.describe)('parent notification triggers', () => {
        (0, node_test_1.default)('has notifyParentBookingConfirmed method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyParentBookingConfirmed, 'function');
        });
        (0, node_test_1.default)('has notifyParentSessionInvite method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyParentSessionInvite, 'function');
        });
        (0, node_test_1.default)('has notifyParentBadgeAwarded method', () => {
            strict_1.default.equal(typeof notification_sender_1.notificationSenderService.notifyParentBadgeAwarded, 'function');
        });
    });
    (0, node_test_1.describe)('notifyCoachNewBooking', () => {
        (0, node_test_1.default)('does not throw when called', async () => {
            await strict_1.default.doesNotReject(async () => {
                await notification_sender_1.notificationSenderService.notifyCoachNewBooking({
                    coachId: 'coach_1',
                    parentName: 'Parent',
                    childName: 'Child',
                    date: '2026-06-15',
                    bookingId: 'bk_1',
                });
            });
        });
    });
    (0, node_test_1.describe)('notifyParentBookingConfirmed', () => {
        (0, node_test_1.default)('does not throw when called', async () => {
            await strict_1.default.doesNotReject(async () => {
                await notification_sender_1.notificationSenderService.notifyParentBookingConfirmed({
                    parentId: 'parent_1',
                    coachName: 'Coach',
                    date: '2026-06-15',
                    bookingId: 'bk_1',
                });
            });
        });
    });
});
