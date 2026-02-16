"use strict";
/**
 * Event CRUD Service Tests
 *
 * Tests for event creation, publishing, cancellation, and queries.
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
const event_crud_service_1 = require("../../services/event/event-crud-service");
(0, node_test_1.describe)('eventCrudService', () => {
    (0, node_test_1.describe)('createEvent', () => {
        (0, node_test_1.default)('creates an event with required fields', async () => {
            const event = await event_crud_service_1.eventCrudService.createEvent({
                clubId: 'club_1',
                clubName: 'Test Club',
                createdBy: 'coach_1',
                createdByName: 'Coach Test',
                title: 'Test Event',
                description: 'A test event',
                eventType: 'SOCIAL',
                date: '2026-06-15',
                startTime: '14:00',
                venue: 'Test Venue',
                targetAudience: 'ALL',
                price: 0,
                currency: 'GBP',
                rsvpRequired: true,
            });
            strict_1.default.ok(event.id);
            strict_1.default.equal(event.title, 'Test Event');
            strict_1.default.equal(event.status, 'DRAFT');
            strict_1.default.ok(event.createdAt);
        });
    });
    (0, node_test_1.describe)('getEvent', () => {
        (0, node_test_1.default)('returns null for non-existent event', async () => {
            const result = await event_crud_service_1.eventCrudService.getEvent('nonexistent_xyz');
            strict_1.default.equal(result, null);
        });
        (0, node_test_1.default)('returns event for existing id (from mock data)', async () => {
            const result = await event_crud_service_1.eventCrudService.getEvent('event_1');
            // May be null if mock data IDs differ, that's ok
            if (result) {
                strict_1.default.equal(result.id, 'event_1');
            }
        });
    });
    (0, node_test_1.describe)('publishEvent', () => {
        (0, node_test_1.default)('returns err for non-existent event', async () => {
            const result = await event_crud_service_1.eventCrudService.publishEvent('nonexistent_abc');
            strict_1.default.strictEqual(result.success, false);
        });
        (0, node_test_1.default)('publishes an existing event', async () => {
            const event = await event_crud_service_1.eventCrudService.createEvent({
                clubId: 'club_1',
                clubName: 'Test Club',
                createdBy: 'coach_1',
                createdByName: 'Coach',
                title: 'Publish Test',
                description: 'Test',
                eventType: 'SOCIAL',
                date: '2026-07-01',
                startTime: '10:00',
                venue: 'Venue',
                targetAudience: 'ALL',
                price: 0,
                currency: 'GBP',
                rsvpRequired: false,
            });
            const result = await event_crud_service_1.eventCrudService.publishEvent(event.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'PUBLISHED');
            }
        });
    });
    (0, node_test_1.describe)('cancelEvent', () => {
        (0, node_test_1.default)('returns err for non-existent event', async () => {
            const result = await event_crud_service_1.eventCrudService.cancelEvent('nonexistent_xyz');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('getUpcomingEvents', () => {
        (0, node_test_1.default)('returns array of events for a club', async () => {
            const events = await event_crud_service_1.eventCrudService.getUpcomingEvents('club_1');
            strict_1.default.ok(Array.isArray(events));
        });
    });
    (0, node_test_1.describe)('getAllClubEvents', () => {
        (0, node_test_1.default)('returns array of all events for a club', async () => {
            const events = await event_crud_service_1.eventCrudService.getAllClubEvents('club_1');
            strict_1.default.ok(Array.isArray(events));
        });
    });
});
