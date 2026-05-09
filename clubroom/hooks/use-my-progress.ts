/**
 * useMyProgress — data + derived state for the rebuilt continuous My Progress scroll.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  progressService,
  type AthleteProgress,
  type SessionFeedback,
} from '@/services/progress-service';
import {
  clearProgressDemoSeedData,
  ensureProgressDemoSeeded,
  ensureUser1DiamondTestDataSeeded,
} from '@/services/progress/progress-demo-seed-lazy-service';
import { badgeService, type AllBadgeWithProgress } from '@/services/badge-service';
import { mediaService } from '@/services/media-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { resolveCoachAndProfile } from '@/constants/booking-types';
import { useFourCorners } from '@/hooks/use-four-corners';
import { useMonthSummary } from '@/hooks/use-month-summary';
import { usePastSessions } from '@/hooks/use-past-sessions';
import { usePlayerCard } from '@/hooks/use-player-card';
import { useLevelDetection } from '@/hooks/use-level-detection';
import { useCornerPercentiles } from '@/hooks/use-corner-percentiles';
import { usePentagonData } from '@/hooks/use-pentagon-data';
import { monthlySummaryService, type MonthlySummaryCopy } from '@/services/progress/monthly-summary-service';
import { useCoachFocus } from '@/hooks/use-coach-focus';
import {
  progressTermlyReportService,
  type TermlyProgressReport,
} from '@/services/progress/progress-termly-report-service';
import { progressPositionService } from '@/services/progress/progress-position-service';
import { createLogger } from '@/utils/logger';
import { preApiLive } from '@/constants/config';
import type { BadgeAward } from '@/constants/types';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import {
  buildProfileScopePayload,
  buildProfileSubjectOptions,
  getNextProfileSubject,
  type ProfileSubjectOption,
} from '@/utils/profile-subject';
import type { PastSession, PlayerCardData, PositionRole, SessionMedia } from '@/types/progress-types';
import type { SwitcherChild } from '@/components/family/child-switcher';
import type { CoachDirectoryEntry } from '@/constants/relational-demo-seeds';
import type { FamilyHighlightItem } from '@/components/progress/parent-value-summary';
import type { CoachBadgeData } from '@/components/progress/coach-badge';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('MyProgressScreen');
const ENABLE_PROGRESS_DEMO_SEED =
  preApiLive.enabled ||
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === '1';

interface StreakInfo {
  currentStreak: number;
  nextMilestone: number;
  daysToNextMilestone: number;
  streakLabel: string;
}

interface SkillVelocityHighlight {
  skill: string;
  delta: number;
  weeks: number;
}

interface HomeworkCompletionRecord {
  completedAt: string;
  proofUri: string;
  proofType: 'photo' | 'video';
}

interface MyProgressData {
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  allBadges: AllBadgeWithProgress[];
  mostPlayedPosition: PositionRole | null;
  streakInfo: StreakInfo | null;
  media: SessionMedia[];
  coachDirectoryById: Record<string, CoachDirectoryEntry>;
  familyHighlights: FamilyHighlightItem[];
  homeworkCompletion: Record<string, HomeworkCompletionRecord>;
  attendanceDates: string[];
}

function hasMeaningfulProgressData(value: MyProgressData): boolean {
  const totalGoals =
    (value.progress?.activeGoals.length ?? 0) + (value.progress?.completedGoals.length ?? 0);

  return (
    (value.progress?.totalSessions ?? 0) > 0 ||
    value.feedback.length > 0 ||
    value.badges.length > 0 ||
    value.media.length > 0 ||
    totalGoals > 0
  );
}

function sortNewest<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => new Date(right.createdAt ?? '').getTime() - new Date(left.createdAt ?? '').getTime(),
  );
}

function buildCoachDirectoryMap(
  coaches: CoachDirectoryEntry[],
): Record<string, CoachDirectoryEntry> {
  return coaches.reduce<Record<string, CoachDirectoryEntry>>((acc, coach) => {
    acc[coach.id] = coach;
    return acc;
  }, {});
}

function getMostImprovedSkill(progress: AthleteProgress): string | undefined {
  const improvingSkills = progress.skills
    .filter((skill) => skill.trend === 'improving')
    .sort((left, right) => {
      const leftDelta = left.level - (left.previousLevel ?? left.level);
      const rightDelta = right.level - (right.previousLevel ?? right.level);
      return rightDelta - leftDelta;
    });

  return improvingSkills[0]?.skill;
}

function bookingMatchesAthlete(booking: Booking, athleteId: string): boolean {
  if (booking.athleteIds?.includes(athleteId)) {
    return true;
  }
  return booking.athleteId === athleteId;
}

function getSkillVelocityHighlight(progress: AthleteProgress | null): SkillVelocityHighlight | null {
  if (!progress) {
    return null;
  }

  const now = Date.now();
  const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000;
  const candidates = progress.skills
    .map((skill) => {
      const history = (skill.history ?? [])
        .map((point) => ({
          level: point.level,
          timestamp: new Date(point.date).getTime(),
        }))
        .filter((point) => Number.isFinite(point.timestamp))
        .sort((left, right) => left.timestamp - right.timestamp);

      if (history.length < 2) {
        return null;
      }

      const anchor =
        history.find((point) => point.timestamp >= now - sixWeeksMs) ?? history[0];
      const latest = history[history.length - 1];
      if (!anchor || latest.timestamp <= anchor.timestamp) {
        return null;
      }

      const delta = latest.level - anchor.level;
      if (delta <= 0) {
        return null;
      }

      const weeks = Math.max(
        1,
        Math.round((latest.timestamp - anchor.timestamp) / (7 * 24 * 60 * 60 * 1000)),
      );

      return {
        skill: skill.skill,
        delta: Math.round(delta * 10) / 10,
        weeks,
        velocity: delta / weeks,
      };
    })
    .filter(
      (value): value is { skill: string; delta: number; weeks: number; velocity: number } =>
        value !== null,
    )
    .sort((left, right) => right.velocity - left.velocity || right.delta - left.delta);

  const topCandidate = candidates[0];
  if (!topCandidate) {
    return null;
  }

  return {
    skill: topCandidate.skill,
    delta: topCandidate.delta,
    weeks: topCandidate.weeks,
  };
}

export function useMyProgress() {
  const { currentUser } = useAuth();
  const {
    children: contextChildren,
    activeChildId: contextActiveChildId,
    setActiveChildId,
    profileMode,
    profileSubjectId,
    setProfileScope,
    canSelectSelfProfile,
  } = useChildContext();
  const { athleteId: athleteIdParam } = useLocalSearchParams<{ athleteId?: string | string[] }>();

  const isParentContext = Boolean(currentUser?.role === 'PARENT' || contextChildren.length > 0);
  const switcherChildren = useMemo<SwitcherChild[]>(
    () =>
      contextChildren.map((child) => ({
        id: child.id,
        name: child.name,
        initials: child.initials,
        colorCode: child.colorCode,
      })),
    [contextChildren],
  );
  const subjectOptions = useMemo<ProfileSubjectOption[]>(
    () =>
      buildProfileSubjectOptions({
        currentUser,
        children: contextChildren,
        includeSelf: !isParentContext || canSelectSelfProfile,
      }),
    [canSelectSelfProfile, contextChildren, currentUser, isParentContext],
  );
  const hasMultipleChildren = isParentContext && switcherChildren.length > 1;

  const explicitAthleteId = useMemo(() => {
    if (!athleteIdParam) return null;
    return Array.isArray(athleteIdParam) ? athleteIdParam[0] ?? null : athleteIdParam;
  }, [athleteIdParam]);

  const isExplicitAthleteIdValid = useMemo(() => {
    if (!explicitAthleteId || !currentUser?.id) return false;
    if (explicitAthleteId === currentUser.id) return true;
    return contextChildren.some((child) => child.id === explicitAthleteId);
  }, [contextChildren, currentUser?.id, explicitAthleteId]);

  const selectedAthleteId = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    if (isExplicitAthleteIdValid && explicitAthleteId) {
      return explicitAthleteId;
    }

    if (profileMode === 'self') {
      return currentUser.id;
    }

    if (
      profileMode === 'child'
      && profileSubjectId
      && contextChildren.some((child) => child.id === profileSubjectId)
    ) {
      return profileSubjectId;
    }

    if (profileSubjectId) {
      const isSelf = profileSubjectId === currentUser.id;
      const isChild = contextChildren.some((child) => child.id === profileSubjectId);
      if (isSelf || isChild) {
        return profileSubjectId;
      }
    }

    if (!isParentContext) {
      return currentUser.id;
    }
    if (contextChildren.length === 0) {
      return currentUser.id;
    }
    if (contextChildren.length === 1) {
      return contextChildren[0].id;
    }
    if (contextActiveChildId && contextChildren.some((child) => child.id === contextActiveChildId)) {
      return contextActiveChildId;
    }
    return contextChildren[0].id;
  }, [
    contextActiveChildId,
    contextChildren,
    currentUser,
    explicitAthleteId,
    isExplicitAthleteIdValid,
    isParentContext,
    profileMode,
    profileSubjectId,
  ]);

  const selectedChild = useMemo(
    () => contextChildren.find((child) => child.id === selectedAthleteId) ?? null,
    [contextChildren, selectedAthleteId],
  );

  const selectedAthleteName =
    currentUser?.id && selectedAthleteId === currentUser.id
      ? currentUser.name || currentUser.fullName || 'Me'
      : selectedChild?.name ?? currentUser?.name ?? 'Child';

  useEffect(() => {
    if (!selectedAthleteId || !currentUser?.id) {
      return;
    }

    const isSelf = selectedAthleteId === currentUser.id;
    if (isSelf) {
      if (profileMode !== 'self') {
        void setProfileScope({ mode: 'self' });
      }
      return;
    }

    const isChild = contextChildren.some((child) => child.id === selectedAthleteId);
    if (!isChild) {
      return;
    }

    if (contextActiveChildId !== selectedAthleteId) {
      void setActiveChildId(selectedAthleteId);
    }
    if (profileMode !== 'child' || profileSubjectId !== selectedAthleteId) {
      void setProfileScope({ mode: 'child', childId: selectedAthleteId });
    }
  }, [
    contextActiveChildId,
    contextChildren,
    currentUser?.id,
    profileMode,
    profileSubjectId,
    selectedAthleteId,
    setActiveChildId,
    setProfileScope,
  ]);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context for progress screen.'));
    }
    if (!selectedAthleteId) {
      return ok<MyProgressData>({
        progress: null,
        feedback: [],
        badges: [],
        allBadges: [],
        mostPlayedPosition: null,
        streakInfo: null,
        media: [],
        coachDirectoryById: {},
        familyHighlights: [],
        homeworkCompletion: {},
        attendanceDates: [],
      });
    }

    try {
      if (currentUser.role !== 'COACH') {
        try {
          if (__DEV__ && selectedAthleteId === 'user1') {
            await ensureUser1DiamondTestDataSeeded();
          }
          if (ENABLE_PROGRESS_DEMO_SEED) {
            await ensureProgressDemoSeeded(selectedAthleteId, selectedAthleteName);
          } else {
            await clearProgressDemoSeedData(selectedAthleteId);
          }
        } catch (seedError) {
          logger.warn('Progress demo seed bootstrap failed, continuing with live data load.', {
            athleteId: selectedAthleteId,
            error: seedError,
          });
        }
      }

      const viewerRole = isParentContext ? 'parent' : 'athlete';
      const [
        progressData,
        feedbackData,
        badgesData,
        allBadgesData,
        mostPlayedPositionResult,
        streakInfo,
        mediaResult,
        coachDirectory,
        homeworkCompletion,
        bookings,
      ] = await Promise.all([
        progressService.getAthleteProgress(selectedAthleteId, viewerRole),
        progressService.getFeedbackForAthlete(selectedAthleteId, viewerRole),
        badgeService.listAwardsForAthlete(selectedAthleteId),
        badgeService.getAllBadgesWithProgress(selectedAthleteId),
        progressPositionService.getMostPlayedPosition(selectedAthleteId),
        badgeService.getStreakInfo(selectedAthleteId),
        mediaService.listMediaForAthlete(selectedAthleteId),
        apiClient.get<CoachDirectoryEntry[]>(STORAGE_KEYS.COACH_DIRECTORY, []),
        apiClient.get<Record<string, HomeworkCompletionRecord>>(STORAGE_KEYS.HOMEWORK_COMPLETION, {}),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      ]);

      const familyHighlights: FamilyHighlightItem[] =
        isParentContext && contextChildren.length > 1
          ? await Promise.all(
              contextChildren.map(async (child) => {
                const [childProgress, childStreak] = await Promise.all([
                  progressService.getAthleteProgress(child.id, 'parent'),
                  badgeService.getStreakInfo(child.id),
                ]);

                return {
                  athleteId: child.id,
                  athleteName: child.name,
                  sessionsAttended: childProgress.sessionsThisMonth,
                  streakWeeks: childStreak.currentStreak,
                  mostImprovedSkill: getMostImprovedSkill(childProgress),
                } satisfies FamilyHighlightItem;
              }),
            )
          : [];

      progressData.athleteName = selectedAthleteName;
      const visibleBadges = badgesData.filter((badge) => badge.visibility !== 'coach_only');
      const media = mediaResult.success ? mediaResult.data : [];
      const attendanceDates = bookings
        .filter(
          (booking) =>
            booking.status === 'COMPLETED' && bookingMatchesAthlete(booking, selectedAthleteId),
        )
        .map((booking) => booking.scheduledAt)
        .filter((value) => value?.trim().length > 0);
      const coachDirectoryById = buildCoachDirectoryMap(coachDirectory);

      if (!mediaResult.success) {
        logger.error('Failed to load athlete media for progress screen', {
          athleteId: selectedAthleteId,
          error: mediaResult.error,
        });
      }

      logger.info('My progress loaded', {
        userId: currentUser.id,
        athleteId: selectedAthleteId,
        athleteName: selectedAthleteName,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: badgesData.length,
        streakWeeks: streakInfo.currentStreak,
      });

      return ok<MyProgressData>({
        progress: progressData,
        feedback: feedbackData,
        badges: visibleBadges,
        allBadges: allBadgesData,
        mostPlayedPosition: mostPlayedPositionResult.success
          ? mostPlayedPositionResult.data
          : null,
        streakInfo,
        media,
        coachDirectoryById,
        familyHighlights,
        homeworkCompletion,
        attendanceDates,
      });
    } catch (error) {
      logger.error('Failed to load progress', error);
      return err(serviceError('UNKNOWN', 'Failed to load progress data.', error));
    }
  }, [
    contextChildren,
    currentUser?.id,
    currentUser?.role,
    isParentContext,
    selectedAthleteId,
    selectedAthleteName,
  ]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MyProgressData>({
    load: loadData,
    deps: [currentUser?.id, selectedAthleteId],
    isEmpty: (value) => !value.progress || !hasMeaningfulProgressData(value),
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: selectedAthleteId
      ? `my-progress:${currentUser?.id ?? 'missing'}:${selectedAthleteId}`
      : `my-progress:${currentUser?.id ?? 'missing'}:none`,
  });

  const progress = data?.progress ?? null;
  const feedback = useMemo(() => data?.feedback ?? [], [data?.feedback]);
  const badges = useMemo(() => data?.badges ?? [], [data?.badges]);
  const allBadges = useMemo(() => data?.allBadges ?? [], [data?.allBadges]);
  const mostPlayedPosition = data?.mostPlayedPosition ?? null;
  const streakInfo = data?.streakInfo ?? null;
  const media = useMemo(() => data?.media ?? [], [data?.media]);
  const coachDirectoryById = useMemo(() => data?.coachDirectoryById ?? {}, [data?.coachDirectoryById]);
  const familyHighlights = useMemo(() => data?.familyHighlights ?? [], [data?.familyHighlights]);
  const homeworkCompletion = useMemo(() => data?.homeworkCompletion ?? {}, [data?.homeworkCompletion]);
  const attendanceDates = useMemo(() => data?.attendanceDates ?? [], [data?.attendanceDates]);
  const sortedFeedback = useMemo(() => sortNewest(feedback), [feedback]);

  const latestFeedback = sortedFeedback[0] ?? null;
  const primaryPosition = selectedChild?.profile?.primaryPosition ?? null;
  const initializedAthleteIdRef = useRef<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionRole>('MID');

  useEffect(() => {
    if (!selectedAthleteId) {
      initializedAthleteIdRef.current = null;
      setSelectedPosition('MID');
      return;
    }

    if (initializedAthleteIdRef.current === selectedAthleteId) {
      return;
    }

    setSelectedPosition(primaryPosition ?? mostPlayedPosition ?? 'MID');
    initializedAthleteIdRef.current = selectedAthleteId;
  }, [mostPlayedPosition, primaryPosition, selectedAthleteId]);

  const fourCorners = useFourCorners(progress?.skills ?? [], feedback);
  const { pentagonData, availablePositions, universalSkills } = usePentagonData(
    progress?.skills ?? [],
    feedback,
    selectedPosition,
  );
  const cornerValueMap = useMemo(
    () => ({
      technical: fourCorners.corners.find((corner) => corner.key === 'technical')?.value ?? 0,
      physical: fourCorners.corners.find((corner) => corner.key === 'physical')?.value ?? 0,
      psychological: fourCorners.corners.find((corner) => corner.key === 'psychological')?.value ?? 0,
      social: fourCorners.corners.find((corner) => corner.key === 'social')?.value ?? 0,
    }),
    [fourCorners.corners],
  );
  const cornerTopPercentiles = useCornerPercentiles({
    athleteId: selectedAthleteId,
    cornerValues: cornerValueMap,
  });

  useEffect(() => {
    if (availablePositions.length === 0) {
      return;
    }
    if (!availablePositions.some((position) => position.role === selectedPosition)) {
      setSelectedPosition(availablePositions[0].role);
    }
  }, [availablePositions, selectedPosition]);
  const monthSummary = useMonthSummary({ progress, feedback, badges, media });
  const monthSummaryCopy = useMemo(() => {
    if (!progress) {
      return null;
    }

    const result = monthlySummaryService.buildMonthlySummary(
      selectedAthleteName,
      monthSummary,
      progress.skills,
      feedback,
    );
    if (!result.success) {
      logger.error('Failed to generate monthly summary copy', {
        athleteId: selectedAthleteId,
        error: result.error,
      });
      return null;
    }
    return result.data;
  }, [feedback, monthSummary, progress, selectedAthleteId, selectedAthleteName]);

  const coachQualificationById = useMemo(
    () => {
      const fromDirectory = Object.values(coachDirectoryById).reduce<Record<string, string | undefined>>((acc, coach) => {
        acc[coach.id] = coach.qualifications?.[0];
        return acc;
      }, {});

      for (const entry of feedback) {
        if (fromDirectory[entry.coachId]) {
          continue;
        }
        const fallback = resolveCoachAndProfile(entry.coachId).coachProfile;
        fromDirectory[entry.coachId] = fallback?.qualifications?.[0];
      }

      return fromDirectory;
    },
    [coachDirectoryById, feedback],
  );

  const coachFocus = useCoachFocus({ feedback });

  const pastSessions = usePastSessions({ feedback, media, badges, coachQualificationById });
  const playerCard = usePlayerCard({
    athleteName: selectedAthleteName,
    progress,
    feedback,
    badges,
    media,
    streakInfo,
    position: selectedPosition,
  });
  const skillVelocityHighlight = useMemo(
    () => getSkillVelocityHighlight(progress),
    [progress],
  );

  useLevelDetection({
    userId: selectedAthleteId,
    currentLevel: playerCard.levelNumber,
    levelName: playerCard.levelName,
  });

  const handleSelectChild = useCallback(
    (childId: string) => {
      if (!isParentContext) {
        return;
      }
      void setActiveChildId(childId);
      void setProfileScope({ mode: 'child', childId });
    },
    [isParentContext, setActiveChildId, setProfileScope],
  );

  const handleSelectSubject = useCallback(
    (subjectId: string) => {
      const nextSubject = subjectOptions.find((option) => option.id === subjectId);
      if (!nextSubject) {
        return;
      }
      if (nextSubject.kind === 'child') {
        void setActiveChildId(nextSubject.id);
      }
      void setProfileScope(buildProfileScopePayload(nextSubject));
    },
    [setActiveChildId, setProfileScope, subjectOptions],
  );

  const handleSelectNextChild = useCallback(() => {
    const nextSubject = getNextProfileSubject(selectedAthleteId, subjectOptions);
    if (!nextSubject) {
      return;
    }
    if (nextSubject.kind === 'child') {
      void setActiveChildId(nextSubject.id);
    }
    void setProfileScope(buildProfileScopePayload(nextSubject));
  }, [selectedAthleteId, setActiveChildId, setProfileScope, subjectOptions]);

  const latestCoachBadge = useMemo<CoachBadgeData | null>(() => {
    if (!latestFeedback?.coachId) {
      return null;
    }

    const coach = coachDirectoryById[latestFeedback.coachId];
    if (coach) {
      return {
        qualificationLevel: coach.qualifications?.[0],
        yearsExperience: coach.yearsExperience,
        dbsChecked: coach.dbsChecked,
      };
    }

    const fallback = resolveCoachAndProfile(latestFeedback.coachId).coachProfile;
    if (!fallback) {
      return null;
    }
    return {
      qualificationLevel: fallback.qualifications?.[0],
      yearsExperience: fallback.yearsExperience,
      dbsChecked: fallback.dbsChecked,
    };
  }, [coachDirectoryById, latestFeedback?.coachId]);

  const latestHomeworkFeedback = useMemo(
    () => sortedFeedback.find((entry) => entry.homework?.trim().length > 0) ?? null,
    [sortedFeedback],
  );
  const homeworkCompleted = latestHomeworkFeedback
    ? Boolean(homeworkCompletion[latestHomeworkFeedback.id])
    : false;
  const latestHomeworkProof = latestHomeworkFeedback
    ? homeworkCompletion[latestHomeworkFeedback.id] ?? null
    : null;

  const markHomeworkDone = useCallback(async (
    proof: { proofUri: string; proofType: 'photo' | 'video' },
  ) => {
    if (!selectedAthleteId || !latestHomeworkFeedback || homeworkCompleted || !proof.proofUri.trim()) {
      return;
    }

    const existing = await apiClient.get<Record<string, HomeworkCompletionRecord>>(
      STORAGE_KEYS.HOMEWORK_COMPLETION,
      {},
    );
    await apiClient.set(STORAGE_KEYS.HOMEWORK_COMPLETION, {
      ...existing,
      [latestHomeworkFeedback.id]: {
        completedAt: new Date().toISOString(),
        proofUri: proof.proofUri.trim(),
        proofType: proof.proofType,
      },
    });
    onRefresh();
  }, [homeworkCompleted, latestHomeworkFeedback, onRefresh, selectedAthleteId]);

  const generateTermlyReport = useCallback(async (): Promise<Result<TermlyProgressReport, ServiceError>> => {
    if (!selectedAthleteId) {
      return err(serviceError('VALIDATION', 'No athlete selected for report export.'));
    }

    const reportResult = await progressTermlyReportService.generateTermlyReport({
      athleteId: selectedAthleteId,
      athleteName: selectedAthleteName,
      viewerRole: isParentContext ? 'parent' : 'athlete',
    });
    if (!reportResult.success) {
      return reportResult;
    }

    const snapshotResult = await progressTermlyReportService.saveReportSnapshot(reportResult.data);
    if (!snapshotResult.success) {
      logger.error('Failed to save termly report snapshot', {
        athleteId: selectedAthleteId,
        error: snapshotResult.error,
      });
    }

    return reportResult;
  }, [isParentContext, selectedAthleteId, selectedAthleteName]);

  return {
    currentUser,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    progress,
    feedback,
    badges,
    allBadges,
    media,
    streakInfo,
    fourCorners,
    pentagonData,
    selectedPosition,
    setSelectedPosition,
    availablePositions,
    universalSkills,
    cornerTopPercentiles,
    monthSummary,
    monthSummaryCopy,
    pastSessions,
    playerCard,
    latestFeedback,
    latestCoachBadge,
    latestHomeworkFeedback,
    homeworkCompleted,
    latestHomeworkProof,
    skillVelocityHighlight,
    attendanceDates,
    markHomeworkDone,
    coachFocus,
    familyHighlights,
    isParentContext,
    hasMultipleChildren,
    switcherChildren,
    subjectOptions,
    selectedAthleteId,
    selectedAthleteName,
    activeChildId: contextActiveChildId,
    handleSelectChild,
    handleSelectSubject,
    handleSelectNextChild,
    generateTermlyReport,
    handleRefresh: onRefresh,
  } satisfies {
    currentUser: typeof currentUser;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    progress: AthleteProgress | null;
    feedback: SessionFeedback[];
    badges: BadgeAward[];
    allBadges: AllBadgeWithProgress[];
    media: SessionMedia[];
    streakInfo: StreakInfo | null;
    fourCorners: ReturnType<typeof useFourCorners>;
    pentagonData: ReturnType<typeof usePentagonData>['pentagonData'];
    selectedPosition: PositionRole;
    setSelectedPosition: (position: PositionRole) => void;
    availablePositions: ReturnType<typeof usePentagonData>['availablePositions'];
    universalSkills: ReturnType<typeof usePentagonData>['universalSkills'];
    cornerTopPercentiles: Record<'technical' | 'physical' | 'psychological' | 'social', number | null>;
    monthSummary: ReturnType<typeof useMonthSummary>;
    monthSummaryCopy: MonthlySummaryCopy | null;
    pastSessions: PastSession[];
    playerCard: PlayerCardData;
    latestFeedback: SessionFeedback | null;
    latestCoachBadge: CoachBadgeData | null;
    latestHomeworkFeedback: SessionFeedback | null;
    homeworkCompleted: boolean;
    latestHomeworkProof: HomeworkCompletionRecord | null;
    skillVelocityHighlight: SkillVelocityHighlight | null;
    attendanceDates: string[];
    markHomeworkDone: (proof: { proofUri: string; proofType: 'photo' | 'video' }) => Promise<void>;
    coachFocus: ReturnType<typeof useCoachFocus>;
    familyHighlights: FamilyHighlightItem[];
    isParentContext: boolean;
    hasMultipleChildren: boolean;
    switcherChildren: SwitcherChild[];
    subjectOptions: ProfileSubjectOption[];
    selectedAthleteId: string | null;
    selectedAthleteName: string;
    activeChildId: string | null;
    handleSelectChild: (childId: string) => void;
    handleSelectSubject: (subjectId: string) => void;
    handleSelectNextChild: () => void;
    generateTermlyReport: () => Promise<Result<TermlyProgressReport, ServiceError>>;
    handleRefresh: () => void;
  };
}
