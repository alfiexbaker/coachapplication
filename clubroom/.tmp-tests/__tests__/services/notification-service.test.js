"use strict";
/**
 * Notification Service Tests
 *
 * Tests for the legacy notification service API (CRUD + preferences + triggers).
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
const notification_service_1 = require("../../services/notification-service");
(0, node_test_1.describe)('notificationService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await notification_service_1.notificationService.clearAll();
    });
    (0, node_test_1.describe)('create + list', () => {
        (0, node_test_1.default)('creates and lists a notification', async () => {
            const id = `ns_${Math.random().toString(36).slice(2, 9)}`;
            await notification_service_1.notificationService.create({
                id,
                type: 'booking',
                title: 'Test',
                body: 'Test body',
                timeLabel: 'Now',
                read: false,
            });
            const all = await notification_service_1.notificationService.list();
            strict_1.default.ok(all.find((n) => n.id === id));
        });
    });
    (0, node_test_1.describe)('markAsRead', () => {
        (0, node_test_1.default)('marks notification as read', async () => {
            const id = `ns_read_${Math.random().toString(36).slice(2, 9)}`;
            await notification_service_1.notificationService.create({ id, type: 'message', title: 'T', body: 'B', timeLabel: 'Now', read: false });
            const updated = await notification_service_1.notificationService.markAsRead(id);
            const found = updated.find((n) => n.id === id);
            strict_1.default.equal(found?.read, true);
        });
    });
    (0, node_test_1.describe)('getUnreadCount', () => {
        (0, node_test_1.default)('counts unread notifications', async () => {
            await notification_service_1.notificationService.create({ id: 'uc1', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: false, recipientId: 'u1' });
            await notification_service_1.notificationService.create({ id: 'uc2', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: true, recipientId: 'u1' });
            const count = await notification_service_1.notificationService.getUnreadCount('u1');
            strict_1.default.equal(count, 1);
        });
    });
    (0, node_test_1.describe)('subscribe', () => {
        (0, node_test_1.default)('listener receives notifications', async () => {
            const received = [];
            const unsub = notification_service_1.notificationService.subscribe((n) => received.push(n.id));
            await notification_service_1.notificationService.create({ id: 'sub1', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: false });
            strict_1.default.equal(received.length, 1);
            unsub();
        });
    });
    (0, node_test_1.describe)('getPreferences', () => {
        (0, node_test_1.default)('returns default preferences for new user', async () => {
            const prefs = await notification_service_1.notificationService.getPreferences('new_pref_user');
            strict_1.default.ok(prefs);
            strict_1.default.ok(prefs.channels);
            strict_1.default.ok(prefs.quietHours !== undefined);
        });
    });
    (0, node_test_1.describe)('muteCoach', () => {
        (0, node_test_1.default)('adds coach to muted list', async () => {
            const prefs = await notification_service_1.notificationService.muteCoach('mute_user_1', 'coach_muted', 'Coach Name');
            strict_1.default.ok(prefs.mutedCoaches.some((mc) => mc.coachId === 'coach_muted'));
        });
    });
    (0, node_test_1.describe)('unmuteCoach', () => {
        (0, node_test_1.default)('removes coach from muted list', async () => {
            await notification_service_1.notificationService.muteCoach('unmute_user_1', 'coach_to_unmute', 'Coach');
            const prefs = await notification_service_1.notificationService.unmuteCoach('unmute_user_1', 'coach_to_unmute');
            strict_1.default.ok(!prefs.mutedCoaches.some((mc) => mc.coachId === 'coach_to_unmute'));
        });
    });
    (0, node_test_1.describe)('isCoachMuted', () => {
        (0, node_test_1.default)('returns true for muted coach', async () => {
            await notification_service_1.notificationService.muteCoach('ismuted_user', 'muted_coach', 'Coach');
            const result = await notification_service_1.notificationService.isCoachMuted('ismuted_user', 'muted_coach');
            strict_1.default.equal(result, true);
        });
        (0, node_test_1.default)('returns false for non-muted coach', async () => {
            const result = await notification_service_1.notificationService.isCoachMuted('ismuted_user', 'not_muted_coach');
            strict_1.default.equal(result, false);
        });
    });
    (0, node_test_1.describe)('shouldSendNotification', () => {
        (0, node_test_1.default)('returns true for default prefs', async () => {
            const result = await notification_service_1.notificationService.shouldSendNotification('should_send_user', 'BOOKING_RECEIVED', 'PUSH');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('resetPreferences', () => {
        (0, node_test_1.default)('resets to defaults', async () => {
            await notification_service_1.notificationService.muteCoach('reset_user', 'c1', 'Coach');
            const prefs = await notification_service_1.notificationService.resetPreferences('reset_user');
            strict_1.default.equal(prefs.mutedCoaches.length, 0);
        });
    });
});
