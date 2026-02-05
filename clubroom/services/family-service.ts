import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from './notification-trigger';
import {
  FamilyMember,
  FamilySpending,
  FamilySpendingMonth,
  FamilyCalendarEvent,
  FamilyOverview,
  FamilyDateRange,
  ChildProgressSummary,
  BadgeAward,
  FamilyAccount,
  FamilyGuardian,
  GuardianInvite,
  GuardianPermission,
  GuardianRole,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================
const USE_MOCK = true;
const logger = createLogger('FamilyService');

// Color palette for children in calendar/charts
const CHILD_COLORS = [
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
// FAMILY SHARING CONSTANTS
// ============================================================================

/**
 * Default permissions for each role
 */
const DEFAULT_PERMISSIONS: Record<GuardianRole, GuardianPermission[]> = {
  PRIMARY: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS', 'MANAGE_PAYMENTS', 'MANAGE_PROFILE', 'ADMIN'],
  GUARDIAN: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'],
  VIEWER: ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
};

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<GuardianPermission, { label: string; description: string }> = {
  VIEW_SCHEDULE: {
    label: 'View Schedule',
    description: 'See sessions, calendar, and upcoming bookings',
  },
  VIEW_PROGRESS: {
    label: 'View Progress',
    description: 'See badges, session notes, and development reports',
  },
  BOOK_SESSIONS: {
    label: 'Book Sessions',
    description: 'Book, reschedule, and cancel sessions',
  },
  MANAGE_PAYMENTS: {
    label: 'Manage Payments',
    description: 'View invoices and manage payment methods',
  },
  MANAGE_PROFILE: {
    label: 'Manage Profile',
    description: "Edit children's profile information",
  },
  ADMIN: {
    label: 'Admin Access',
    description: 'Add and remove guardians, full account control',
  },
};

/**
 * Relationship type options for the invite flow
 */
export const RELATIONSHIP_OPTIONS = [
  'Co-parent',
  'Grandparent',
  'Aunt/Uncle',
  'Family friend',
  'Nanny/Caregiver',
  'Other guardian',
];

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'child_tom',
    name: 'Tom Henderson',
    avatar: undefined,
    relationship: 'son',
    age: 12,
    colorCode: CHILD_COLORS[0],
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
    colorCode: CHILD_COLORS[1],
    dateOfBirth: '2015-07-22',
    skillLevel: 'BEGINNER',
    primarySport: 'Football',
    totalSessions: 12,
    totalBadges: 4,
    isActive: true,
    addedAt: '2024-03-15T14:00:00.000Z',
  },
];

