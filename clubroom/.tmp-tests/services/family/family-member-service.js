"use strict";
/**
 * Family Member Service
 *
 * Handles CRUD operations for family members (children), bookings,
 * calendar, spending, progress, and overview.
 *
 * Single responsibility: manage family member data and related operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyMemberService = exports.CHILD_COLORS = void 0;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("../event-bus");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('FamilyMemberService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Color palette for children in calendar/charts.
 */
exports.CHILD_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_FAMILY_MEMBERS = [
    {
        id: 'child_tom',
        name: 'Tom Henderson',
        avatar: undefined,
        relationship: 'son',
        age: 12,
        colorCode: exports.CHILD_COLORS[0],
        dateOfBirth: '2013-03-15',
        skillLevel: 'INTERMEDIATE',
        primarySport: 'Football',
        totalSessions: 24,
        totalBadges: 8,
        isActive: true,
        addedAt: '2024-01-10T10:00:00.000Z',
    },
    {
        id: 'child_emma',
        name: 'Emma Henderson',
        avatar: undefined,
        relationship: 'daughter',
        age: 10,
        colorCode: exports.CHILD_COLORS[1],
        dateOfBirth: '2015-07-22',
        skillLevel: 'BEGINNER',
        primarySport: 'Football',
        totalSessions: 12,
        totalBadges: 4,
        isActive: true,
        addedAt: '2024-03-15T14:00:00.000Z',
    },
];
const MOCK_FAMILY_BOOKINGS = [
    // Tom's bookings
    {
        id: 'booking_fam_1',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: '1-on-1 Session',
        description: 'Dribbling and ball control focus',
        start: '2025-01-15T10:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
        location: 'Hackney Sports Field',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'CONFIRMED',
        price: 50,
    },
    {
        id: 'booking_fam_2',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: 'Group Training',
        description: 'Team tactics session',
        start: '2025-01-18T14:00:00.000Z',
        end: '2025-01-18T15:30:00.000Z',
        location: 'Victoria Park',
        coachName: 'Mike Thompson',
        coachId: 'coach_2',
        sessionType: 'Group',
        status: 'CONFIRMED',
        price: 35,
    },
    {
        id: 'booking_fam_3',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: '1-on-1 Session',
        description: 'Finishing practice',
        start: '2025-01-22T10:00:00.000Z',
        end: '2025-01-22T11:00:00.000Z',
        location: 'Hackney Sports Field',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'PENDING',
        price: 50,
    },
    // Emma's bookings
    {
        id: 'booking_fam_4',
        childId: 'child_emma',
        childName: 'Emma Henderson',
        colorCode: exports.CHILD_COLORS[1],
        title: '1-on-1 Session',
        description: 'Basic skills introduction',
        start: '2025-01-16T15:00:00.000Z',
        end: '2025-01-16T16:00:00.000Z',
        location: 'London Fields',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'CONFIRMED',
        price: 50,
    },
    {
        id: 'booking_fam_5',
        childId: 'child_emma',
        childName: 'Emma Henderson',
        colorCode: exports.CHILD_COLORS[1],
        title: 'Kids Camp',
        description: 'Introduction to football',
        start: '2025-01-20T09:00:00.000Z',
        end: '2025-01-20T12:00:00.000Z',
        location: 'Hackney Marshes',
        coachName: 'Amy Taylor',
        coachId: 'coach_3',
        sessionType: 'Camp',
        status: 'CONFIRMED',
        price: 75,
    },
    // Past bookings for spending history
    {
        id: 'booking_fam_past_1',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: '1-on-1 Session',
        start: '2024-12-10T10:00:00.000Z',
        end: '2024-12-10T11:00:00.000Z',
        location: 'Hackney Sports Field',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'COMPLETED',
        price: 50,
    },
    {
        id: 'booking_fam_past_2',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: 'Group Training',
        start: '2024-12-15T14:00:00.000Z',
        end: '2024-12-15T15:30:00.000Z',
        location: 'Victoria Park',
        coachName: 'Mike Thompson',
        coachId: 'coach_2',
        sessionType: 'Group',
        status: 'COMPLETED',
        price: 35,
    },
    {
        id: 'booking_fam_past_3',
        childId: 'child_emma',
        childName: 'Emma Henderson',
        colorCode: exports.CHILD_COLORS[1],
        title: '1-on-1 Session',
        start: '2024-12-12T15:00:00.000Z',
        end: '2024-12-12T16:00:00.000Z',
        location: 'London Fields',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'COMPLETED',
        price: 50,
    },
    {
        id: 'booking_fam_past_4',
        childId: 'child_tom',
        childName: 'Tom Henderson',
        colorCode: exports.CHILD_COLORS[0],
        title: '1-on-1 Session',
        start: '2024-11-20T10:00:00.000Z',
        end: '2024-11-20T11:00:00.000Z',
        location: 'Hackney Sports Field',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        sessionType: '1-on-1',
        status: 'COMPLETED',
        price: 50,
    },
    {
        id: 'booking_fam_past_5',
        childId: 'child_emma',
        childName: 'Emma Henderson',
        colorCode: exports.CHILD_COLORS[1],
        title: 'Kids Camp',
        start: '2024-11-25T09:00:00.000Z',
        end: '2024-11-25T12:00:00.000Z',
        location: 'Hackney Marshes',
        coachName: 'Amy Taylor',
        coachId: 'coach_3',
        sessionType: 'Camp',
        status: 'COMPLETED',
        price: 75,
    },
];
// ============================================================================
// SERVICE CLASS
// ============================================================================
class FamilyMemberService {
    // ==========================================================================
    // STORAGE HELPERS
    // ==========================================================================
    async loadMembers() {
        if (USE_MOCK) {
            return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, MOCK_FAMILY_MEMBERS);
        }
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, []);
    }
    async saveMembers(members) {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, members);
    }
    async loadBookings() {
        if (USE_MOCK) {
            return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, MOCK_FAMILY_BOOKINGS);
        }
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, []);
    }
    async saveBookings(bookings) {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, bookings);
    }
    // ==========================================================================
    // MEMBER CRUD OPERATIONS
    // ==========================================================================
    /**
     * Get all family members (children) for a parent.
     */
    async getFamilyMembers(parentId) {
        try {
            const members = await this.loadMembers();
            logger.info('family_members_retrieved', { parentId, count: members.length });
            return members;
        }
        catch (error) {
            logger.error('get_family_members_failed', { parentId, error });
            return [];
        }
    }
    /**
     * Get a single family member by ID.
     */
    async getFamilyMember(childId) {
        const members = await this.loadMembers();
        return members.find((m) => m.id === childId) || null;
    }
    /**
     * Get a single family member by ID with Result type.
     */
    async getById(childId) {
        try {
            const members = await this.loadMembers();
            const member = members.find((m) => m.id === childId);
            if (!member) {
                return (0, result_1.err)((0, result_1.notFound)('FamilyMember', childId));
            }
            return (0, result_1.ok)(member);
        }
        catch (error) {
            logger.error('get_family_member_failed', { childId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve family member'));
        }
    }
    /**
     * Add a new family member.
     */
    async addFamilyMember(parentId, member) {
        const members = await this.loadMembers();
        const colorIndex = members.length % exports.CHILD_COLORS.length;
        const newMember = {
            ...member,
            id: `child_${Date.now()}`,
            colorCode: exports.CHILD_COLORS[colorIndex],
            isActive: true,
            addedAt: new Date().toISOString(),
        };
        members.push(newMember);
        await this.saveMembers(members);
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.FAMILY_MEMBER_ADDED, {
            familyId: parentId,
            memberId: newMember.id,
        });
        logger.info('family_member_added', { parentId, memberId: newMember.id });
        return newMember;
    }
    /**
     * Create a new family member with Result type.
     */
    async create(parentId, data) {
        try {
            const member = await this.addFamilyMember(parentId, data);
            return (0, result_1.ok)(member);
        }
        catch (error) {
            logger.error('create_family_member_failed', { parentId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to create family member'));
        }
    }
    /**
     * Update a family member.
     */
    async updateFamilyMember(childId, updates) {
        const members = await this.loadMembers();
        const index = members.findIndex((m) => m.id === childId);
        if (index === -1) {
            return null;
        }
        members[index] = { ...members[index], ...updates };
        await this.saveMembers(members);
        logger.info('family_member_updated', { childId });
        return members[index];
    }
    /**
     * Update a family member with Result type.
     */
    async update(childId, updates) {
        try {
            const member = await this.updateFamilyMember(childId, updates);
            if (!member) {
                return (0, result_1.err)((0, result_1.notFound)('FamilyMember', childId));
            }
            return (0, result_1.ok)(member);
        }
        catch (error) {
            logger.error('update_family_member_failed', { childId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update family member'));
        }
    }
    /**
     * Remove a family member (soft delete).
     */
    async remove(childId) {
        const members = await this.loadMembers();
        const index = members.findIndex((m) => m.id === childId);
        if (index === -1) {
            return false;
        }
        members[index].isActive = false;
        await this.saveMembers(members);
        event_bus_1.eventBus.emit(event_bus_1.ServiceEvents.FAMILY_MEMBER_REMOVED, { memberId: childId });
        logger.info('family_member_removed', { childId });
        return true;
    }
    /**
     * Get active members only.
     */
    async getActive(parentId) {
        const members = await this.getFamilyMembers(parentId);
        return members.filter((m) => m.isActive);
    }
    // ==========================================================================
    // BOOKINGS
    // ==========================================================================
    /**
     * Get all bookings for all children of a parent.
     */
    async getFamilyBookings(parentId) {
        try {
            const bookings = await this.loadBookings();
            const sortedBookings = bookings.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
            logger.info('family_bookings_retrieved', { parentId, count: sortedBookings.length });
            return sortedBookings;
        }
        catch (error) {
            logger.error('get_family_bookings_failed', { parentId, error });
            return [];
        }
    }
    /**
     * Get bookings for a specific child.
     */
    async getChildBookings(childId) {
        const bookings = await this.loadBookings();
        return bookings
            .filter((b) => b.childId === childId)
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }
    // ==========================================================================
    // CALENDAR
    // ==========================================================================
    /**
     * Get family calendar events within a date range.
     */
    async getFamilyCalendar(parentId, dateRange) {
        try {
            const bookings = await this.loadBookings();
            const startDate = new Date(dateRange.startDate).getTime();
            const endDate = new Date(dateRange.endDate).getTime();
            const filteredBookings = bookings.filter((booking) => {
                const bookingDate = new Date(booking.start).getTime();
                return bookingDate >= startDate && bookingDate <= endDate;
            });
            const sortedBookings = filteredBookings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            logger.info('family_calendar_retrieved', {
                parentId,
                dateRange,
                count: sortedBookings.length,
            });
            return sortedBookings;
        }
        catch (error) {
            logger.error('get_family_calendar_failed', { parentId, error });
            return [];
        }
    }
    /**
     * Get upcoming sessions for all children.
     */
    async getUpcomingForFamily(parentId, limit = 10) {
        try {
            const bookings = await this.loadBookings();
            const now = new Date().getTime();
            const upcomingBookings = bookings
                .filter((booking) => {
                const bookingDate = new Date(booking.start).getTime();
                return (bookingDate > now &&
                    (booking.status === 'CONFIRMED' || booking.status === 'PENDING'));
            })
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .slice(0, limit);
            logger.info('upcoming_family_sessions_retrieved', {
                parentId,
                count: upcomingBookings.length,
            });
            return upcomingBookings;
        }
        catch (error) {
            logger.error('get_upcoming_family_failed', { parentId, error });
            return [];
        }
    }
    /**
     * Get events grouped by date for calendar display.
     */
    async getEventsGroupedByDate(parentId, dateRange) {
        const events = await this.getFamilyCalendar(parentId, dateRange);
        const grouped = {};
        events.forEach((event) => {
            const dateKey = event.start.split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });
        return grouped;
    }
    // ==========================================================================
    // SPENDING
    // ==========================================================================
    /**
     * Get spending overview for all children.
     */
    async getFamilySpending(parentId) {
        try {
            const members = await this.loadMembers();
            const bookings = await this.loadBookings();
            const spendingByChild = members.map((member) => {
                const childBookings = bookings.filter((b) => b.childId === member.id &&
                    (b.status === 'COMPLETED' || b.status === 'CONFIRMED'));
                const totalSpent = childBookings.reduce((sum, b) => sum + (b.price || 0), 0);
                const sessionCount = childBookings.length;
                const averagePerSession = sessionCount > 0 ? totalSpent / sessionCount : 0;
                // Find last session
                const completedBookings = childBookings
                    .filter((b) => b.status === 'COMPLETED')
                    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
                const lastSession = completedBookings[0]?.start;
                // Calculate monthly breakdown
                const monthlyBreakdown = this.calculateMonthlyBreakdown(childBookings);
                // Calculate trend
                const { trend, trendPercent } = this.calculateSpendingTrend(monthlyBreakdown);
                return {
                    childId: member.id,
                    childName: member.name,
                    colorCode: member.colorCode,
                    totalSpent,
                    sessionCount,
                    lastSession,
                    monthlyBreakdown,
                    averagePerSession,
                    trend,
                    trendPercent,
                };
            });
            logger.info('family_spending_retrieved', { parentId, childrenCount: spendingByChild.length });
            return spendingByChild;
        }
        catch (error) {
            logger.error('get_family_spending_failed', { parentId, error });
            return [];
        }
    }
    /**
     * Get total family spending summary.
     */
    async getFamilySpendingSummary(parentId) {
        const spending = await this.getFamilySpending(parentId);
        const totalSpent = spending.reduce((sum, s) => sum + s.totalSpent, 0);
        // Calculate this month's spending
        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        let thisMonth = 0;
        let lastMonth = 0;
        spending.forEach((s) => {
            s.monthlyBreakdown?.forEach((mb) => {
                if (mb.month === thisMonthKey) {
                    thisMonth += mb.amount;
                }
                if (mb.month === lastMonthKey) {
                    lastMonth += mb.amount;
                }
            });
        });
        const trendPercent = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
        const trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
        return {
            totalSpent,
            thisMonth,
            lastMonth,
            currency: 'GBP',
            trend,
            trendPercent: Math.abs(trendPercent),
        };
    }
    calculateMonthlyBreakdown(bookings) {
        const monthlyMap = new Map();
        bookings.forEach((booking) => {
            const date = new Date(booking.start);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyMap.get(monthKey) || {
                month: monthKey,
                amount: 0,
                sessionCount: 0,
            };
            existing.amount += booking.price || 0;
            existing.sessionCount += 1;
            monthlyMap.set(monthKey, existing);
        });
        return Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month));
    }
    calculateSpendingTrend(monthlyBreakdown) {
        if (monthlyBreakdown.length < 2) {
            return { trend: 'stable', trendPercent: 0 };
        }
        const [current, previous] = monthlyBreakdown;
        if (!previous || previous.amount === 0) {
            return { trend: 'stable', trendPercent: 0 };
        }
        const percentChange = ((current.amount - previous.amount) / previous.amount) * 100;
        const trend = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';
        return { trend, trendPercent: Math.abs(Math.round(percentChange)) };
    }
    // ==========================================================================
    // CHILD PROGRESS
    // ==========================================================================
    /**
     * Get progress summary for a specific child.
     */
    async getChildProgress(childId) {
        try {
            const member = await this.getFamilyMember(childId);
            if (!member) {
                return null;
            }
            const bookings = await this.getChildBookings(childId);
            const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
            const upcomingBookings = bookings.filter((b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') &&
                new Date(b.start).getTime() > Date.now());
            // Sort to find dates
            completedBookings.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
            upcomingBookings.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            const progress = {
                childId,
                childName: member.name,
                sessionsCompleted: completedBookings.length,
                averageRating: 4.2, // Mock value - would come from actual ratings
                badgesEarned: member.totalBadges || 0,
                activeGoals: 2, // Mock value - would come from goals service
                completedGoals: 3, // Mock value
                lastSessionDate: completedBookings[0]?.start,
                nextSessionDate: upcomingBookings[0]?.start,
                skillProgress: [
                    { skill: 'Dribbling', level: 72, change: 8 },
                    { skill: 'Passing', level: 65, change: 5 },
                    { skill: 'Shooting', level: 58, change: 12 },
                ],
            };
            logger.info('child_progress_retrieved', { childId });
            return progress;
        }
        catch (error) {
            logger.error('get_child_progress_failed', { childId, error });
            return null;
        }
    }
    // ==========================================================================
    // FAMILY OVERVIEW
    // ==========================================================================
    /**
     * Get family overview for dashboard.
     */
    async getFamilyOverview(parentId) {
        try {
            const members = await this.getFamilyMembers(parentId);
            const bookings = await this.loadBookings();
            const now = new Date();
            // Calculate upcoming sessions
            const upcomingSessions = bookings.filter((b) => {
                const bookingDate = new Date(b.start).getTime();
                return (bookingDate > now.getTime() &&
                    (b.status === 'CONFIRMED' || b.status === 'PENDING'));
            });
            // Calculate sessions this month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const sessionsThisMonth = bookings.filter((b) => {
                const bookingDate = new Date(b.start);
                return (bookingDate >= startOfMonth &&
                    bookingDate <= endOfMonth &&
                    (b.status === 'COMPLETED' || b.status === 'CONFIRMED'));
            });
            // Calculate spending
            const completedBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CONFIRMED');
            const totalSpending = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
            const spendingThisMonth = sessionsThisMonth.reduce((sum, b) => sum + (b.price || 0), 0);
            // Get next session
            const sortedUpcoming = upcomingSessions.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            const nextSession = sortedUpcoming[0] || undefined;
            const overview = {
                totalChildren: members.length,
                upcomingSessions: upcomingSessions.length,
                sessionsThisMonth: sessionsThisMonth.length,
                spendingThisMonth,
                totalSpending,
                currency: 'GBP',
                nextSession,
                recentBadges: [], // Would come from badge service
            };
            logger.info('family_overview_retrieved', { parentId, overview });
            return overview;
        }
        catch (error) {
            logger.error('get_family_overview_failed', { parentId, error });
            return {
                totalChildren: 0,
                upcomingSessions: 0,
                sessionsThisMonth: 0,
                spendingThisMonth: 0,
                totalSpending: 0,
                currency: 'GBP',
            };
        }
    }
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    /**
     * Get available color for a new child.
     */
    getNextChildColor(existingCount) {
        return exports.CHILD_COLORS[existingCount % exports.CHILD_COLORS.length];
    }
    /**
     * Format currency amount.
     */
    formatAmount(amount, currency = 'GBP') {
        const symbol = currency === 'GBP' ? '\u00A3' : '$';
        return `${symbol}${amount.toFixed(2)}`;
    }
    /**
     * Seed demo data for testing.
     */
    async seedDemoData() {
        await this.saveMembers(MOCK_FAMILY_MEMBERS);
        await this.saveBookings(MOCK_FAMILY_BOOKINGS);
        logger.info('family_demo_data_seeded');
    }
    /**
     * Clear all family data.
     */
    async clearAllData() {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, []);
        logger.info('family_data_cleared');
    }
    /**
     * Get all members (alias for backward compatibility).
     */
    async getAll(parentId) {
        return this.getFamilyMembers(parentId);
    }
}
exports.familyMemberService = new FamilyMemberService();
