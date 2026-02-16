"use strict";
/**
 * Event Display Service Tests
 *
 * Pure synchronous formatting helpers — no storage, no async.
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
const event_display_service_1 = require("../../services/event/event-display-service");
(0, node_test_1.describe)('eventDisplayService', () => {
    (0, node_test_1.describe)('formatEventType', () => {
        (0, node_test_1.default)('formats known event types', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventType('SOCIAL'), 'Social Event');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventType('TOURNAMENT'), 'Tournament');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventType('FUNDRAISER'), 'Fundraiser');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventType('TRAINING_CAMP'), 'Training Camp');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventType('MEETING'), 'Meeting');
        });
    });
    (0, node_test_1.describe)('getEventTypeIcon', () => {
        (0, node_test_1.default)('returns icon for each event type', () => {
            const icon = event_display_service_1.eventDisplayService.getEventTypeIcon('SOCIAL');
            strict_1.default.equal(typeof icon, 'string');
            strict_1.default.ok(icon.length > 0);
        });
    });
    (0, node_test_1.describe)('getEventTypeColor', () => {
        (0, node_test_1.default)('returns a color string for each type', () => {
            const color = event_display_service_1.eventDisplayService.getEventTypeColor('SOCIAL');
            strict_1.default.equal(typeof color, 'string');
            strict_1.default.ok(color.startsWith('#'));
        });
    });
    (0, node_test_1.describe)('formatAudience', () => {
        (0, node_test_1.default)('formats known audience types', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatAudience('ALL'), 'Everyone');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatAudience('PARENTS'), 'Parents');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatAudience('COACHES'), 'Coaches Only');
        });
    });
    (0, node_test_1.describe)('formatPrice', () => {
        (0, node_test_1.default)('returns Free for zero price', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatPrice(0), 'Free');
        });
        (0, node_test_1.default)('formats non-zero price in GBP', () => {
            const result = event_display_service_1.eventDisplayService.formatPrice(25);
            strict_1.default.ok(result.includes('25'));
        });
        (0, node_test_1.default)('formats with explicit GBP currency', () => {
            const result = event_display_service_1.eventDisplayService.formatPrice(10, 'GBP');
            strict_1.default.ok(result.includes('10'));
        });
    });
    (0, node_test_1.describe)('formatEventDate', () => {
        (0, node_test_1.default)('formats a date string', () => {
            const result = event_display_service_1.eventDisplayService.formatEventDate('2026-03-15');
            strict_1.default.equal(typeof result, 'string');
            strict_1.default.ok(result.includes('March') || result.includes('Mar'));
        });
    });
    (0, node_test_1.describe)('formatEventTime', () => {
        (0, node_test_1.default)('formats start time only', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventTime('14:00'), '14:00');
        });
        (0, node_test_1.default)('formats start and end time', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatEventTime('14:00', '16:00'), '14:00 - 16:00');
        });
    });
    (0, node_test_1.describe)('formatRSVPStatus', () => {
        (0, node_test_1.default)('formats all statuses', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatRSVPStatus('GOING'), 'Going');
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatRSVPStatus('NOT_GOING'), "Can't Go");
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatRSVPStatus('MAYBE'), 'Maybe');
        });
    });
    (0, node_test_1.describe)('getRSVPStatusColor', () => {
        (0, node_test_1.default)('returns green for GOING', () => {
            const color = event_display_service_1.eventDisplayService.getRSVPStatusColor('GOING');
            strict_1.default.equal(color, '#10B981');
        });
        (0, node_test_1.default)('returns red for NOT_GOING', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.getRSVPStatusColor('NOT_GOING'), '#EF4444');
        });
        (0, node_test_1.default)('returns amber for MAYBE', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.getRSVPStatusColor('MAYBE'), '#F59E0B');
        });
    });
    (0, node_test_1.describe)('getRSVPStatusIcon', () => {
        (0, node_test_1.default)('returns icon names for statuses', () => {
            strict_1.default.equal(event_display_service_1.eventDisplayService.getRSVPStatusIcon('GOING'), 'checkmark-circle');
            strict_1.default.equal(event_display_service_1.eventDisplayService.getRSVPStatusIcon('NOT_GOING'), 'close-circle');
            strict_1.default.equal(event_display_service_1.eventDisplayService.getRSVPStatusIcon('MAYBE'), 'help-circle');
        });
    });
    (0, node_test_1.describe)('formatTimeAgo', () => {
        (0, node_test_1.default)('returns "Just now" for very recent times', () => {
            const now = new Date().toISOString();
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatTimeAgo(now), 'Just now');
        });
        (0, node_test_1.default)('returns minutes ago for recent times', () => {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatTimeAgo(tenMinsAgo), '10m ago');
        });
        (0, node_test_1.default)('returns hours ago', () => {
            const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatTimeAgo(threeHoursAgo), '3h ago');
        });
        (0, node_test_1.default)('returns Yesterday for 1 day ago', () => {
            const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
            strict_1.default.equal(event_display_service_1.eventDisplayService.formatTimeAgo(yesterday), 'Yesterday');
        });
    });
});
