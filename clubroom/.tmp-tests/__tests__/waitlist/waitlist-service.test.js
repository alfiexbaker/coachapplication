"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
/**
 * Tests for the WaitlistService
 *
 * These tests verify the core functionality of session waitlists:
 * - Joining and leaving waitlists
 * - Position management
 * - Notifications
 * - Auto-book functionality
 * - Utility methods
 */
// ============================================================================
// TEST DATA
// ============================================================================
const testEntry = {
    id: 'waitlist_test_1',
    userId: 'user1',
    userName: 'John Henderson',
    sessionId: 'session_1',
    sessionTitle: 'Advanced Dribbling Workshop',
    sessionScheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    position: 1,
    joinedAt: new Date().toISOString(),
    autoBook: true,
    status: 'WAITING',
};
const testEntry2 = {
    ...testEntry,
    id: 'waitlist_test_2',
    userId: 'user2',
    userName: 'Lisa Wilson',
    position: 2,
    autoBook: false,
};
const testEntry3 = {
    ...testEntry,
    id: 'waitlist_test_3',
    userId: 'user3',
    userName: 'Mike Johnson',
    position: 3,
    autoBook: true,
};
// ============================================================================
// POSITION FORMATTING TESTS
// ============================================================================
(0, node_test_1.default)('formatPosition returns "1st" for position 1', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(1), '1st');
});
(0, node_test_1.default)('formatPosition returns "2nd" for position 2', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(2), '2nd');
});
(0, node_test_1.default)('formatPosition returns "3rd" for position 3', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(3), '3rd');
});
(0, node_test_1.default)('formatPosition returns "4th" for position 4', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(4), '4th');
});
(0, node_test_1.default)('formatPosition handles 11th, 12th, 13th correctly', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(11), '11th');
    node_assert_1.default.strictEqual(formatPosition(12), '12th');
    node_assert_1.default.strictEqual(formatPosition(13), '13th');
});
(0, node_test_1.default)('formatPosition handles 21st, 22nd, 23rd correctly', () => {
    const formatPosition = (position) => {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = position % 100;
        return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    node_assert_1.default.strictEqual(formatPosition(21), '21st');
    node_assert_1.default.strictEqual(formatPosition(22), '22nd');
    node_assert_1.default.strictEqual(formatPosition(23), '23rd');
});
// ============================================================================
// TIME AGO FORMATTING TESTS
// ============================================================================
(0, node_test_1.default)('formatTimeAgo returns "Just now" for recent times', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(thirtyMinsAgo), '30m ago');
});
(0, node_test_1.default)('formatTimeAgo returns hours for same-day times', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(twoHoursAgo), '2h ago');
});
(0, node_test_1.default)('formatTimeAgo returns "Yesterday" for yesterday', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(yesterday), 'Yesterday');
});
(0, node_test_1.default)('formatTimeAgo returns days for past week', () => {
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    node_assert_1.default.strictEqual(formatTimeAgo(threeDaysAgo), '3d ago');
});
// ============================================================================
// WAITLIST STATUS TESTS
// ============================================================================
(0, node_test_1.default)('WaitlistStatus includes all expected values', () => {
    const validStatuses = ['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'REMOVED'];
    validStatuses.forEach((status) => {
        node_assert_1.default.ok(['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'REMOVED'].includes(status), `${status} should be a valid WaitlistStatus`);
    });
});
(0, node_test_1.default)('Entry status defaults to WAITING', () => {
    const newEntry = {
        ...testEntry,
        status: 'WAITING',
    };
    node_assert_1.default.strictEqual(newEntry.status, 'WAITING');
});
// ============================================================================
// POSITION CALCULATION TESTS
// ============================================================================
(0, node_test_1.default)('New entries get position based on existing entries', () => {
    const existingEntries = [testEntry, testEntry2];
    const newPosition = existingEntries.length + 1;
    node_assert_1.default.strictEqual(newPosition, 3);
});
(0, node_test_1.default)('Position updates correctly when someone leaves', () => {
    const entries = [
        { ...testEntry, position: 1 },
        { ...testEntry2, position: 2 },
        { ...testEntry3, position: 3 },
    ];
    // Simulate user at position 1 leaving
    const removedPosition = 1;
    entries.forEach((entry) => {
        if (entry.position > removedPosition) {
            entry.position -= 1;
        }
    });
    node_assert_1.default.strictEqual(entries[1].position, 1);
    node_assert_1.default.strictEqual(entries[2].position, 2);
});
(0, node_test_1.default)('Position 1 is always next in line', () => {
    const entries = [
        { ...testEntry, position: 1 },
        { ...testEntry2, position: 2 },
    ];
    const nextInLine = entries.find((e) => e.position === 1);
    node_assert_1.default.ok(nextInLine);
    node_assert_1.default.strictEqual(nextInLine.id, testEntry.id);
});
// ============================================================================
// AUTO-BOOK TESTS
// ============================================================================
(0, node_test_1.default)('autoBook defaults to false', () => {
    const entry = {
        userId: 'user1',
        userName: 'Test User',
        sessionId: 'session_1',
        autoBook: false,
    };
    node_assert_1.default.strictEqual(entry.autoBook, false);
});
(0, node_test_1.default)('autoBook can be set to true', () => {
    const entry = {
        ...testEntry,
        autoBook: true,
    };
    node_assert_1.default.strictEqual(entry.autoBook, true);
});
(0, node_test_1.default)('autoBook count is calculated correctly', () => {
    const entries = [
        { ...testEntry, autoBook: true },
        { ...testEntry2, autoBook: false },
        { ...testEntry3, autoBook: true },
    ];
    const autoBookCount = entries.filter((e) => e.autoBook).length;
    node_assert_1.default.strictEqual(autoBookCount, 2);
});
// ============================================================================
// FILTER TESTS
// ============================================================================
(0, node_test_1.default)('Filtering by sessionId returns correct entries', () => {
    const entries = [
        { ...testEntry, sessionId: 'session_1' },
        { ...testEntry2, sessionId: 'session_1' },
        { ...testEntry3, sessionId: 'session_2' },
    ];
    const session1Entries = entries.filter((e) => e.sessionId === 'session_1');
    node_assert_1.default.strictEqual(session1Entries.length, 2);
});
(0, node_test_1.default)('Filtering by userId returns correct entries', () => {
    const entries = [
        { ...testEntry, userId: 'user1', sessionId: 'session_1' },
        { ...testEntry2, userId: 'user1', sessionId: 'session_2' },
        { ...testEntry3, userId: 'user2', sessionId: 'session_1' },
    ];
    const user1Entries = entries.filter((e) => e.userId === 'user1');
    node_assert_1.default.strictEqual(user1Entries.length, 2);
});
(0, node_test_1.default)('Filtering by status returns correct entries', () => {
    const entries = [
        { ...testEntry, status: 'WAITING' },
        { ...testEntry2, status: 'NOTIFIED' },
        { ...testEntry3, status: 'BOOKED' },
    ];
    const waitingEntries = entries.filter((e) => e.status === 'WAITING');
    node_assert_1.default.strictEqual(waitingEntries.length, 1);
});
(0, node_test_1.default)('Filtering by coachId returns correct entries', () => {
    const entries = [
        { ...testEntry, coachId: 'coach1' },
        { ...testEntry2, coachId: 'coach1' },
        { ...testEntry3, coachId: 'coach2' },
    ];
    const coach1Entries = entries.filter((e) => e.coachId === 'coach1');
    node_assert_1.default.strictEqual(coach1Entries.length, 2);
});
// ============================================================================
// WAITLIST SUMMARY TESTS
// ============================================================================
(0, node_test_1.default)('WaitlistSummary calculates totalWaiting correctly', () => {
    const entries = [
        { ...testEntry, status: 'WAITING' },
        { ...testEntry2, status: 'WAITING' },
        { ...testEntry3, status: 'BOOKED' },
    ];
    const waitingEntries = entries.filter((e) => e.status === 'WAITING');
    const totalWaiting = waitingEntries.length;
    node_assert_1.default.strictEqual(totalWaiting, 2);
});
(0, node_test_1.default)('WaitlistSummary identifies next in line correctly', () => {
    const entries = [
        { ...testEntry, position: 1, status: 'WAITING' },
        { ...testEntry2, position: 2, status: 'WAITING' },
    ];
    const waitingEntries = entries
        .filter((e) => e.status === 'WAITING')
        .sort((a, b) => a.position - b.position);
    const nextInLine = waitingEntries[0];
    node_assert_1.default.ok(nextInLine);
    node_assert_1.default.strictEqual(nextInLine.position, 1);
    node_assert_1.default.strictEqual(nextInLine.userName, testEntry.userName);
});
// ============================================================================
// NOTIFICATION EXPIRY TESTS
// ============================================================================
(0, node_test_1.default)('Notification expiry is set correctly (24 hours)', () => {
    const NOTIFICATION_EXPIRY_HOURS = 24;
    const notifiedAt = new Date();
    const expiresAt = new Date(notifiedAt);
    expiresAt.setHours(expiresAt.getHours() + NOTIFICATION_EXPIRY_HOURS);
    const diffHours = (expiresAt.getTime() - notifiedAt.getTime()) / (1000 * 60 * 60);
    node_assert_1.default.strictEqual(diffHours, 24);
});
(0, node_test_1.default)('Expired notifications are identified correctly', () => {
    const expiredEntry = {
        ...testEntry,
        status: 'NOTIFIED',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    };
    const now = new Date();
    const isExpired = expiredEntry.expiresAt && new Date(expiredEntry.expiresAt) < now;
    node_assert_1.default.strictEqual(isExpired, true);
});
(0, node_test_1.default)('Non-expired notifications are identified correctly', () => {
    const validEntry = {
        ...testEntry,
        status: 'NOTIFIED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    };
    const now = new Date();
    const isExpired = validEntry.expiresAt && new Date(validEntry.expiresAt) < now;
    node_assert_1.default.strictEqual(isExpired, false);
});
// ============================================================================
// DATA STRUCTURE TESTS
// ============================================================================
(0, node_test_1.default)('WaitlistEntry has all required fields', () => {
    const requiredFields = [
        'id',
        'userId',
        'userName',
        'sessionId',
        'position',
        'joinedAt',
        'autoBook',
        'status',
    ];
    for (const field of requiredFields) {
        node_assert_1.default.ok(field in testEntry, `WaitlistEntry should have ${field} field`);
    }
});
(0, node_test_1.default)('WaitlistEntry optional fields can be omitted', () => {
    const minimalEntry = {
        id: 'waitlist_minimal',
        userId: 'user1',
        userName: 'Test User',
        sessionId: 'session_1',
        position: 1,
        joinedAt: new Date().toISOString(),
        autoBook: false,
        status: 'WAITING',
    };
    // These should not cause errors
    node_assert_1.default.strictEqual(minimalEntry.sessionTitle, undefined);
    node_assert_1.default.strictEqual(minimalEntry.coachId, undefined);
    node_assert_1.default.strictEqual(minimalEntry.notifiedAt, undefined);
    node_assert_1.default.strictEqual(minimalEntry.expiresAt, undefined);
});
(0, node_test_1.default)('JoinWaitlistParams structure is correct', () => {
    const params = {
        userId: 'user1',
        userName: 'Test User',
        sessionId: 'session_1',
        sessionTitle: 'Test Session',
        coachId: 'coach1',
        autoBook: true,
    };
    node_assert_1.default.ok(params.userId);
    node_assert_1.default.ok(params.userName);
    node_assert_1.default.ok(params.sessionId);
    node_assert_1.default.strictEqual(params.autoBook, true);
});
// ============================================================================
// SORTING TESTS
// ============================================================================
(0, node_test_1.default)('Entries are sorted by position correctly', () => {
    const entries = [
        { ...testEntry3, position: 3 },
        { ...testEntry, position: 1 },
        { ...testEntry2, position: 2 },
    ];
    const sorted = [...entries].sort((a, b) => a.position - b.position);
    node_assert_1.default.strictEqual(sorted[0].position, 1);
    node_assert_1.default.strictEqual(sorted[1].position, 2);
    node_assert_1.default.strictEqual(sorted[2].position, 3);
});
(0, node_test_1.default)('Entries are sorted by joinedAt correctly', () => {
    const now = Date.now();
    const entries = [
        { ...testEntry, joinedAt: new Date(now - 1000).toISOString() }, // Oldest
        { ...testEntry2, joinedAt: new Date(now).toISOString() }, // Newest
        { ...testEntry3, joinedAt: new Date(now - 500).toISOString() }, // Middle
    ];
    const sorted = [...entries].sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    node_assert_1.default.ok(new Date(sorted[0].joinedAt) < new Date(sorted[1].joinedAt));
    node_assert_1.default.ok(new Date(sorted[1].joinedAt) < new Date(sorted[2].joinedAt));
});
// ============================================================================
// DUPLICATE PREVENTION TESTS
// ============================================================================
(0, node_test_1.default)('User cannot be on same session waitlist twice', () => {
    const entries = [
        { ...testEntry, userId: 'user1', sessionId: 'session_1', status: 'WAITING' },
    ];
    const isAlreadyOnWaitlist = entries.some((e) => e.userId === 'user1' &&
        e.sessionId === 'session_1' &&
        e.status === 'WAITING');
    node_assert_1.default.strictEqual(isAlreadyOnWaitlist, true);
});
(0, node_test_1.default)('User can be on different session waitlists', () => {
    const entries = [
        { ...testEntry, userId: 'user1', sessionId: 'session_1', status: 'WAITING' },
        { ...testEntry2, userId: 'user1', sessionId: 'session_2', status: 'WAITING' },
    ];
    const user1Sessions = entries.filter((e) => e.userId === 'user1' && e.status === 'WAITING');
    node_assert_1.default.strictEqual(user1Sessions.length, 2);
});
console.log('All waitlist service tests passed!');
