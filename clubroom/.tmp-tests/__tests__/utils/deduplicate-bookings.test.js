"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for deduplicateBookings() — pure function that groups bookings by ID
 * and merges children who share the same booking into a single row.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const use_home_screen_1 = require("@/hooks/use-home-screen");
function makeChild(id, name, colorCode = '#FF0000') {
    return {
        id,
        referenceId: id,
        profileId: `profile-${id}`,
        name,
        fullName: name,
        colorCode,
        initials: name.charAt(0),
        age: 10,
        avatarUrl: null,
        dateOfBirth: null,
        hasSpecialNeeds: false,
        profile: null,
        squadIds: [],
        clubIds: [],
    };
}
function makeBooking(overrides) {
    return {
        coachId: 'coach-1',
        coachName: 'Coach A',
        athleteId: '',
        status: 'CONFIRMED',
        type: '1-on-1',
        duration: 60,
        price: 20,
        location: 'Field 1',
        ...overrides,
    };
}
(0, node_test_1.describe)('deduplicateBookings', () => {
    const childA = makeChild('child-a', 'Alice', '#FF0000');
    const childB = makeChild('child-b', 'Bob', '#00FF00');
    const childC = makeChild('child-c', 'Charlie', '#0000FF');
    (0, node_test_1.it)('returns empty array for empty bookings', () => {
        const rows = (0, use_home_screen_1.deduplicateBookings)([], [childA, childB]);
        strict_1.default.equal(rows.length, 0);
    });
    (0, node_test_1.it)('returns empty array for empty children', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-a',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], []);
        // Booking has no matching children, so childEntries empty
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 0);
        strict_1.default.equal(rows[0].isShared, false);
    });
    (0, node_test_1.it)('maps single child booking via athleteId', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-a',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA, childB]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 1);
        strict_1.default.equal(rows[0].children[0].id, 'child-a');
        strict_1.default.equal(rows[0].children[0].name, 'Alice');
        strict_1.default.equal(rows[0].children[0].colorCode, '#FF0000');
        strict_1.default.equal(rows[0].isShared, false);
    });
    (0, node_test_1.it)('maps multiple children via athleteIds', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteIds: ['child-a', 'child-b'],
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA, childB]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 2);
        strict_1.default.equal(rows[0].isShared, true);
        const names = rows[0].children.map((c) => c.name);
        strict_1.default.ok(names.includes('Alice'));
        strict_1.default.ok(names.includes('Bob'));
    });
    (0, node_test_1.it)('deduplicates same booking ID appearing twice (different athleteId)', () => {
        const booking1 = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-a',
        });
        const booking2 = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-b',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking1, booking2], [childA, childB]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 2);
        strict_1.default.equal(rows[0].isShared, true);
    });
    (0, node_test_1.it)('does not duplicate athleteId that also appears in athleteIds', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-a',
            athleteIds: ['child-a', 'child-b'],
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA, childB]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 2); // Not 3
        strict_1.default.equal(rows[0].isShared, true);
    });
    (0, node_test_1.it)('ignores athleteIds not in children list', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteIds: ['child-a', 'unknown-child'],
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 1);
        strict_1.default.equal(rows[0].children[0].id, 'child-a');
        strict_1.default.equal(rows[0].isShared, false);
    });
    (0, node_test_1.it)('sorts output by scheduledAt ascending', () => {
        const laterBooking = makeBooking({
            id: 'b2',
            scheduledAt: '2026-03-02T10:00:00Z',
            athleteId: 'child-a',
        });
        const earlierBooking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'child-b',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([laterBooking, earlierBooking], [childA, childB]);
        strict_1.default.equal(rows.length, 2);
        strict_1.default.equal(rows[0].booking.id, 'b1');
        strict_1.default.equal(rows[1].booking.id, 'b2');
    });
    (0, node_test_1.it)('handles three children sharing one booking', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteIds: ['child-a', 'child-b', 'child-c'],
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA, childB, childC]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 3);
        strict_1.default.equal(rows[0].isShared, true);
    });
    (0, node_test_1.it)('handles mix of shared and individual bookings', () => {
        const shared = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteIds: ['child-a', 'child-b'],
        });
        const individual = makeBooking({
            id: 'b2',
            scheduledAt: '2026-03-01T11:00:00Z',
            athleteId: 'child-a',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([shared, individual], [childA, childB]);
        strict_1.default.equal(rows.length, 2);
        const sharedRow = rows.find((r) => r.booking.id === 'b1');
        const individualRow = rows.find((r) => r.booking.id === 'b2');
        strict_1.default.equal(sharedRow.isShared, true);
        strict_1.default.equal(sharedRow.children.length, 2);
        strict_1.default.equal(individualRow.isShared, false);
        strict_1.default.equal(individualRow.children.length, 1);
    });
    (0, node_test_1.it)('booking with no matching athleteId or athleteIds gets 0 children', () => {
        const booking = makeBooking({
            id: 'b1',
            scheduledAt: '2026-03-01T10:00:00Z',
            athleteId: 'other-athlete',
        });
        const rows = (0, use_home_screen_1.deduplicateBookings)([booking], [childA]);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].children.length, 0);
        strict_1.default.equal(rows[0].isShared, false);
    });
});