const MOCK_FAMILY_BOOKINGS: FamilyCalendarEvent[] = [
  // Tom's bookings
  {
    id: 'booking_fam_1',
    childId: 'child_tom',
    childName: 'Tom Henderson',
    colorCode: CHILD_COLORS[0],
    title: '1-on-1 Session',
    description: 'Dribbling and ball control focus',
    start: '2025-01-15T10:00:00.000Z',
    end: '2025-01-15T11:00:00.000Z',
    location: 'Hackney Sports Field',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'CONFIRMED',
    price: 50,
  },
  {
    id: 'booking_fam_2',
    childId: 'child_tom',
    childName: 'Tom Henderson',
    colorCode: CHILD_COLORS[0],
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
    colorCode: CHILD_COLORS[0],
    title: '1-on-1 Session',
    description: 'Finishing practice',
    start: '2025-01-22T10:00:00.000Z',
    end: '2025-01-22T11:00:00.000Z',
    location: 'Hackney Sports Field',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'PENDING',
    price: 50,
  },
  // Emma's bookings
  {
    id: 'booking_fam_4',
    childId: 'child_emma',
    childName: 'Emma Henderson',
    colorCode: CHILD_COLORS[1],
    title: '1-on-1 Session',
    description: 'Basic skills introduction',
    start: '2025-01-16T15:00:00.000Z',
    end: '2025-01-16T16:00:00.000Z',
    location: 'London Fields',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'CONFIRMED',
    price: 50,
  },
  {
    id: 'booking_fam_5',
    childId: 'child_emma',
    childName: 'Emma Henderson',
    colorCode: CHILD_COLORS[1],
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
    colorCode: CHILD_COLORS[0],
    title: '1-on-1 Session',
    start: '2024-12-10T10:00:00.000Z',
    end: '2024-12-10T11:00:00.000Z',
    location: 'Hackney Sports Field',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'COMPLETED',
    price: 50,
  },
  {
    id: 'booking_fam_past_2',
    childId: 'child_tom',
    childName: 'Tom Henderson',
    colorCode: CHILD_COLORS[0],
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
    colorCode: CHILD_COLORS[1],
    title: '1-on-1 Session',
    start: '2024-12-12T15:00:00.000Z',
    end: '2024-12-12T16:00:00.000Z',
    location: 'London Fields',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'COMPLETED',
    price: 50,
  },
  {
    id: 'booking_fam_past_4',
    childId: 'child_tom',
    childName: 'Tom Henderson',
    colorCode: CHILD_COLORS[0],
    title: '1-on-1 Session',
    start: '2024-11-20T10:00:00.000Z',
    end: '2024-11-20T11:00:00.000Z',
    location: 'Hackney Sports Field',
    coachName: 'Sarah Mitchell',
    coachId: 'coach_1',
    sessionType: '1-on-1',
    status: 'COMPLETED',
    price: 50,
  },
  {
    id: 'booking_fam_past_5',
    childId: 'child_emma',
    childName: 'Emma Henderson',
    colorCode: CHILD_COLORS[1],
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
// FAMILY SERVICE
// ============================================================================

class FamilyService {
  // ==========================================================================
  // FAMILY MEMBERS
  // ==========================================================================

  /**
   * Get all family members (children) for a parent
   */
  async getFamilyMembers(parentId: string): Promise<FamilyMember[]> {
    try {
      const members = await this.getAllMembers();
      logger.info('family_members_retrieved', { parentId, count: members.length });
      return members;
    } catch (error) {
      logger.error('get_family_members_failed', { parentId, error });
      return [];
    }
  }

  /**
   * Get a single family member by ID
   */
  async getFamilyMember(childId: string): Promise<FamilyMember | null> {
    const members = await this.getAllMembers();
    return members.find((m) => m.id === childId) || null;
  }

  /**
   * Add a new family member
   */
  async addFamilyMember(
    parentId: string,
    member: Omit<FamilyMember, 'id' | 'colorCode' | 'addedAt' | 'isActive'>
  ): Promise<FamilyMember> {
    const members = await this.getAllMembers();
    const colorIndex = members.length % CHILD_COLORS.length;

    const newMember: FamilyMember = {
      ...member,
      id: `child_${Date.now()}`,
      colorCode: CHILD_COLORS[colorIndex],
      isActive: true,
      addedAt: new Date().toISOString(),
    };

    members.push(newMember);
    await this.saveMembers(members);

    logger.info('family_member_added', { parentId, memberId: newMember.id });
    return newMember;
  }

  /**
   * Update a family member
   */
  async updateFamilyMember(
    childId: string,
    updates: Partial<FamilyMember>
  ): Promise<FamilyMember | null> {
    const members = await this.getAllMembers();
    const index = members.findIndex((m) => m.id === childId);

    if (index === -1) {
      return null;
    }

    members[index] = { ...members[index], ...updates };
    await this.saveMembers(members);

    logger.info('family_member_updated', { childId });
    return members[index];
  }

  // ==========================================================================
  // FAMILY BOOKINGS
  // ==========================================================================

  /**
   * Get all bookings for all children of a parent
   */
  async getFamilyBookings(parentId: string): Promise<FamilyCalendarEvent[]> {
    try {
      const bookings = await this.getAllBookings();
      const sortedBookings = bookings.sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      );
      logger.info('family_bookings_retrieved', { parentId, count: sortedBookings.length });
      return sortedBookings;
    } catch (error) {
      logger.error('get_family_bookings_failed', { parentId, error });
      return [];
    }
  }

  /**
   * Get bookings for a specific child
   */
  async getChildBookings(childId: string): Promise<FamilyCalendarEvent[]> {
    const bookings = await this.getAllBookings();
    return bookings
      .filter((b) => b.childId === childId)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }

  // ==========================================================================
  // FAMILY CALENDAR
  // ==========================================================================

  /**
   * Get family calendar events within a date range
   */
  async getFamilyCalendar(
    parentId: string,
    dateRange: FamilyDateRange
  ): Promise<FamilyCalendarEvent[]> {
    try {
      const bookings = await this.getAllBookings();
      const startDate = new Date(dateRange.startDate).getTime();
      const endDate = new Date(dateRange.endDate).getTime();

      const filteredBookings = bookings.filter((booking) => {
        const bookingDate = new Date(booking.start).getTime();
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      const sortedBookings = filteredBookings.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      logger.info('family_calendar_retrieved', {
        parentId,
        dateRange,
        count: sortedBookings.length,
      });

      return sortedBookings;
    } catch (error) {
      logger.error('get_family_calendar_failed', { parentId, error });
      return [];
    }
  }

  /**
   * Get upcoming sessions for all children
   */
  async getUpcomingForFamily(parentId: string, limit: number = 10): Promise<FamilyCalendarEvent[]> {
    try {
      const bookings = await this.getAllBookings();
      const now = new Date().getTime();

      const upcomingBookings = bookings
        .filter((booking) => {
          const bookingDate = new Date(booking.start).getTime();
          return (
            bookingDate > now &&
            (booking.status === 'CONFIRMED' || booking.status === 'PENDING')
          );
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, limit);

      logger.info('upcoming_family_sessions_retrieved', {
        parentId,
        count: upcomingBookings.length,
      });

      return upcomingBookings;
    } catch (error) {
      logger.error('get_upcoming_family_failed', { parentId, error });
      return [];
    }
  }

  // ==========================================================================
  // FAMILY SPENDING
  // ==========================================================================

  /**
   * Get spending overview for all children
   */
  async getFamilySpending(parentId: string): Promise<FamilySpending[]> {
    try {
      const members = await this.getAllMembers();
      const bookings = await this.getAllBookings();

      const spendingByChild: FamilySpending[] = members.map((member) => {
        const childBookings = bookings.filter(
          (b) =>
            b.childId === member.id &&
            (b.status === 'COMPLETED' || b.status === 'CONFIRMED')
        );

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
    } catch (error) {
      logger.error('get_family_spending_failed', { parentId, error });
      return [];
    }
  }

  /**
   * Get total family spending summary
   */
  async getFamilySpendingSummary(parentId: string): Promise<{
    totalSpent: number;
    thisMonth: number;
    lastMonth: number;
    currency: string;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
  }> {
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

    const trendPercent =
      lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
    const trend: 'up' | 'down' | 'stable' =
      trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';

    return {
      totalSpent,
      thisMonth,
      lastMonth,
      currency: 'GBP',
      trend,
      trendPercent: Math.abs(trendPercent),
    };
  }

  // ==========================================================================
  // CHILD PROGRESS
  // ==========================================================================

  /**
   * Get progress summary for a specific child
   */
  async getChildProgress(childId: string): Promise<ChildProgressSummary | null> {
    try {
      const member = await this.getFamilyMember(childId);
      if (!member) {
        return null;
      }

      const bookings = await this.getChildBookings(childId);
      const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
      const upcomingBookings = bookings.filter(
        (b) =>
          (b.status === 'CONFIRMED' || b.status === 'PENDING') &&
          new Date(b.start).getTime() > Date.now()
      );

      // Sort to find dates
      completedBookings.sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      );
      upcomingBookings.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      const progress: ChildProgressSummary = {
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
    } catch (error) {
      logger.error('get_child_progress_failed', { childId, error });
      return null;
    }
  }

  // ==========================================================================
  // FAMILY OVERVIEW
  // ==========================================================================

  /**
   * Get family overview for dashboard
   */
  async getFamilyOverview(parentId: string): Promise<FamilyOverview> {
    try {
      const members = await this.getFamilyMembers(parentId);
      const bookings = await this.getAllBookings();
      const now = new Date();

      // Calculate upcoming sessions
      const upcomingSessions = bookings.filter((b) => {
        const bookingDate = new Date(b.start).getTime();
        return (
          bookingDate > now.getTime() &&
          (b.status === 'CONFIRMED' || b.status === 'PENDING')
        );
      });

      // Calculate sessions this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const sessionsThisMonth = bookings.filter((b) => {
        const bookingDate = new Date(b.start);
        return (
          bookingDate >= startOfMonth &&
          bookingDate <= endOfMonth &&
          (b.status === 'COMPLETED' || b.status === 'CONFIRMED')
        );
      });

      // Calculate spending
      const completedBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CONFIRMED');
      const totalSpending = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const spendingThisMonth = sessionsThisMonth.reduce((sum, b) => sum + (b.price || 0), 0);

      // Get next session
      const sortedUpcoming = upcomingSessions.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      const nextSession = sortedUpcoming[0] || undefined;

      const overview: FamilyOverview = {
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
    } catch (error) {
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
  // FAMILY SHARING - ACCOUNTS
  // ==========================================================================

  private accountsCache: Map<string, FamilyAccount> = new Map();

  /**
   * Get or create a family account for a user
   */
  async getFamilyAccount(userId: string, userName: string): Promise<FamilyAccount> {
    const accounts = await this.loadAccounts();
    let account = accounts.find(a =>
      a.primaryGuardianId === userId ||
      a.guardians.some(g => g.userId === userId)
    );

    if (!account) {
      // Create new family account
      account = {
        id: `family_${Date.now()}`,
        name: `${userName}'s Family`,
        primaryGuardianId: userId,
        guardians: [{
          id: `guardian_${Date.now()}`,
          userId,
          userName,
          email: '', // Would come from auth
          role: 'PRIMARY',
          permissions: DEFAULT_PERMISSIONS.PRIMARY,
          relationship: 'Parent',
          isPrimary: true,
          childAccess: [],
          addedAt: new Date().toISOString(),
        }],
        children: [],
        pendingInvites: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      accounts.push(account);
      await this.saveAccounts(accounts);
      logger.debug('Created new family account', { accountId: account.id });
    }

    return account;
  }

  /**
   * Get all guardians for a family
   */
  async getGuardians(familyId: string): Promise<FamilyGuardian[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    return account?.guardians || [];
  }

  // ==========================================================================
  // FAMILY SHARING - PERMISSIONS
  // ==========================================================================

  /**
   * Get guardian's permissions for a specific family
   */
  async getGuardianPermissions(userId: string, familyId: string): Promise<GuardianPermission[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    const guardian = account?.guardians.find(g => g.userId === userId);
    return guardian?.permissions || [];
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userId: string,
    familyId: string,
    permission: GuardianPermission
  ): Promise<boolean> {
    const permissions = await this.getGuardianPermissions(userId, familyId);
    return permissions.includes(permission) || permissions.includes('ADMIN');
  }

  /**
   * Update guardian permissions
   */
  async updateGuardianPermissions(
    familyId: string,
    requesterId: string,
    guardianId: string,
    newPermissions: GuardianPermission[]
  ): Promise<FamilyGuardian> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    if (guardian.isPrimary) {
      throw new Error('Cannot modify primary guardian permissions');
    }

    guardian.permissions = newPermissions;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Trigger notification for updated permissions
    await notificationTriggers.guardianPermissionsUpdated(guardian.userId);

    logger.debug('PermissionsUpdated', { familyId, guardianId, newPermissions });

    return guardian;
  }

  /**
   * Update guardian child access
   */
  async updateGuardianChildAccess(
    familyId: string,
    requesterId: string,
    guardianId: string,
    childIds: string[]
  ): Promise<FamilyGuardian> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    guardian.childAccess = childIds;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.debug('ChildAccessUpdated', { familyId, guardianId, childIds });

    return guardian;
  }

  /**
   * Get children that a guardian has access to
   */
  async getAccessibleChildren(
    userId: string,
    familyId: string
  ): Promise<FamilyMember[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      return [];
    }

    const guardian = account.guardians.find(g => g.userId === userId);
    if (!guardian) {
      return [];
    }

    // Empty childAccess means access to all children
    if (guardian.childAccess.length === 0 || guardian.isPrimary) {
      return account.children;
    }

    return account.children.filter(c => guardian.childAccess.includes(c.id));
  }

  // ==========================================================================
  // FAMILY SHARING - INVITES
  // ==========================================================================

  /**
   * Invite a new guardian to the family
   */
  async inviteGuardian(
    familyId: string,
    inviterId: string,
    inviterName: string,
    inviteeEmail: string,
    inviteeName: string,
    role: GuardianRole,
    relationship: string,
    childAccess: string[],
    message?: string
  ): Promise<GuardianInvite> {
    // Check if inviter has permission
    const hasAdmin = await this.hasPermission(inviterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to invite guardians');
    }

    // Check for existing pending invite
    const invites = await this.loadInvites();
    const existingInvite = invites.find(
      i => i.familyId === familyId &&
           i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
           i.status === 'PENDING'
    );

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Create invite
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 7); // 7 day expiry

    const invite: GuardianInvite = {
      id: `invite_${Date.now()}`,
      familyId,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeName,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      relationship,
      childAccess,
      status: 'PENDING',
      invitedBy: inviterId,
      inviterName,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      message,
    };

    invites.push(invite);
    await this.saveInvites(invites);

    // Also add to family's pending invites
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    if (account) {
      account.pendingInvites.push(invite);
      account.updatedAt = now.toISOString();
      await this.saveAccounts(accounts);
    }

    logger.success('GuardianInvited', {
      familyId,
      inviteeEmail,
      role,
    });

    // Trigger notification for invited guardian
    await notificationTriggers.guardianInvited(account?.name || 'Family');

    return invite;
  }

  /**
   * Get pending invites for a user (by email)
   */
  async getPendingInvitesForUser(email: string): Promise<GuardianInvite[]> {
    const invites = await this.loadInvites();
    const now = new Date();

    return invites.filter(
      i => i.inviteeEmail.toLowerCase() === email.toLowerCase() &&
           i.status === 'PENDING' &&
           new Date(i.expiresAt) > now
    );
  }

  /**
   * Accept a guardian invitation
   */
  async acceptInvite(
    inviteId: string,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<FamilyAccount> {
    const invites = await this.loadInvites();
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    if (invite.status !== 'PENDING') {
      throw new Error('This invitation has already been responded to');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      invite.status = 'EXPIRED';
      await this.saveInvites(invites);
      throw new Error('This invitation has expired');
    }

    // Update invite status
    invite.status = 'ACCEPTED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Add guardian to family
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === invite.familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const newGuardian: FamilyGuardian = {
      id: `guardian_${Date.now()}`,
      userId,
      userName,
      email: userEmail,
      role: invite.role,
      permissions: invite.permissions,
      relationship: invite.relationship,
      isPrimary: false,
      childAccess: invite.childAccess,
      addedAt: new Date().toISOString(),
      invitedBy: invite.invitedBy,
    };

    account.guardians.push(newGuardian);
    account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    logger.success('InviteAccepted', {
      inviteId,
      familyId: invite.familyId,
      userId,
    });

    return account;
  }

  /**
   * Decline a guardian invitation
   */
  async declineInvite(inviteId: string): Promise<void> {
    const invites = await this.loadInvites();
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    invite.status = 'DECLINED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Remove from family's pending invites
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === invite.familyId);
    if (account) {
      account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
      account.updatedAt = new Date().toISOString();
      await this.saveAccounts(accounts);
    }

    logger.debug('InviteDeclined', { inviteId });
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvite(
    familyId: string,
    requesterId: string,
    inviteId: string
  ): Promise<void> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to cancel invitations');
    }

    const invites = await this.loadInvites();
    const inviteIndex = invites.findIndex(i => i.id === inviteId);

    if (inviteIndex >= 0) {
      invites.splice(inviteIndex, 1);
      await this.saveInvites(invites);
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    if (account) {
      account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
      await this.saveAccounts(accounts);
    }

    logger.debug('InviteCancelled', { familyId, inviteId });
  }

  // ==========================================================================
  // FAMILY SHARING - GUARDIANS
  // ==========================================================================

  /**
   * Remove a guardian from the family
   */
  async removeGuardian(
    familyId: string,
    requesterId: string,
    guardianId: string
  ): Promise<void> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to remove guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    if (guardian.isPrimary) {
      throw new Error('Cannot remove the primary guardian');
    }

    account.guardians = account.guardians.filter(g => g.id !== guardianId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Trigger notification for removed guardian
    await notificationTriggers.guardianRemoved(account.name, guardian.userId);

    logger.debug('GuardianRemoved', { familyId, guardianId });
  }

  /**
   * Clear sharing cache
   */
  clearCache(): void {
    this.accountsCache.clear();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getAllMembers(): Promise<FamilyMember[]> {
    if (USE_MOCK) {
      return apiClient.get<FamilyMember[]>(STORAGE_KEYS.FAMILY_MEMBERS, MOCK_FAMILY_MEMBERS);
    }
    return apiClient.get<FamilyMember[]>(STORAGE_KEYS.FAMILY_MEMBERS, []);
  }

  private async saveMembers(members: FamilyMember[]): Promise<void> {
    await apiClient.set(STORAGE_KEYS.FAMILY_MEMBERS, members);
  }

  private async getAllBookings(): Promise<FamilyCalendarEvent[]> {
    if (USE_MOCK) {
      return apiClient.get<FamilyCalendarEvent[]>(
        STORAGE_KEYS.FAMILY_BOOKINGS,
        MOCK_FAMILY_BOOKINGS
      );
    }
    return apiClient.get<FamilyCalendarEvent[]>(STORAGE_KEYS.FAMILY_BOOKINGS, []);
  }

  private async saveBookings(bookings: FamilyCalendarEvent[]): Promise<void> {
    await apiClient.set(STORAGE_KEYS.FAMILY_BOOKINGS, bookings);
  }

  /**
   * Load all family accounts
   */
  private async loadAccounts(): Promise<FamilyAccount[]> {
    try {
      const accounts = await apiClient.get<FamilyAccount[]>(STORAGE_KEYS.FAMILY_ACCOUNTS, []);
      accounts.forEach((a: FamilyAccount) => this.accountsCache.set(a.id, a));
      return accounts;
    } catch (error) {
      logger.error('Failed to load family accounts', error);
      return [];
    }
  }

  /**
   * Save family accounts
   */
  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    await apiClient.set(STORAGE_KEYS.FAMILY_ACCOUNTS, accounts);
    accounts.forEach(a => this.accountsCache.set(a.id, a));
  }

  /**
   * Load pending invites
   */
  private async loadInvites(): Promise<GuardianInvite[]> {
    try {
      return await apiClient.get<GuardianInvite[]>(STORAGE_KEYS.GUARDIAN_INVITES, []);
    } catch (error) {
      logger.error('Failed to load invites', error);
      return [];
    }
  }

  /**
   * Save invites
   */
  private async saveInvites(invites: GuardianInvite[]): Promise<void> {
    await apiClient.set(STORAGE_KEYS.GUARDIAN_INVITES, invites);
  }

  private calculateMonthlyBreakdown(
    bookings: FamilyCalendarEvent[]
  ): FamilySpendingMonth[] {
    const monthlyMap = new Map<string, FamilySpendingMonth>();

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

  private calculateSpendingTrend(
    monthlyBreakdown: FamilySpendingMonth[]
  ): { trend: 'up' | 'down' | 'stable'; trendPercent: number } {
    if (monthlyBreakdown.length < 2) {
      return { trend: 'stable', trendPercent: 0 };
    }

    const [current, previous] = monthlyBreakdown;
    if (!previous || previous.amount === 0) {
      return { trend: 'stable', trendPercent: 0 };
    }

    const percentChange = ((current.amount - previous.amount) / previous.amount) * 100;
    const trend: 'up' | 'down' | 'stable' =
      percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';

    return { trend, trendPercent: Math.abs(Math.round(percentChange)) };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get available color for a new child
   */
  getNextChildColor(existingCount: number): string {
    return CHILD_COLORS[existingCount % CHILD_COLORS.length];
  }

  /**
   * Format currency amount
   */
  formatAmount(amount: number, currency: string = 'GBP'): string {
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get events grouped by date for calendar display
   */
  async getEventsGroupedByDate(
    parentId: string,
    dateRange: FamilyDateRange
  ): Promise<Record<string, FamilyCalendarEvent[]>> {
    const events = await this.getFamilyCalendar(parentId, dateRange);
    const grouped: Record<string, FamilyCalendarEvent[]> = {};

    events.forEach((event) => {
      const dateKey = event.start.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }

  /**
   * Seed demo data for testing
   */
  async seedDemoData(): Promise<void> {
    await this.saveMembers(MOCK_FAMILY_MEMBERS);
    await this.saveBookings(MOCK_FAMILY_BOOKINGS);
    logger.info('family_demo_data_seeded');
  }

  /**
   * Clear all family data
   */
  async clearAllData(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.FAMILY_MEMBERS, []);
    await apiClient.set(STORAGE_KEYS.FAMILY_BOOKINGS, []);
    logger.info('family_data_cleared');
  }
}

// Export singleton instance
export const familyService = new FamilyService();

// Re-export types for convenience
export type {
  FamilyMember,
  FamilySpending,
  FamilySpendingMonth,
  FamilyCalendarEvent,
  FamilyOverview,
  FamilyDateRange,
  ChildProgressSummary,
  FamilyAccount,
  FamilyGuardian,
  GuardianInvite,
  GuardianPermission,
  GuardianRole,
};
