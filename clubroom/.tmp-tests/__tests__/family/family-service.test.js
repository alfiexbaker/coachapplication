"use strict";
/**
 * Family Service Tests
 *
 * Unit tests for the family service functionality including
 * family members, bookings, calendar, spending, and child progress.
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
const family_1 = require("../../services/family");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await family_1.familyService.seedDemoData();
});
(0, node_test_1.describe)('Family Service', () => {
    (0, node_test_1.describe)('getFamilyMembers', () => {
        (0, node_test_1.default)('should return all family members for a parent', async () => {
            const members = await family_1.familyService.getFamilyMembers('parent1');
            node_assert_1.default.ok(Array.isArray(members));
            node_assert_1.default.ok(members.length >= 2);
            members.forEach((member) => {
                node_assert_1.default.ok(member.id);
                node_assert_1.default.ok(member.name);
                node_assert_1.default.ok(member.relationship);
                node_assert_1.default.ok(typeof member.age === 'number');
                node_assert_1.default.ok(member.colorCode);
                node_assert_1.default.strictEqual(member.isActive, true);
            });
        });
        (0, node_test_1.default)('should return members with color codes assigned', async () => {
            const members = await family_1.familyService.getFamilyMembers('parent1');
            const colorCodes = members.map((m) => m.colorCode);
            // Each member should have a color code
            colorCodes.forEach((color) => {
                node_assert_1.default.ok(color.startsWith('#'));
                node_assert_1.default.strictEqual(color.length, 7);
            });
        });
    });
    (0, node_test_1.describe)('getFamilyMember', () => {
        (0, node_test_1.default)('should return a single family member by ID', async () => {
            const member = await family_1.familyService.getFamilyMember('child_tom');
            node_assert_1.default.ok(member);
            node_assert_1.default.strictEqual(member.id, 'child_tom');
            node_assert_1.default.strictEqual(member.name, 'Tom Henderson');
            node_assert_1.default.strictEqual(member.relationship, 'son');
        });
        (0, node_test_1.default)('should return null for non-existent member', async () => {
            const member = await family_1.familyService.getFamilyMember('non_existent');
            node_assert_1.default.strictEqual(member, null);
        });
    });
    (0, node_test_1.describe)('addFamilyMember', () => {
        (0, node_test_1.default)('should add a new family member with generated fields', async () => {
            const newMember = await family_1.familyService.addFamilyMember('parent1', {
                name: 'Lucy Henderson',
                relationship: 'daughter',
                age: 8,
            });
            node_assert_1.default.ok(newMember.id.startsWith('child_'));
            node_assert_1.default.strictEqual(newMember.name, 'Lucy Henderson');
            node_assert_1.default.strictEqual(newMember.relationship, 'daughter');
            node_assert_1.default.strictEqual(newMember.age, 8);
            node_assert_1.default.ok(newMember.colorCode);
            node_assert_1.default.strictEqual(newMember.isActive, true);
            node_assert_1.default.ok(newMember.addedAt);
        });
        (0, node_test_1.default)('should assign unique color codes to new members', async () => {
            const member1 = await family_1.familyService.addFamilyMember('parent1', {
                name: 'Child 1',
                relationship: 'son',
                age: 7,
            });
            const member2 = await family_1.familyService.addFamilyMember('parent1', {
                name: 'Child 2',
                relationship: 'daughter',
                age: 6,
            });
            // Color codes should be assigned from the palette
            node_assert_1.default.ok(member1.colorCode);
            node_assert_1.default.ok(member2.colorCode);
        });
    });
    (0, node_test_1.describe)('updateFamilyMember', () => {
        (0, node_test_1.default)('should update family member fields', async () => {
            const updated = await family_1.familyService.updateFamilyMember('child_tom', {
                age: 13,
                skillLevel: 'ADVANCED',
            });
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.age, 13);
            node_assert_1.default.strictEqual(updated.skillLevel, 'ADVANCED');
        });
        (0, node_test_1.default)('should return null for non-existent member', async () => {
            const result = await family_1.familyService.updateFamilyMember('non_existent', { age: 10 });
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('getFamilyBookings', () => {
        (0, node_test_1.default)('should return all bookings for the family', async () => {
            const bookings = await family_1.familyService.getFamilyBookings('parent1');
            node_assert_1.default.ok(Array.isArray(bookings));
            node_assert_1.default.ok(bookings.length > 0);
            bookings.forEach((booking) => {
                node_assert_1.default.ok(booking.id);
                node_assert_1.default.ok(booking.childId);
                node_assert_1.default.ok(booking.childName);
                node_assert_1.default.ok(booking.colorCode);
                node_assert_1.default.ok(booking.title);
                node_assert_1.default.ok(booking.start);
                node_assert_1.default.ok(booking.end);
                node_assert_1.default.ok(['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'].includes(booking.status));
            });
        });
        (0, node_test_1.default)('should sort bookings by date descending', async () => {
            const bookings = await family_1.familyService.getFamilyBookings('parent1');
            for (let i = 0; i < bookings.length - 1; i++) {
                const current = new Date(bookings[i].start).getTime();
                const next = new Date(bookings[i + 1].start).getTime();
                node_assert_1.default.ok(current >= next, 'Bookings should be sorted by date descending');
            }
        });
    });
    (0, node_test_1.describe)('getChildBookings', () => {
        (0, node_test_1.default)('should return bookings only for a specific child', async () => {
            const bookings = await family_1.familyService.getChildBookings('child_tom');
            node_assert_1.default.ok(Array.isArray(bookings));
            bookings.forEach((booking) => {
                node_assert_1.default.strictEqual(booking.childId, 'child_tom');
            });
        });
    });
    (0, node_test_1.describe)('getFamilyCalendar', () => {
        (0, node_test_1.default)('should return events within the date range', async () => {
            const dateRange = {
                startDate: '2025-01-01T00:00:00.000Z',
                endDate: '2025-01-31T23:59:59.999Z',
            };
            const events = await family_1.familyService.getFamilyCalendar('parent1', dateRange);
            node_assert_1.default.ok(Array.isArray(events));
            events.forEach((event) => {
                const eventDate = new Date(event.start).getTime();
                const startDate = new Date(dateRange.startDate).getTime();
                const endDate = new Date(dateRange.endDate).getTime();
                node_assert_1.default.ok(eventDate >= startDate && eventDate <= endDate);
            });
        });
        (0, node_test_1.default)('should sort calendar events by date ascending', async () => {
            const dateRange = {
                startDate: '2025-01-01T00:00:00.000Z',
                endDate: '2025-12-31T23:59:59.999Z',
            };
            const events = await family_1.familyService.getFamilyCalendar('parent1', dateRange);
            for (let i = 0; i < events.length - 1; i++) {
                const current = new Date(events[i].start).getTime();
                const next = new Date(events[i + 1].start).getTime();
                node_assert_1.default.ok(current <= next, 'Calendar events should be sorted by date ascending');
            }
        });
    });
    (0, node_test_1.describe)('getUpcomingForFamily', () => {
        (0, node_test_1.default)('should return only future sessions', async () => {
            const upcoming = await family_1.familyService.getUpcomingForFamily('parent1');
            const now = Date.now();
            node_assert_1.default.ok(Array.isArray(upcoming));
            upcoming.forEach((session) => {
                const sessionDate = new Date(session.start).getTime();
                node_assert_1.default.ok(sessionDate > now, 'Session should be in the future');
            });
        });
        (0, node_test_1.default)('should only return confirmed or pending sessions', async () => {
            const upcoming = await family_1.familyService.getUpcomingForFamily('parent1');
            upcoming.forEach((session) => {
                node_assert_1.default.ok(session.status === 'CONFIRMED' || session.status === 'PENDING', 'Session should be confirmed or pending');
            });
        });
        (0, node_test_1.default)('should respect the limit parameter', async () => {
            const limit = 2;
            const upcoming = await family_1.familyService.getUpcomingForFamily('parent1', limit);
            node_assert_1.default.ok(upcoming.length <= limit);
        });
        (0, node_test_1.default)('should sort sessions by date ascending', async () => {
            const upcoming = await family_1.familyService.getUpcomingForFamily('parent1', 10);
            for (let i = 0; i < upcoming.length - 1; i++) {
                const current = new Date(upcoming[i].start).getTime();
                const next = new Date(upcoming[i + 1].start).getTime();
                node_assert_1.default.ok(current <= next, 'Upcoming sessions should be sorted by date ascending');
            }
        });
    });
    (0, node_test_1.describe)('getFamilySpending', () => {
        (0, node_test_1.default)('should return spending breakdown per child', async () => {
            const spending = await family_1.familyService.getFamilySpending('parent1');
            node_assert_1.default.ok(Array.isArray(spending));
            node_assert_1.default.ok(spending.length > 0);
            spending.forEach((childSpending) => {
                node_assert_1.default.ok(childSpending.childId);
                node_assert_1.default.ok(childSpending.childName);
                node_assert_1.default.ok(childSpending.colorCode);
                node_assert_1.default.ok(typeof childSpending.totalSpent === 'number');
                node_assert_1.default.ok(typeof childSpending.sessionCount === 'number');
                node_assert_1.default.ok(typeof childSpending.averagePerSession === 'number');
            });
        });
        (0, node_test_1.default)('should calculate average per session correctly', async () => {
            const spending = await family_1.familyService.getFamilySpending('parent1');
            spending.forEach((childSpending) => {
                if (childSpending.sessionCount > 0) {
                    const expectedAverage = childSpending.totalSpent / childSpending.sessionCount;
                    node_assert_1.default.strictEqual(childSpending.averagePerSession.toFixed(2), expectedAverage.toFixed(2));
                }
                else {
                    node_assert_1.default.strictEqual(childSpending.averagePerSession, 0);
                }
            });
        });
        (0, node_test_1.default)('should include monthly breakdown', async () => {
            const spending = await family_1.familyService.getFamilySpending('parent1');
            spending.forEach((childSpending) => {
                if (childSpending.monthlyBreakdown) {
                    childSpending.monthlyBreakdown.forEach((month) => {
                        node_assert_1.default.ok(month.month.match(/^\d{4}-\d{2}$/), 'Month should be in YYYY-MM format');
                        node_assert_1.default.ok(typeof month.amount === 'number');
                        node_assert_1.default.ok(typeof month.sessionCount === 'number');
                    });
                }
            });
        });
        (0, node_test_1.default)('should include trend information', async () => {
            const spending = await family_1.familyService.getFamilySpending('parent1');
            spending.forEach((childSpending) => {
                if (childSpending.trend) {
                    node_assert_1.default.ok(['up', 'down', 'stable'].includes(childSpending.trend));
                }
                if (childSpending.trendPercent !== undefined) {
                    node_assert_1.default.ok(typeof childSpending.trendPercent === 'number');
                }
            });
        });
    });
    (0, node_test_1.describe)('getFamilySpendingSummary', () => {
        (0, node_test_1.default)('should return spending summary with correct structure', async () => {
            const summary = await family_1.familyService.getFamilySpendingSummary('parent1');
            node_assert_1.default.ok(typeof summary.totalSpent === 'number');
            node_assert_1.default.ok(typeof summary.thisMonth === 'number');
            node_assert_1.default.ok(typeof summary.lastMonth === 'number');
            node_assert_1.default.ok(summary.currency);
            node_assert_1.default.ok(['up', 'down', 'stable'].includes(summary.trend));
            node_assert_1.default.ok(typeof summary.trendPercent === 'number');
        });
    });
    (0, node_test_1.describe)('getChildProgress', () => {
        (0, node_test_1.default)('should return progress summary for a child', async () => {
            const progress = await family_1.familyService.getChildProgress('child_tom');
            node_assert_1.default.ok(progress);
            node_assert_1.default.strictEqual(progress.childId, 'child_tom');
            node_assert_1.default.strictEqual(progress.childName, 'Tom Henderson');
            node_assert_1.default.ok(typeof progress.sessionsCompleted === 'number');
            node_assert_1.default.ok(typeof progress.badgesEarned === 'number');
            node_assert_1.default.ok(typeof progress.activeGoals === 'number');
            node_assert_1.default.ok(typeof progress.completedGoals === 'number');
        });
        (0, node_test_1.default)('should return null for non-existent child', async () => {
            const progress = await family_1.familyService.getChildProgress('non_existent');
            node_assert_1.default.strictEqual(progress, null);
        });
        (0, node_test_1.default)('should include skill progress if available', async () => {
            const progress = await family_1.familyService.getChildProgress('child_tom');
            node_assert_1.default.ok(progress);
            if (progress.skillProgress) {
                node_assert_1.default.ok(Array.isArray(progress.skillProgress));
                progress.skillProgress.forEach((skill) => {
                    node_assert_1.default.ok(skill.skill);
                    node_assert_1.default.ok(typeof skill.level === 'number');
                    node_assert_1.default.ok(typeof skill.change === 'number');
                });
            }
        });
    });
    (0, node_test_1.describe)('getFamilyOverview', () => {
        (0, node_test_1.default)('should return complete overview structure', async () => {
            const overview = await family_1.familyService.getFamilyOverview('parent1');
            node_assert_1.default.ok(typeof overview.totalChildren === 'number');
            node_assert_1.default.ok(typeof overview.upcomingSessions === 'number');
            node_assert_1.default.ok(typeof overview.sessionsThisMonth === 'number');
            node_assert_1.default.ok(typeof overview.spendingThisMonth === 'number');
            node_assert_1.default.ok(typeof overview.totalSpending === 'number');
            node_assert_1.default.ok(overview.currency);
        });
        (0, node_test_1.default)('should include next session if available', async () => {
            const overview = await family_1.familyService.getFamilyOverview('parent1');
            if (overview.nextSession) {
                node_assert_1.default.ok(overview.nextSession.id);
                node_assert_1.default.ok(overview.nextSession.title);
                node_assert_1.default.ok(overview.nextSession.start);
                node_assert_1.default.ok(overview.nextSession.childName);
            }
        });
    });
    (0, node_test_1.describe)('getEventsGroupedByDate', () => {
        (0, node_test_1.default)('should group events by date', async () => {
            const dateRange = {
                startDate: '2025-01-01T00:00:00.000Z',
                endDate: '2025-01-31T23:59:59.999Z',
            };
            const grouped = await family_1.familyService.getEventsGroupedByDate('parent1', dateRange);
            node_assert_1.default.ok(typeof grouped === 'object');
            Object.entries(grouped).forEach(([dateKey, events]) => {
                node_assert_1.default.ok(dateKey.match(/^\d{4}-\d{2}-\d{2}$/), 'Date key should be YYYY-MM-DD format');
                node_assert_1.default.ok(Array.isArray(events));
                events.forEach((event) => {
                    node_assert_1.default.ok(event.start.startsWith(dateKey));
                });
            });
        });
    });
    (0, node_test_1.describe)('Utility Functions', () => {
        (0, node_test_1.default)('getNextChildColor should return valid hex color', () => {
            const color0 = family_1.familyService.getNextChildColor(0);
            const color1 = family_1.familyService.getNextChildColor(1);
            const color8 = family_1.familyService.getNextChildColor(8); // Should wrap around
            node_assert_1.default.ok(color0.startsWith('#'));
            node_assert_1.default.ok(color1.startsWith('#'));
            node_assert_1.default.ok(color8.startsWith('#'));
            node_assert_1.default.strictEqual(color0.length, 7);
        });
        (0, node_test_1.default)('formatAmount should format currency correctly', () => {
            const gbpAmount = family_1.familyService.formatAmount(100.50, 'GBP');
            const usdAmount = family_1.familyService.formatAmount(50, 'USD');
            node_assert_1.default.ok(gbpAmount.includes('\u00A3'));
            node_assert_1.default.ok(gbpAmount.includes('100.50'));
            node_assert_1.default.ok(usdAmount.includes('$'));
            node_assert_1.default.ok(usdAmount.includes('50.00'));
        });
        (0, node_test_1.default)('formatAmount should handle negative amounts', () => {
            const negative = family_1.familyService.formatAmount(-25.00, 'GBP');
            node_assert_1.default.ok(negative.includes('-'));
            node_assert_1.default.ok(negative.includes('25.00'));
        });
    });
    (0, node_test_1.describe)('Data Management', () => {
        (0, node_test_1.default)('clearAllData should remove all data', async () => {
            await family_1.familyService.clearAllData();
            const members = await family_1.familyService.getFamilyMembers('parent1');
            const bookings = await family_1.familyService.getFamilyBookings('parent1');
            node_assert_1.default.strictEqual(members.length, 0);
            node_assert_1.default.strictEqual(bookings.length, 0);
        });
        (0, node_test_1.default)('seedDemoData should restore mock data', async () => {
            await family_1.familyService.clearAllData();
            await family_1.familyService.seedDemoData();
            const members = await family_1.familyService.getFamilyMembers('parent1');
            node_assert_1.default.ok(members.length > 0);
        });
    });
});
