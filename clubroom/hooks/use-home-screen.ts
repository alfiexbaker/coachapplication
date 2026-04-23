/**
 * useHomeScreen — Data loading and state for the athlete/parent home screen.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { badgeService } from '@/services/badge-service';
import { clubService, type MatchResult } from '@/services/club-service';
import { socialFeedService } from '@/services/social-feed-service';
import { progressService } from '@/services/progress-service';
import { bookingService } from '@/services/booking-service';
import { ensureProgressDemoSeeded } from '@/services/progress/progress-demo-seed-lazy-service';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Club, ClubFeedPost } from '@/constants/types';
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

export interface HomeResult extends MatchResult {
  clubId: string;
  clubName: string;
}

export interface HomeClubHighlight {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  body: string;
  createdAt: string;
  postType?: ClubFeedPost['postType'];
}

export interface HomeStats {
  sessions: number;
  badges: number;
  level: number;
}

export interface HomeStreakInfo {
  currentStreak: number;
  nextMilestone: number;
  daysToNextMilestone: number;
  streakLabel: string;
}

interface HomeProfileFrame {
  dataKey: string;
  mode: 'self' | 'child';
  subjectId: string | null;
  selectedChildId: string | null;
  selectedChild: ChildInfo | null;
}

interface HomeFrameData {
  profile: HomeProfileFrame;
  recentBadges: BadgeAward[];
  clubs: Club[];
  recentResults: HomeResult[];
  clubHighlights: HomeClubHighlight[];
  upcomingBookings: Booking[];
  stats: HomeStats;
  streakInfo: HomeStreakInfo | null;
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

function createEmptyHomeFrame(profile: HomeProfileFrame): HomeFrameData {
  return {
    profile,
    recentBadges: [],
    clubs: [],
    recentResults: [],
    clubHighlights: [],
    upcomingBookings: [],
    stats: { sessions: 0, badges: 0, level: 1 },
    streakInfo: null,
  };
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
    canSelectSelfProfile,
    selfProfileSelectionLoaded,
    loading: childContextLoading,
  } = useChildContext();

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
    if (childContextLoading) {
      return;
    }
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
    childContextLoading,
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
  const contextChildrenSignature = useMemo(
    () =>
      contextChildren
        .map(
          (child) =>
            `${child.id}:${child.name ?? ''}:${child.age ?? ''}:${child.avatarUrl ?? ''}:${child.colorCode ?? ''}`,
        )
        .join('|'),
    [contextChildren],
  );
  const currentUserName = currentUser?.name || currentUser?.fullName || 'Athlete';
  const currentUserSignature = `${currentUser?.id ?? 'anon'}:${currentUser?.role ?? 'guest'}:${currentUserName}`;
  const canSelfSwitchProfile = Boolean(
    !childContextLoading
      && selfProfileSelectionLoaded
      && hasChildProfiles
      && selectedChild
      && canSelectSelfProfile,
  );

  useEffect(() => {
    if (childContextLoading) {
      return;
    }
    if (profileMode !== 'child') {
      return;
    }
    const fallbackChild = selectedChildId ?? fallbackChildId;
    if (!fallbackChild || profileSubjectId === fallbackChild) {
      return;
    }
    void setProfileScope({ mode: 'child', childId: fallbackChild });
  }, [childContextLoading, fallbackChildId, profileMode, profileSubjectId, selectedChildId, setProfileScope]);

  const handleToggleSelfChildProfile = useCallback(() => {
    if (!canSelfSwitchProfile) return;
    const nextMode: 'self' | 'child' = isViewingSelfProfile ? 'child' : 'self';
    logger.press('HomeProfileSwitchPressed', {
      currentMode: isViewingSelfProfile ? 'self' : 'child',
      nextMode,
      selectedChildId,
      selectedChildName: selectedChild?.name,
      canSelectSelfProfile,
    });
    if (nextMode === 'self') {
      void setProfileScope({ mode: 'self' });
      return;
    }
    void setProfileScope({ mode: 'child', childId: selectedChildId ?? fallbackChildId });
  }, [
    canSelectSelfProfile,
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
      canSelectSelfProfile,
      selfProfileSelectionLoaded,
      canSelfSwitchProfile,
      isViewingSelfProfile,
      profileMode,
      profileSubjectId,
    });
  }, [
    canSelectSelfProfile,
    canSelfSwitchProfile,
    childContextLoading,
    currentUser?.id,
    hasChildProfiles,
    isViewingSelfProfile,
    profileMode,
    profileSubjectId,
    selectedChild?.name,
    selectedChildId,
    selfProfileSelectionLoaded,
  ]);

  const requestedProfileChildId =
    profileMode === 'child'
      ? profileSubjectId && contextChildren.some((child) => child.id === profileSubjectId)
        ? profileSubjectId
        : selectedChildId ?? fallbackChildId
      : selectedChildId ?? fallbackChildId;
  const requestedSelectedChild = useMemo(
    () => contextChildren.find((child) => child.id === requestedProfileChildId) ?? null,
    [contextChildren, requestedProfileChildId],
  );
  const athleteId = profileMode === 'self'
    ? currentUser?.id ?? null
    : requestedProfileChildId ?? currentUser?.id ?? null;
  const profileDataKey = `${athleteId ?? 'none'}:${profileMode}:${profileSubjectId ?? 'none'}:${currentUser?.id ?? 'anon'}`;
  const requestedProfileFrame = useMemo<HomeProfileFrame>(
    () => ({
      dataKey: profileDataKey,
      mode: profileMode,
      subjectId: profileSubjectId ?? null,
      selectedChildId: requestedProfileChildId ?? null,
      selectedChild: requestedSelectedChild ? { ...requestedSelectedChild } : null,
    }),
    [profileDataKey, profileMode, profileSubjectId, requestedProfileChildId, requestedSelectedChild],
  );
  const homeSeedTargets = useMemo(
    () =>
      buildHomeSeedTargets({
        hasChildProfiles,
        selectedChildId,
        fallbackChildId,
        contextChildren,
        currentUserId: currentUser?.id,
        currentUserName: currentUserName,
      }),
    [
      contextChildren,
      contextChildrenSignature,
      currentUser?.id,
      currentUserName,
      fallbackChildId,
      hasChildProfiles,
      selectedChildId,
    ],
  );
  const loadHomeFrame = useCallback(async () => {
    if (!athleteId) {
      return ok(createEmptyHomeFrame(requestedProfileFrame));
    }

    try {
      if (currentUser?.role !== 'COACH') {
        try {
          await ensureRelationalDemoSeeded();

          for (const target of homeSeedTargets) {
            const seedResult = await ensureProgressDemoSeeded(
              target.athleteId,
              target.athleteName,
            );
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
      const nextRecentBadges = badges.slice(0, 3);
      const userClubs = socialFeedService.getUserClubs(currentUser?.id || '');
      const primaryClub = userClubs[0];
      let nextRecentResults: HomeResult[] = [];
      let nextClubHighlights: HomeClubHighlight[] = [];

      if (primaryClub) {
        const [results, highlights] = await Promise.allSettled([
          clubService.getRecentResults(primaryClub.id, 3),
          Promise.resolve(socialFeedService.getFeed(primaryClub.id, 'all')),
        ]);

        nextRecentResults =
          results.status === 'fulfilled'
            ? results.value.map((result) => ({
                ...result,
                clubId: primaryClub.id,
                clubName: primaryClub.name,
              }))
            : [];

        const feed = highlights.status === 'fulfilled' ? highlights.value : [];
        const preferredHighlights = feed.filter(
          (post) =>
            post.postType !== 'match' &&
            post.postType !== 'session' &&
            post.postType !== 'session_announcement',
        );
        nextClubHighlights = (preferredHighlights.length > 0 ? preferredHighlights : feed)
          .slice(0, 3)
          .map((post) => ({
            id: post.id,
            clubId: primaryClub.id,
            clubName: primaryClub.name,
            title: post.title,
            body: post.body,
            createdAt: post.createdAt,
            postType: post.postType,
          }));
      }

      const viewerRole = hasChildProfiles && profileMode === 'child' ? 'parent' : 'athlete';
      const progress = await progressService.getAthleteProgress(athleteId, viewerRole);
      const nextStats = {
        sessions: progress.totalSessions,
        badges: progress.totalBadges,
        level: progress.currentLevel.level,
      };
      const nextStreakInfo = await badgeService.getStreakInfo(athleteId);

      let nextUpcomingBookings: Booking[] = [];
      if (currentUser?.id) {
        const role = hasChildProfiles ? 'parent' : 'athlete';
        const bookings = await bookingService.getBookingsForUser(currentUser.id, role);
        const now = Date.now();
        const selfAthleteId = currentUser.id;

        nextUpcomingBookings = bookings
          .filter((booking) => {
            const isFuture = new Date(booking.scheduledAt).getTime() > now;
            const isConfirmed = booking.status === 'CONFIRMED';
            if (hasChildProfiles && profileMode === 'self') {
              return (
                isFuture &&
                isConfirmed &&
                (booking.athleteId === selfAthleteId ||
                  booking.athleteIds?.includes(selfAthleteId))
              );
            }
            if (!requestedProfileChildId) {
              return isFuture && isConfirmed;
            }
            return (
              isFuture &&
              isConfirmed &&
              (booking.athleteId === requestedProfileChildId ||
                booking.athleteIds?.includes(requestedProfileChildId))
            );
          })
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      }

      return ok<HomeFrameData>({
        profile: requestedProfileFrame,
        recentBadges: nextRecentBadges,
        clubs: userClubs,
        recentResults: nextRecentResults,
        clubHighlights: nextClubHighlights,
        upcomingBookings: nextUpcomingBookings,
        stats: nextStats,
        streakInfo: nextStreakInfo,
      });
    } catch (loadError) {
      logger.error('Failed to load home data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load data. Pull down to refresh.', loadError),
      );
    }
  }, [
    athleteId,
    currentUser?.id,
    currentUser?.role,
    hasChildProfiles,
    homeSeedTargets,
    profileMode,
    requestedProfileChildId,
    requestedProfileFrame,
  ]);
  const {
    data,
    error,
    silentError,
    status,
    refreshing,
    pendingState,
    isPending,
    onRefresh,
    showLoadingState,
    hasRequestedTruthfulFrame,
  } = useScreen<HomeFrameData>({
    load: loadHomeFrame,
    deps: [profileDataKey, currentUserSignature, contextChildrenSignature],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: profileDataKey,
  });
  const visibleFrame = data ?? createEmptyHomeFrame(requestedProfileFrame);
  const visibleProfile = visibleFrame.profile;
  const requestedProfileName =
    requestedProfileFrame.mode === 'self'
      ? currentUser?.name || currentUser?.fullName || 'You'
      : requestedProfileFrame.selectedChild?.name || 'Child';
  const errorMessage = error?.message ?? silentError?.message ?? null;
  const isProfileTransitionPending =
    isPending &&
    pendingState.mode === 'dependency-change' &&
    !hasRequestedTruthfulFrame &&
    status !== 'loading';
  const disableContentInteraction = isProfileTransitionPending;

  useEffect(() => {
    if (!silentError || hasRequestedTruthfulFrame || !data) {
      return;
    }

    const committedProfile = data.profile;
    if (committedProfile.mode === 'self') {
      if (profileMode !== 'self') {
        void setProfileScope({ mode: 'self' });
      }
      return;
    }

    const committedChildId = committedProfile.selectedChildId ?? fallbackChildId;
    if (!committedChildId) {
      return;
    }

    if (selectedChildId !== committedChildId) {
      setSelectedChildIdLocal(committedChildId);
    }
    if (contextActiveChildId !== committedChildId) {
      void contextSetActiveChildId(committedChildId);
    }
    if (profileMode !== 'child' || profileSubjectId !== committedChildId) {
      void setProfileScope({ mode: 'child', childId: committedChildId });
    }
  }, [
    contextActiveChildId,
    contextSetActiveChildId,
    data,
    fallbackChildId,
    hasRequestedTruthfulFrame,
    profileMode,
    profileSubjectId,
    selectedChildId,
    setProfileScope,
    silentError,
  ]);

  return {
    currentUser,
    refreshing,
    loading: showLoadingState,
    error: errorMessage,
    recentBadges: visibleFrame.recentBadges,
    clubs: visibleFrame.clubs,
    recentResults: visibleFrame.recentResults,
    clubHighlights: visibleFrame.clubHighlights,
    stats: visibleFrame.stats,
    streakInfo: visibleFrame.streakInfo,
    isViewingSelfProfile: visibleProfile.mode === 'self',
    canSelfSwitchProfile,
    selectedChildId,
    selectedChild: visibleProfile.selectedChild,
    setSelectedChildId,
    handleSelectNextChild,
    handleToggleSelfChildProfile,
    onRefresh,
    upcomingBookings: visibleFrame.upcomingBookings,
    isMultiChild,
    hasChildProfiles,
    contextChildren,
    isProfileTransitionPending,
    profileTransitionLabel: `Switching to ${requestedProfileName}`,
    disableContentInteraction,
  };
}
