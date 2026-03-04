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
import { ensureProgressDemoSeeded } from '@/services/progress/progress-demo-seed-lazy-service';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Club } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import type { ChildInfo } from '@/types/child-context';
import type { FamilyBookingRow, FamilyBookingChild } from '@/types/family-booking';
import { formatShortDateWithYear } from '@/utils/format';

const logger = createLogger('UserHomeScreen');

export const formatDate = formatShortDateWithYear;

interface HomeSeedTarget {
  athleteId: string;
  athleteName: string;
}

interface BuildHomeSeedTargetsInput {
  isParent: boolean;
  selectedChildId: string | null;
  fallbackChildId: string | null;
  contextChildren: ChildInfo[];
  currentUserId?: string;
  currentUserName?: string;
}

export function buildHomeSeedTargets(input: BuildHomeSeedTargetsInput): HomeSeedTarget[] {
  const targets = new Map<string, string>();
  const childById = new Map(input.contextChildren.map((child) => [child.id, child]));

  const setTarget = (athleteId: string | null | undefined, fallbackName: string) => {
    if (!athleteId) return;
    const childName = childById.get(athleteId)?.name?.trim();
    const resolvedName = childName || fallbackName;
    if (!targets.has(athleteId)) {
      targets.set(athleteId, resolvedName);
    }
  };

  if (input.isParent) {
    const preferredChildId = input.selectedChildId ?? input.fallbackChildId;
    setTarget(preferredChildId, 'Child');
    for (const child of input.contextChildren) {
      setTarget(child.id, child.name || 'Child');
    }
  } else {
    setTarget(input.currentUserId, input.currentUserName || 'Athlete');
  }

  return Array.from(targets.entries()).map(([athleteId, athleteName]) => ({
    athleteId,
    athleteName,
  }));
}

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

  const fallbackChildId = contextChildren[0]?.id ?? null;

  // Local selectedChildId for immediate UI response — initialized from context
  const [selectedChildId, setSelectedChildIdLocal] = useState<string | null>(() => {
    if (contextActiveChildId) return contextActiveChildId;
    if (isParent && fallbackChildId) return fallbackChildId;
    return null;
  });

  // Sync from external context changes
  useEffect(() => {
    const unsub = onTyped(ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
      if (payload.childId) {
        setSelectedChildIdLocal(payload.childId);
        return;
      }
      if (isParent && fallbackChildId) {
        setSelectedChildIdLocal(fallbackChildId);
        return;
      }
      setSelectedChildIdLocal(null);
    });
    return unsub;
  }, [fallbackChildId, isParent]);

  useEffect(() => {
    if (!isParent || !fallbackChildId) {
      return;
    }
    if (selectedChildId && contextChildren.some((child) => child.id === selectedChildId)) {
      return;
    }

    setSelectedChildIdLocal(fallbackChildId);
    if (contextActiveChildId !== fallbackChildId) {
      void contextSetActiveChildId(fallbackChildId);
    }
  }, [
    contextActiveChildId,
    contextChildren,
    contextSetActiveChildId,
    fallbackChildId,
    isParent,
    selectedChildId,
  ]);

  // Handler: update BOTH local and context
  const setSelectedChildId = useCallback(
    (childId: string | null) => {
      const resolvedChildId = childId ?? (isParent ? fallbackChildId : null);
      setSelectedChildIdLocal(resolvedChildId);
      void contextSetActiveChildId(resolvedChildId);
    },
    [contextSetActiveChildId, fallbackChildId, isParent],
  );

  const handleSelectNextChild = useCallback(() => {
    if (!isParent || contextChildren.length <= 1) return;

    const currentIndex = contextChildren.findIndex((child) => child.id === selectedChildId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % contextChildren.length : 0;
    const nextChildId = contextChildren[nextIndex]?.id ?? contextChildren[0]?.id ?? null;
    if (!nextChildId) return;
    setSelectedChildId(nextChildId);
  }, [contextChildren, isParent, selectedChildId, setSelectedChildId]);

  const selectedChild = useMemo(
    () => contextChildren.find((child) => child.id === selectedChildId) ?? null,
    [contextChildren, selectedChildId],
  );

  const athleteId = selectedChildId || fallbackChildId || currentUser?.id;

  const loadData = useCallback(async () => {
    if (!athleteId) return;
    setError(null);
    try {
      if (currentUser?.role !== 'COACH') {
        try {
          await ensureRelationalDemoSeeded();

          const seedTargets = buildHomeSeedTargets({
            isParent,
            selectedChildId,
            fallbackChildId,
            contextChildren,
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name || currentUser?.fullName,
          });

          for (const target of seedTargets) {
            const seedResult = await ensureProgressDemoSeeded(target.athleteId, target.athleteName);
            if (!seedResult.success) {
              logger.warn('home_progress_seed_failed', {
                athleteId: target.athleteId,
              });
            }
          }
        } catch (seedError) {
          logger.warn('home_demo_seed_bootstrap_failed', {
            athleteId,
            error: seedError,
          });
        }
      }

      const badges = await badgeService.listAwardsForAthlete(athleteId);
      setRecentBadges(badges.slice(0, 3));
      const userClubs = socialFeedService.getUserClubs(currentUser?.id || '');
      setClubs(userClubs);
      const viewerRole = isParent ? 'parent' : 'athlete';
      const progress = await progressService.getAthleteProgress(athleteId, viewerRole);
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
        const selectedFamilyChildId = isParent ? selectedChildId ?? fallbackChildId : null;
        const filteredBookings = bookings
          .filter((booking) => {
            const isFuture = new Date(booking.scheduledAt).getTime() > now;
            const isConfirmed = booking.status === 'CONFIRMED';
            if (!selectedFamilyChildId) {
              return isFuture && isConfirmed;
            }
            return (
              isFuture &&
              isConfirmed &&
              (booking.athleteId === selectedFamilyChildId ||
                booking.athleteIds?.includes(selectedFamilyChildId))
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
  }, [athleteId, contextChildren, currentUser, selectedChildId, fallbackChildId, isParent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
    selectedChild,
    setSelectedChildId,
    handleSelectNextChild,
    onRefresh,
    upcomingBookings,
    isMultiChild,
    isParent,
    contextChildren,
  };
}
