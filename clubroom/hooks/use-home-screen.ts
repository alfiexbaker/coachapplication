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
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
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
  hasChildProfiles: boolean;
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

  if (input.hasChildProfiles) {
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
    profileMode,
    profileSubjectId,
    setProfileScope,
    isMultiChild,
  } = useChildContext();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ sessions: 0, badges: 0, level: 1 });
  const [bookSelfEnabled, setBookSelfEnabled] = useState(false);
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    nextMilestone: number;
    daysToNextMilestone: number;
    streakLabel: string;
  } | null>(null);

  const fallbackChildId = contextChildren[0]?.id ?? null;
  const hasChildProfiles = contextChildren.length > 0;

  // Local selectedChildId for immediate UI response — initialized from context
  const [selectedChildId, setSelectedChildIdLocal] = useState<string | null>(() => {
    if (contextActiveChildId) return contextActiveChildId;
    if (fallbackChildId) return fallbackChildId;
    return null;
  });

  // Sync from external context changes
  useEffect(() => {
    const unsub = onTyped(ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
      if (payload.childId) {
        setSelectedChildIdLocal(payload.childId);
        return;
      }
      if (fallbackChildId) {
        setSelectedChildIdLocal(fallbackChildId);
        return;
      }
      setSelectedChildIdLocal(null);
    });
    return unsub;
  }, [fallbackChildId]);

  useEffect(() => {
    if (!fallbackChildId) {
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
    selectedChildId,
  ]);

  // Handler: update BOTH local and context
  const setSelectedChildId = useCallback(
    (childId: string | null) => {
      const resolvedChildId = childId ?? fallbackChildId ?? null;
      setSelectedChildIdLocal(resolvedChildId);
      void contextSetActiveChildId(resolvedChildId);
      if (resolvedChildId) {
        void setProfileScope({ mode: 'child', childId: resolvedChildId });
      }
    },
    [contextSetActiveChildId, fallbackChildId, setProfileScope],
  );

  const handleSelectNextChild = useCallback(() => {
    if (contextChildren.length <= 1) return;

    const currentIndex = contextChildren.findIndex((child) => child.id === selectedChildId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % contextChildren.length : 0;
    const nextChildId = contextChildren[nextIndex]?.id ?? contextChildren[0]?.id ?? null;
    if (!nextChildId) return;
    setSelectedChildId(nextChildId);
  }, [contextChildren, selectedChildId, setSelectedChildId]);

  const selectedChild = useMemo(
    () => contextChildren.find((child) => child.id === selectedChildId) ?? null,
    [contextChildren, selectedChildId],
  );
  const isViewingSelfProfile = profileMode === 'self';
  const canSelfSwitchProfile = Boolean(hasChildProfiles && selectedChild && bookSelfEnabled);

  useEffect(() => {
    if (!currentUser?.id) {
      setBookSelfEnabled(false);
      logger.debug('Home self-book switch disabled: missing current user', {
        currentUserId: currentUser?.id,
      });
      return;
    }

    let cancelled = false;
    void bookingSelfSettingService.isEnabled(currentUser.id).then((enabled) => {
      if (cancelled) return;
      setBookSelfEnabled(enabled);
      logger.debug('Home self-book setting loaded', {
        currentUserId: currentUser.id,
        enabled,
        hasChildProfiles,
        selectedChildId,
      });
      if (!enabled && hasChildProfiles && profileMode === 'self') {
        const fallbackChild = selectedChildId ?? fallbackChildId;
        void setProfileScope({ mode: 'child', childId: fallbackChild });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, fallbackChildId, hasChildProfiles, profileMode, selectedChildId, setProfileScope]);

  useEffect(() => {
    if (profileMode !== 'child') {
      return;
    }
    const fallbackChild = selectedChildId ?? fallbackChildId;
    if (!fallbackChild || profileSubjectId === fallbackChild) {
      return;
    }
    void setProfileScope({ mode: 'child', childId: fallbackChild });
  }, [fallbackChildId, profileMode, profileSubjectId, selectedChildId, setProfileScope]);

  useEffect(() => {
    if (hasChildProfiles && !canSelfSwitchProfile && isViewingSelfProfile) {
      logger.debug('Home self profile reset because switching is unavailable', {
        canSelfSwitchProfile,
        isViewingSelfProfile,
        bookSelfEnabled,
        selectedChildId,
      });
      const fallbackChild = selectedChildId ?? fallbackChildId;
      void setProfileScope({ mode: 'child', childId: fallbackChild });
    }
  }, [
    bookSelfEnabled,
    canSelfSwitchProfile,
    fallbackChildId,
    hasChildProfiles,
    isViewingSelfProfile,
    selectedChildId,
    setProfileScope,
  ]);

  const handleToggleSelfChildProfile = useCallback(() => {
    if (!canSelfSwitchProfile) return;
    const nextMode: 'self' | 'child' = isViewingSelfProfile ? 'child' : 'self';
    logger.press('HomeProfileSwitchPressed', {
      currentMode: isViewingSelfProfile ? 'self' : 'child',
      nextMode,
      selectedChildId,
      selectedChildName: selectedChild?.name,
      bookSelfEnabled,
    });
    if (nextMode === 'self') {
      void setProfileScope({ mode: 'self' });
      return;
    }
    void setProfileScope({ mode: 'child', childId: selectedChildId ?? fallbackChildId });
  }, [
    bookSelfEnabled,
    canSelfSwitchProfile,
    fallbackChildId,
    isViewingSelfProfile,
    selectedChild?.name,
    selectedChildId,
    setProfileScope,
  ]);

  useEffect(() => {
    logger.debug('Home profile switch snapshot', {
      currentUserId: currentUser?.id,
      hasChildProfiles,
      selectedChildId,
      selectedChildName: selectedChild?.name,
      bookSelfEnabled,
      canSelfSwitchProfile,
      isViewingSelfProfile,
      profileMode,
      profileSubjectId,
    });
  }, [
    bookSelfEnabled,
    canSelfSwitchProfile,
    currentUser?.id,
    hasChildProfiles,
    isViewingSelfProfile,
    profileMode,
    profileSubjectId,
    selectedChild?.name,
    selectedChildId,
  ]);

  const athleteId = profileSubjectId || selectedChildId || fallbackChildId || currentUser?.id;

  const loadData = useCallback(async () => {
    if (!athleteId) return;
    setError(null);
    try {
      if (currentUser?.role !== 'COACH') {
        try {
          await ensureRelationalDemoSeeded();

          const seedTargets = buildHomeSeedTargets({
            hasChildProfiles,
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
      const viewerRole =
        hasChildProfiles && profileMode === 'child' ? 'parent' : 'athlete';
      const progress = await progressService.getAthleteProgress(athleteId, viewerRole);
      setStats({
        sessions: progress.totalSessions,
        badges: progress.totalBadges,
        level: progress.currentLevel.level,
      });
      const streak = await badgeService.getStreakInfo(athleteId);
      setStreakInfo(streak);

      if (currentUser?.id) {
        const role = hasChildProfiles ? 'parent' : 'athlete';
        const bookings = await bookingService.getBookingsForUser(currentUser.id, role);
        const now = Date.now();
        const profileChildId =
          profileMode === 'child' &&
          profileSubjectId &&
          contextChildren.some((child) => child.id === profileSubjectId)
            ? profileSubjectId
            : null;
        const selectedFamilyChildId =
          hasChildProfiles && profileMode === 'child'
            ? profileChildId ?? selectedChildId ?? fallbackChildId
            : null;
        const selfAthleteId = currentUser.id;
        const filteredBookings = bookings
          .filter((booking) => {
            const isFuture = new Date(booking.scheduledAt).getTime() > now;
            const isConfirmed = booking.status === 'CONFIRMED';
            if (hasChildProfiles && isViewingSelfProfile) {
              return (
                isFuture &&
                isConfirmed &&
                (booking.athleteId === selfAthleteId ||
                  booking.athleteIds?.includes(selfAthleteId))
              );
            }
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
  }, [
    athleteId,
    contextChildren,
    currentUser,
    fallbackChildId,
    hasChildProfiles,
    isViewingSelfProfile,
    profileMode,
    profileSubjectId,
    selectedChildId,
  ]);

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
    isViewingSelfProfile,
    canSelfSwitchProfile,
    selectedChildId,
    selectedChild,
    setSelectedChildId,
    handleSelectNextChild,
    handleToggleSelfChildProfile,
    onRefresh,
    upcomingBookings,
    isMultiChild,
    hasChildProfiles,
    contextChildren,
  };
}
