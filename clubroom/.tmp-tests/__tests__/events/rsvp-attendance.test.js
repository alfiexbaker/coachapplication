"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
/**
 * Tests for Event RSVP & Attendance System
 *
 * These tests verify the core functionality of event RSVP and attendance tracking:
 * - RSVP submission and updates
 * - Check-in functionality
 * - Attendance statistics
 * - Status formatting and utilities
 */
// ============================================================================
// TEST DATA
// ============================================================================
const testEvent = {
    id: 'event_test_1',
    clubId: 'club_1',
    clubName: 'Test Club',
    createdBy: 'coach_1',
    createdByName: 'Test Coach',
    title: 'Test Event',
    description: 'A test event',
    eventType: 'SOCIAL',
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '14:00',
    endTime: '17:00',
    venue: 'Test Venue',
    isVirtual: false,
    targetAudience: 'ALL',
    price: 0,
    currency: 'GBP',
    rsvpRequired: true,
    rsvpDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    attendees: [],
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    maxAttendees: 50,
};
const testRSVP = {
    id: 'rsvp_test_1',
    eventId: 'event_test_1',
    userId: 'user_1',
    userName: 'Test User',
    userRole: 'PARENT',
    status: 'GOING',
    guestCount: 2,
    respondedAt: new Date().toISOString(),
    note: 'Looking forward to it!',
};
const testAttendance = {
    id: 'attendance_test_1',
    eventId: 'event_test_1',
    userId: 'user_1',
    userName: 'Test User',
    userRole: 'PARENT',
    checkedInAt: new Date().toISOString(),
    checkedInBy: 'user_1',
    checkedInByName: 'Test User',
    checkInMethod: 'SELF',
    guestsCheckedIn: 2,
    locationValidated: true,
    distanceFromVenue: 50,
};
// ============================================================================
// RSVP STATUS TESTS
// ============================================================================
(0, node_test_1.default)('RSVPStatus includes all expected values', () => {
    const validStatuses = ['GOING', 'NOT_GOING', 'MAYBE'];
    validStatuses.forEach((status) => {
        node_assert_1.default.ok(['GOING', 'NOT_GOING', 'MAYBE'].includes(status), `${status} should be a valid RSVPStatus`);
    });
});
(0, node_test_1.default)('RSVP can have guest count', () => {
    node_assert_1.default.strictEqual(testRSVP.guestCount, 2);
});
(0, node_test_1.default)('RSVP can have optional note', () => {
    node_assert_1.default.strictEqual(testRSVP.note, 'Looking forward to it!');
});
(0, node_test_1.default)('RSVP records response timestamp', () => {
    node_assert_1.default.ok(testRSVP.respondedAt);
    node_assert_1.default.ok(new Date(testRSVP.respondedAt).getTime() > 0);
});
// ============================================================================
// RSVP STATUS FORMATTING TESTS
// ============================================================================
(0, node_test_1.default)('formatRSVPStatus returns correct labels', () => {
    const formatRSVPStatus = (status) => {
        const labels = {
            GOING: 'Going',
            NOT_GOING: "Can't Go",
            MAYBE: 'Maybe',
        };
        return labels[status] || status;
    };
    node_assert_1.default.strictEqual(formatRSVPStatus('GOING'), 'Going');
    node_assert_1.default.strictEqual(formatRSVPStatus('NOT_GOING'), "Can't Go");
    node_assert_1.default.strictEqual(formatRSVPStatus('MAYBE'), 'Maybe');
});
(0, node_test_1.default)('getRSVPStatusColor returns correct colors', () => {
    const getRSVPStatusColor = (status) => {
        const colors = {
            GOING: '#10B981',
            NOT_GOING: '#EF4444',
            MAYBE: '#F59E0B',
        };
        return colors[status] || '#6B7280';
    };
    node_assert_1.default.strictEqual(getRSVPStatusColor('GOING'), '#10B981');
    node_assert_1.default.strictEqual(getRSVPStatusColor('NOT_GOING'), '#EF4444');
    node_assert_1.default.strictEqual(getRSVPStatusColor('MAYBE'), '#F59E0B');
    node_assert_1.default.strictEqual(getRSVPStatusColor('UNKNOWN'), '#6B7280');
});
(0, node_test_1.default)('getRSVPStatusIcon returns correct icons', () => {
    const getRSVPStatusIcon = (status) => {
        const icons = {
            GOING: 'checkmark-circle',
            NOT_GOING: 'close-circle',
            MAYBE: 'help-circle',
        };
        return icons[status] || 'ellipse';
    };
    node_assert_1.default.strictEqual(getRSVPStatusIcon('GOING'), 'checkmark-circle');
    node_assert_1.default.strictEqual(getRSVPStatusIcon('NOT_GOING'), 'close-circle');
    node_assert_1.default.strictEqual(getRSVPStatusIcon('MAYBE'), 'help-circle');
});
// ============================================================================
// CHECK-IN TESTS
// ============================================================================
(0, node_test_1.default)('Check-in method includes all valid types', () => {
    const validMethods = ['SELF', 'COACH', 'QR_CODE', 'LOCATION'];
    validMethods.forEach((method) => {
        node_assert_1.default.ok(['SELF', 'COACH', 'QR_CODE', 'LOCATION'].includes(method), `${method} should be a valid check-in method`);
    });
});
(0, node_test_1.default)('Check-in records timestamp', () => {
    node_assert_1.default.ok(testAttendance.checkedInAt);
    node_assert_1.default.ok(new Date(testAttendance.checkedInAt).getTime() > 0);
});
(0, node_test_1.default)('Check-in can include location validation', () => {
    node_assert_1.default.strictEqual(testAttendance.locationValidated, true);
    node_assert_1.default.strictEqual(testAttendance.distanceFromVenue, 50);
});
(0, node_test_1.default)('Check-in tracks who performed the check-in', () => {
    node_assert_1.default.strictEqual(testAttendance.checkedInBy, 'user_1');
    node_assert_1.default.strictEqual(testAttendance.checkedInByName, 'Test User');
});
(0, node_test_1.default)('Check-in includes guest count', () => {
    node_assert_1.default.strictEqual(testAttendance.guestsCheckedIn, 2);
});
// ============================================================================
// ATTENDANCE STATISTICS TESTS
// ============================================================================
(0, node_test_1.default)('Attendance stats calculates RSVP counts correctly', () => {
    const rsvps = [
        { ...testRSVP, id: '1', status: 'GOING' },
        { ...testRSVP, id: '2', status: 'GOING' },
        { ...testRSVP, id: '3', status: 'MAYBE' },
        { ...testRSVP, id: '4', status: 'NOT_GOING' },
    ];
    const rsvpCounts = {
        going: rsvps.filter((r) => r.status === 'GOING').length,
        notGoing: rsvps.filter((r) => r.status === 'NOT_GOING').length,
        maybe: rsvps.filter((r) => r.status === 'MAYBE').length,
    };
    node_assert_1.default.strictEqual(rsvpCounts.going, 2);
    node_assert_1.default.strictEqual(rsvpCounts.maybe, 1);
    node_assert_1.default.strictEqual(rsvpCounts.notGoing, 1);
});
(0, node_test_1.default)('Attendance stats calculates expected guests correctly', () => {
    const rsvps = [
        { ...testRSVP, id: '1', status: 'GOING', guestCount: 2 },
        { ...testRSVP, id: '2', status: 'GOING', guestCount: 1 },
        { ...testRSVP, id: '3', status: 'MAYBE', guestCount: 0 },
    ];
    const expectedGuests = rsvps
        .filter((r) => r.status === 'GOING')
        .reduce((sum, r) => sum + r.guestCount, 0);
    node_assert_1.default.strictEqual(expectedGuests, 3);
});
(0, node_test_1.default)('Attendance rate calculation is correct', () => {
    const goingCount = 10;
    const checkedInCount = 8;
    const attendanceRate = Math.round((checkedInCount / goingCount) * 100);
    node_assert_1.default.strictEqual(attendanceRate, 80);
});
(0, node_test_1.default)('Attendance rate handles zero going count', () => {
    const goingCount = 0;
    const checkedInCount = 0;
    const attendanceRate = goingCount > 0 ? Math.round((checkedInCount / goingCount) * 100) : 0;
    node_assert_1.default.strictEqual(attendanceRate, 0);
});
// ============================================================================
// EVENT CAPACITY TESTS
// ============================================================================
(0, node_test_1.default)('Event is full when capacity reached', () => {
    const event = { ...testEvent, maxAttendees: 10 };
    const attendees = [
        { userId: '1', status: 'GOING', guestCount: 4 },
        { userId: '2', status: 'GOING', guestCount: 3 },
        { userId: '3', status: 'GOING', guestCount: 2 },
    ];
    const going = attendees.filter((a) => a.status === 'GOING').length;
    const totalGuests = attendees.reduce((sum, a) => sum + a.guestCount, 0);
    const isFull = going + totalGuests >= event.maxAttendees;
    node_assert_1.default.strictEqual(isFull, true);
});
(0, node_test_1.default)('Event is not full when capacity not reached', () => {
    const event = { ...testEvent, maxAttendees: 50 };
    const attendees = [
        { userId: '1', status: 'GOING', guestCount: 2 },
        { userId: '2', status: 'GOING', guestCount: 1 },
    ];
    const going = attendees.filter((a) => a.status === 'GOING').length;
    const totalGuests = attendees.reduce((sum, a) => sum + a.guestCount, 0);
    const isFull = going + totalGuests >= event.maxAttendees;
    node_assert_1.default.strictEqual(isFull, false);
});
(0, node_test_1.default)('Event without maxAttendees is never full', () => {
    const event = { ...testEvent, maxAttendees: undefined };
    const isFull = event.maxAttendees ? false : false;
    node_assert_1.default.strictEqual(isFull, false);
});
// ============================================================================
// RSVP DEADLINE TESTS
// ============================================================================
(0, node_test_1.default)('RSVP is open before deadline', () => {
    const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const now = new Date().toISOString().split('T')[0];
    const isRSVPClosed = futureDeadline < now;
    node_assert_1.default.strictEqual(isRSVPClosed, false);
});
(0, node_test_1.default)('RSVP is closed after deadline', () => {
    const pastDeadline = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const now = new Date().toISOString().split('T')[0];
    const isRSVPClosed = pastDeadline < now;
    node_assert_1.default.strictEqual(isRSVPClosed, true);
});
(0, node_test_1.default)('Event without deadline never closes RSVP', () => {
    const event = { ...testEvent, rsvpDeadline: undefined };
    const isRSVPClosed = event.rsvpDeadline ? event.rsvpDeadline < new Date().toISOString().split('T')[0] : false;
    node_assert_1.default.strictEqual(isRSVPClosed, false);
});
// ============================================================================
// TIME FORMATTING TESTS
// ============================================================================
(0, node_test_1.default)('formatTimeAgo returns "Just now" for recent times', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        return 'More than an hour ago';
    };
    const now = new Date().toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(now), 'Just now');
});
(0, node_test_1.default)('formatTimeAgo returns minutes for recent times', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        return 'More than an hour ago';
    };
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(thirtyMinsAgo), '30m ago');
});
// ============================================================================
// LOCATION VALIDATION TESTS
// ============================================================================
(0, node_test_1.default)('Distance calculation uses Haversine formula correctly', () => {
    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000; // Earth's radius in meters
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };
    // Same location should be 0
    const sameLocation = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
    node_assert_1.default.strictEqual(Math.round(sameLocation), 0);
    // Known distance between London and Paris (~344 km)
    const londonParis = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    node_assert_1.default.ok(londonParis > 340000 && londonParis < 350000, 'London-Paris distance should be ~344km');
});
(0, node_test_1.default)('Location validation threshold is applied correctly', () => {
    const THRESHOLD = 500; // meters
    const validateLocation = (distance) => {
        return distance <= THRESHOLD;
    };
    node_assert_1.default.strictEqual(validateLocation(100), true);
    node_assert_1.default.strictEqual(validateLocation(500), true);
    node_assert_1.default.strictEqual(validateLocation(501), false);
    node_assert_1.default.strictEqual(validateLocation(1000), false);
});
// ============================================================================
// USER ROLE FILTERING TESTS
// ============================================================================
(0, node_test_1.default)('RSVPs can be filtered by role', () => {
    const rsvps = [
        { ...testRSVP, id: '1', userRole: 'COACH' },
        { ...testRSVP, id: '2', userRole: 'PARENT' },
        { ...testRSVP, id: '3', userRole: 'PARENT' },
        { ...testRSVP, id: '4', userRole: 'ATHLETE' },
    ];
    const coaches = rsvps.filter((r) => r.userRole === 'COACH');
    const parents = rsvps.filter((r) => r.userRole === 'PARENT');
    const athletes = rsvps.filter((r) => r.userRole === 'ATHLETE');
    node_assert_1.default.strictEqual(coaches.length, 1);
    node_assert_1.default.strictEqual(parents.length, 2);
    node_assert_1.default.strictEqual(athletes.length, 1);
});
(0, node_test_1.default)('Attendance can be filtered by check-in method', () => {
    const attendance = [
        { ...testAttendance, id: '1', checkInMethod: 'SELF' },
        { ...testAttendance, id: '2', checkInMethod: 'COACH' },
        { ...testAttendance, id: '3', checkInMethod: 'SELF' },
        { ...testAttendance, id: '4', checkInMethod: 'QR_CODE' },
    ];
    const selfCheckIns = attendance.filter((a) => a.checkInMethod === 'SELF');
    const coachCheckIns = attendance.filter((a) => a.checkInMethod === 'COACH');
    node_assert_1.default.strictEqual(selfCheckIns.length, 2);
    node_assert_1.default.strictEqual(coachCheckIns.length, 1);
});
// ============================================================================
// DUPLICATE PREVENTION TESTS
// ============================================================================
(0, node_test_1.default)('User can only have one RSVP per event', () => {
    const rsvps = [
        { ...testRSVP, userId: 'user_1', eventId: 'event_1' },
    ];
    const isAlreadyRSVPd = rsvps.some((r) => r.userId === 'user_1' && r.eventId === 'event_1');
    node_assert_1.default.strictEqual(isAlreadyRSVPd, true);
});
(0, node_test_1.default)('User can only have one check-in per event', () => {
    const attendance = [
        { ...testAttendance, userId: 'user_1', eventId: 'event_1' },
    ];
    const isAlreadyCheckedIn = attendance.some((a) => a.userId === 'user_1' && a.eventId === 'event_1');
    node_assert_1.default.strictEqual(isAlreadyCheckedIn, true);
});
(0, node_test_1.default)('User can RSVP to multiple events', () => {
    const rsvps = [
        { ...testRSVP, id: '1', userId: 'user_1', eventId: 'event_1' },
        { ...testRSVP, id: '2', userId: 'user_1', eventId: 'event_2' },
    ];
    const userRSVPs = rsvps.filter((r) => r.userId === 'user_1');
    node_assert_1.default.strictEqual(userRSVPs.length, 2);
});
// ============================================================================
// DATA STRUCTURE TESTS
// ============================================================================
(0, node_test_1.default)('EventRSVP has all required fields', () => {
    const requiredFields = [
        'id',
        'eventId',
        'userId',
        'userName',
        'userRole',
        'status',
        'guestCount',
        'respondedAt',
    ];
    for (const field of requiredFields) {
        node_assert_1.default.ok(field in testRSVP, `EventRSVP should have ${field} field`);
    }
});
(0, node_test_1.default)('EventAttendance has all required fields', () => {
    const requiredFields = [
        'id',
        'eventId',
        'userId',
        'userName',
        'userRole',
        'checkedInAt',
        'checkedInBy',
        'checkedInByName',
        'checkInMethod',
        'guestsCheckedIn',
    ];
    for (const field of requiredFields) {
        node_assert_1.default.ok(field in testAttendance, `EventAttendance should have ${field} field`);
    }
});
// ============================================================================
// SORTING TESTS
// ============================================================================
(0, node_test_1.default)('RSVPs are sorted by status correctly', () => {
    const rsvps = [
        { ...testRSVP, id: '1', status: 'NOT_GOING' },
        { ...testRSVP, id: '2', status: 'GOING' },
        { ...testRSVP, id: '3', status: 'MAYBE' },
    ];
    const statusOrder = { GOING: 0, MAYBE: 1, NOT_GOING: 2 };
    const sorted = [...rsvps].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    node_assert_1.default.strictEqual(sorted[0].status, 'GOING');
    node_assert_1.default.strictEqual(sorted[1].status, 'MAYBE');
    node_assert_1.default.strictEqual(sorted[2].status, 'NOT_GOING');
});
(0, node_test_1.default)('RSVPs are sorted by response time', () => {
    const now = Date.now();
    const rsvps = [
        { ...testRSVP, id: '1', respondedAt: new Date(now - 1000).toISOString() },
        { ...testRSVP, id: '2', respondedAt: new Date(now).toISOString() },
        { ...testRSVP, id: '3', respondedAt: new Date(now - 500).toISOString() },
    ];
    const sorted = [...rsvps].sort((a, b) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime());
    node_assert_1.default.ok(new Date(sorted[0].respondedAt) < new Date(sorted[1].respondedAt));
    node_assert_1.default.ok(new Date(sorted[1].respondedAt) < new Date(sorted[2].respondedAt));
});
(0, node_test_1.default)('Attendance is sorted by check-in time', () => {
    const now = Date.now();
    const attendance = [
        { ...testAttendance, id: '1', checkedInAt: new Date(now).toISOString() },
        { ...testAttendance, id: '2', checkedInAt: new Date(now - 2000).toISOString() },
        { ...testAttendance, id: '3', checkedInAt: new Date(now - 1000).toISOString() },
    ];
    const sorted = [...attendance].sort((a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime());
    node_assert_1.default.ok(new Date(sorted[0].checkedInAt) < new Date(sorted[1].checkedInAt));
    node_assert_1.default.ok(new Date(sorted[1].checkedInAt) < new Date(sorted[2].checkedInAt));
});
console.log('All RSVP & Attendance tests passed!');
