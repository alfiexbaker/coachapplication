/**
 * useHomeScreen — Data loading and state for the athlete/parent home screen.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { badgeService } from '@/services/badge-service';
import { socialFeedService } from '@/services/social-feed-service';
import { progressService } from '@/services/progress-service';
import { bookingService } from '@/services/booking-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Club } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import type { ChildInfo } from '@/types/child-context';
import type { FamilyBookingRow, FamilyBookingChild } from '@/types/family-booking';
import { formatShortDateWithYear } from '@/utils/format';

const logger = createLogger('UserHomeScreen');

export const formatDate = formatShortDateWithYear;

/**
 * Pure function: deduplicate bookings across children for family view.
 * Groups by booking.id, merges children that share the same booking.
 */
export function deduplicateBookings(
  bookings: Booking[],
  children: ChildInfo[],
): FamilyBookingRow[] {
  const childMap = new Map<string, ChildInfo>();
  for (const child of children) {
    childMap.set(child.id, child);
  }

  const groups = new Map<string, { booking: Booking; childIds: Set<string> }>();

  for (const booking of bookings) {
    const involvedChildIds: string[] = [];
    if (booking.athleteId && childMap.has(booking.athleteId)) {
      involvedChildIds.push(booking.athleteId);
    }
    for (const id of booking.athleteIds ?? []) {
      if (childMap.has(id) && !involvedChildIds.includes(id)) {
        involvedChildIds.push(id);
      }
    }

    const key = booking.id;
    const existing = groups.get(key);
    if (existing) {
      for (const cid of involvedChildIds) {
        existing.childIds.add(cid);
      }
    } else {
      groups.set(key, { booking, childIds: new Set(involvedChildIds) });
    }
  }

  const rows: FamilyBookingRow[] = [];
  for (const [, group] of groups) {
    const childEntries: FamilyBookingChild[] = [];
    for (const cid of group.childIds) {
      const info = childMap.get(cid);
      if (info) {
        childEntries.push({ id: info.id, name: info.name, colorCode: info.colorCode });
      }
    }
    rows.push({
      booking: group.booking,
      children: childEntries,
      isShared: childEntries.length >= 2,
    });
  }

  rows.sort(
    (a, b) =>
      new Date(a.booking.scheduledAt).getTime() - new Date(b.booking.scheduledAt).getTime(),
  );

  return rows;
}

export function useHomeScreen() {
  const { currentUser } = useAuth();
  const {
    children: contextChildren,
    activeChildId: contextActiveChildId,
    setActiveChildId: contextSetActiveChildId,
    isParent,
    isMultiChild,
  } = useChildContext();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ sessions: 0, badges: 0, level: 1 });
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    nextMilestone: number;
    daysToNextMilestone: number;
    streakLabel: string;
  } | null>(null);

  // Local selectedChildId for immediate UI response — initialized from context
  const [selectedChildId, setSelectedChildIdLocal] = useState<string | null>(
    () => contextActiveChildId,
  );

  // Sync from external context changes
  useEffect(() => {
    const unsub = onTyped(ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
      setSelectedChildIdLocal(payload.childId);
    });
    return unsub;
  }, []);

  // Handler: update BOTH local and context
  const setSelectedChildId = useCallback(
    (childId: string | null) => {
      setSelectedChildIdLocal(childId);
      void contextSetActiveChildId(childId);
    },
    [contextSetActiveChildId],
  );

  const athleteId = selectedChildId || contextChildren[0]?.id || currentUser?.id;

  const loadData = useCallback(async () => {
    if (!athleteId) return;
    setError(null);
    try {
      const badges = await badgeService.listAwardsForAthlete(athleteId);
      setRecentBadges(badges.slice(0, 3));
      const userClubs = socialFeedService.getUserClubs(currentUser?.id || '');
      setClubs(userClubs);
      const progress = await progressService.getAthleteProgress(athleteId, 'athlete');
      setStats({
        sessions: progress.totalSessions,
        badges: progress.totalBadges,
        level: progress.currentLevel.level,
      });
      const streak = await badgeService.getStreakInfo(athleteId);
      setStreakInfo(streak);

      if (currentUser?.id) {
        const role = isParent ? 'parent' : 'athlete';
        const bookings = await bookingService.getBookingsForUser(currentUser.id, role);
        const now = Date.now();
        const filteredBookings = bookings
          .filter((booking) => {
            const isFuture = new Date(booking.scheduledAt).getTime() > now;
            const isConfirmed = booking.status === 'CONFIRMED';
            if (!selectedChildId) {
              return isFuture && isConfirmed;
            }
            return (
              isFuture &&
              isConfirmed &&
              (booking.athleteId === selectedChildId ||
                booking.athleteIds?.includes(selectedChildId))
            );
          })
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setUpcomingBookings(filteredBookings);
      } else {
        setUpcomingBookings([]);
      }
    } catch (err) {
      logger.error('Failed to load home data', err);
      setError('Failed to load data. Pull down to refresh.');
      setUpcomingBookings([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId, currentUser, selectedChildId, isParent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Deduplicated family booking rows for multi-child "All" mode
  const familyBookingRows = useMemo(
    () =>
      isMultiChild && selectedChildId === null
        ? deduplicateBookings(upcomingBookings, contextChildren)
        : [],
    [upcomingBookings, contextChildren, isMultiChild, selectedChildId],
  );

  return {
    currentUser,
    refreshing,
    loading,
    error,
    recentBadges,
    clubs,
    stats,
    streakInfo,
    selectedChildId,
    setSelectedChildId,
    onRefresh,
    upcomingBookings,
    familyBookingRows,
    isMultiChild,
    isParent,
    contextChildren,
  };
}
