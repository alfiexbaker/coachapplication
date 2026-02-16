"use strict";
/**
 * Event RSVP Service Tests
 *
 * Tests for RSVP submission, updates, attendee counting, and calendar queries.
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
const event_rsvp_service_1 = require("../../services/event/event-rsvp-service");
(0, node_test_1.describe)('eventRsvpService', () => {
    (0, node_test_1.describe)('getAttendeeCounts', () => {
        (0, node_test_1.default)('counts by status correctly', () => {
            const attendees = [
                { userId: '1', userRole: 'PARENT', status: 'GOING', guestCount: 2, respondedAt: '' },
                { userId: '2', userRole: 'PARENT', status: 'GOING', guestCount: 1, respondedAt: '' },
                { userId: '3', userRole: 'PARENT', status: 'MAYBE', guestCount: 0, respondedAt: '' },
                { userId: '4', userRole: 'PARENT', status: 'NOT_GOING', guestCount: 0, respondedAt: '' },
            ];
            const counts = event_rsvp_service_1.eventRsvpService.getAttendeeCounts(attendees);
            strict_1.default.equal(counts.going, 2);
            strict_1.default.equal(counts.maybe, 1);
            strict_1.default.equal(counts.notGoing, 1);
            strict_1.default.equal(counts.totalGuests, 3);
        });
        (0, node_test_1.default)('returns zeros for empty array', () => {
            const counts = event_rsvp_service_1.eventRsvpService.getAttendeeCounts([]);
            strict_1.default.equal(counts.going, 0);
            strict_1.default.equal(counts.maybe, 0);
            strict_1.default.equal(counts.notGoing, 0);
            strict_1.default.equal(counts.totalGuests, 0);
        });
    });
    (0, node_test_1.describe)('getUserRSVP', () => {
        (0, node_test_1.default)('finds user RSVP in attendees list', () => {
            const attendees = [
                { userId: 'u1', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
                { userId: 'u2', userRole: 'PARENT', status: 'MAYBE', guestCount: 0, respondedAt: '' },
            ];
            const rsvp = event_rsvp_service_1.eventRsvpService.getUserRSVP(attendees, 'u2');
            strict_1.default.ok(rsvp);
            strict_1.default.equal(rsvp.status, 'MAYBE');
        });
        (0, node_test_1.default)('returns undefined when user has no RSVP', () => {
            const result = event_rsvp_service_1.eventRsvpService.getUserRSVP([], 'nobody');
            strict_1.default.equal(result, undefined);
        });
    });
    (0, node_test_1.describe)('isRSVPClosed', () => {
        (0, node_test_1.default)('returns false when no deadline', () => {
            const event = {};
            strict_1.default.strictEqual(event_rsvp_service_1.eventRsvpService.isRSVPClosed(event), false);
        });
        (0, node_test_1.default)('returns true when deadline has passed', () => {
            const event = { rsvpDeadline: '2020-01-01' };
            strict_1.default.equal(event_rsvp_service_1.eventRsvpService.isRSVPClosed(event), true);
        });
        (0, node_test_1.default)('returns false when deadline is in future', () => {
            const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const event = { rsvpDeadline: future };
            strict_1.default.strictEqual(event_rsvp_service_1.eventRsvpService.isRSVPClosed(event), false);
        });
    });
    (0, node_test_1.describe)('isEventFull', () => {
        (0, node_test_1.default)('returns false when no maxAttendees', () => {
            const event = { attendees: [] };
            strict_1.default.strictEqual(event_rsvp_service_1.eventRsvpService.isEventFull(event), false);
        });
        (0, node_test_1.default)('returns true when at capacity', () => {
            const event = {
                maxAttendees: 2,
                attendees: [
                    { userId: '1', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
                    { userId: '2', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
                ],
            };
            strict_1.default.equal(event_rsvp_service_1.eventRsvpService.isEventFull(event), true);
        });
    });
    (0, node_test_1.describe)('rsvp', () => {
        (0, node_test_1.default)('returns ok for valid event', async () => {
            // First create an event to RSVP to
            const { eventCrudService } = await Promise.resolve().then(() => __importStar(require('../../services/event/event-crud-service')));
            const event = await eventCrudService.createEvent({
                clubId: 'club_1',
                clubName: 'Club',
                createdBy: 'coach_1',
                createdByName: 'Coach',
                title: 'RSVP Test Event',
                description: 'Test',
                eventType: 'SOCIAL',
                date: '2026-08-01',
                startTime: '10:00',
                venue: 'Venue',
                targetAudience: 'ALL',
                price: 0,
                currency: 'GBP',
                rsvpRequired: true,
            });
            const result = await event_rsvp_service_1.eventRsvpService.rsvp(event.id, 'user_rsvp_1', 'Test User', 'PARENT', 'GOING', 1);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'GOING');
            }
        });
        (0, node_test_1.default)('returns err for non-existent event', async () => {
            const result = await event_rsvp_service_1.eventRsvpService.rsvp('nonexistent_event', 'u1', 'Name', 'PARENT', 'GOING');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('updateRSVP', () => {
        (0, node_test_1.default)('returns err for non-existent RSVP', async () => {
            const result = await event_rsvp_service_1.eventRsvpService.updateRSVP('nonexistent_rsvp', 'MAYBE');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('getEventRSVPs', () => {
        (0, node_test_1.default)('returns array of RSVPs', async () => {
            const rsvps = await event_rsvp_service_1.eventRsvpService.getEventRSVPs('event_1');
            strict_1.default.ok(Array.isArray(rsvps));
        });
    });
    (0, node_test_1.describe)('getUserRSVPs', () => {
        (0, node_test_1.default)('returns array of RSVPs for user', async () => {
            const rsvps = await event_rsvp_service_1.eventRsvpService.getUserRSVPs('parent_1');
            strict_1.default.ok(Array.isArray(rsvps));
        });
    });
    (0, node_test_1.describe)('getEventsForCalendar', () => {
        (0, node_test_1.default)('returns array of calendar events', async () => {
            const events = await event_rsvp_service_1.eventRsvpService.getEventsForCalendar('parent_1', '2026-01-01', '2026-12-31');
            strict_1.default.ok(Array.isArray(events));
        });
    });
});
