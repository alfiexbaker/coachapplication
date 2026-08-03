/**
 * useMyProgress — data + derived state for the rebuilt continuous My Progress scroll.
 */
import { useEffect, useRef, useState, startTransition } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  bookingAuthorityService,
  bookingService,
  mapApiBookingToBooking,
} from '@/services/booking';
import {
  progressService,
  type AthleteProgress,
  type SessionFeedback,
} from '@/services/progress-service';
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
import {
  monthlySummaryService,
  type MonthlySummaryCopy,
} from '@/services/progress/monthly-summary-service';
import { useCoachFocus } from '@/hooks/use-coach-focus';
import {
  progressTermlyReportService,
  type TermlyProgressReport,
} from '@/services/progress/progress-termly-report-service';
import { progressPositionService } from '@/services/progress/progress-position-service';
import {
  progressPracticeTaskService,
  type PracticeTask,
  type TaskViewerRole,
} from '@/services/progress/progress-practice-task-service';
import {
  progressPracticeLogService,
  type PracticeLogEntry,
} from '@/services/progress/progress-practice-log-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { coachService, type Coach } from '@/services/coach-service';
import {
  buildProfileScopePayload,
  buildProfileSubjectOptions,
  getNextProfileSubject,
  type ProfileSubjectOption,
} from '@/utils/profile-subject';
import type {
  PastSession,
  PlayerCardData,
  PositionRole,
  SessionMedia,
} from '@/types/progress-types';
import type { SwitcherChild } from '@/components/family/child-switcher';
import type { FamilyHighlightItem } from '@/components/progress/parent-value-summary';
import type { CoachBadgeData } from '@/components/progress/coach-badge';
import type { Booking } from '@/constants/app-types';
import {
  isSelfAthleteTarget,
  resolveSelfAthleteId,
  resolveSelfAthleteName,
} from '@/utils/athlete-identity';
const logger = createLogger('MyProgressScreen');

async function listOptionalAttendanceBookings(): Promise<Booking[]> {
  if (apiClient.isMockMode) {
    return bookingService.list();
  }

  const result = await bookingAuthorityService.listBookings();
  if (!result.success) {
    logger.warn('Optional progress attendance bookings unavailable', {
      error: result.error.message,
    });
    throw new Error(result.error.message);
  }

  return result.data.map((booking) => mapApiBookingToBooking(booking));
}

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
  proofUri?: string;
  proofType?: 'photo' | 'video';
  taskId?: string;
  completionNote?: string;
}
interface HomeworkState {
  completion: Record<string, HomeworkCompletionRecord>;
  taskIdsByFeedbackId: Record<string, string>;
}
interface ProgressCoachProfile {
  id: string;
  name: string;
  qualifications?: string[];
  yearsExperience?: number;
  dbsChecked?: boolean;
}
interface MyProgressData {
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  allBadges: AllBadgeWithProgress[];
  mostPlayedPosition: PositionRole | null;
  streakInfo: StreakInfo | null;
  media: SessionMedia[];
  coachDirectoryById: Record<string, ProgressCoachProfile>;
  familyHighlights: FamilyHighlightItem[];
  homeworkCompletion: Record<string, HomeworkCompletionRecord>;
  homeworkTaskIdsByFeedbackId: Record<string, string>;
  attendanceDates: string[];
  todayPracticeMinutes: number;
  weeklyPracticeMinutes: number;
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
function sortNewest<
  T extends {
    createdAt?: string;
  },
>(items: T[]): T[] {
  return Array.from(items).toSorted(
    (left, right) =>
      new Date(right.createdAt ?? '').getTime() - new Date(left.createdAt ?? '').getTime(),
  );
}

function dateKeyDaysAgo(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function sumPracticeMinutesForDateWindow(
  logs: Pick<PracticeLogEntry, 'dateKey' | 'minutes'>[],
  throughDateKey: string,
  days: number,
): number {
  const startDateKey = dateKeyDaysAgo(throughDateKey, days - 1);
  return logs.reduce((total, entry) => {
    if (entry.dateKey < startDateKey || entry.dateKey > throughDateKey) {
      return total;
    }
    return total + entry.minutes;
  }, 0);
}
function buildCoachDirectoryMap(
  coaches: ProgressCoachProfile[],
): Record<string, ProgressCoachProfile> {
  return coaches.reduce<Record<string, ProgressCoachProfile>>((acc, coach) => {
    acc[coach.id] = coach;
    return acc;
  }, {});
}
function mapCoachToProgressProfile(coach: Coach): ProgressCoachProfile {
  return {
    id: coach.id,
    name: coach.name,
    qualifications: coach.certifications?.map((certification) => certification.name),
  };
}
export async function loadCoachDirectoryForProgress(
  coachIds: string[] = [],
): Promise<ProgressCoachProfile[]> {
  if (apiClient.isMockMode) {
    return apiClient.get<ProgressCoachProfile[]>(STORAGE_KEYS.COACH_DIRECTORY, []);
  }
  const uniqueCoachIds = Array.from(
    new Set(
      coachIds.flatMap((coachId) => {
        const trimmed = coachId.trim();
        return trimmed ? [trimmed] : [];
      }),
    ),
  );
  const results = await Promise.all(
    uniqueCoachIds.map(async (coachId) => ({
      coachId,
      result: await coachService.getCoach(coachId),
    })),
  );
  return results.flatMap(({ coachId, result }) => {
    if (result.success) {
      return [mapCoachToProgressProfile(result.data)];
    }
    if (result.error.code === 'NOT_FOUND') {
      return [];
    }
    throw new Error(`Failed to load coach profile ${coachId}: ${result.error.message}`);
  });
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

function addIfPresent(values: Set<string>, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) {
    values.add(trimmed);
  }
}

export function resolveHomeworkFeedbackIdsForPracticeTask(
  task: Pick<PracticeTask, 'id' | 'sourceFeedbackId'>,
): string[] {
  const values = new Set<string>();
  addIfPresent(values, task.sourceFeedbackId);
  addIfPresent(values, task.id);
  addIfPresent(values, task.sourceFeedbackId.replace(/^dra_feedback_/, ''));
  addIfPresent(values, task.id.replace(/^practice_task_drill_dra_feedback_/, ''));
  addIfPresent(values, task.id.replace(/^practice_task_/, ''));
  return Array.from(values);
}

export function buildHomeworkStateFromPracticeTasks(tasks: PracticeTask[]): HomeworkState {
  return tasks.reduce<HomeworkState>(
    (state, task) => {
      const feedbackIds = resolveHomeworkFeedbackIdsForPracticeTask(task);
      for (const feedbackId of feedbackIds) {
        state.taskIdsByFeedbackId[feedbackId] = task.id;
        if (task.status === 'completed') {
          state.completion[feedbackId] = {
            completedAt: task.completedAt ?? task.updatedAt,
            taskId: task.id,
            completionNote: task.completionNote,
          };
        }
      }
      return state;
    },
    { completion: {}, taskIdsByFeedbackId: {} },
  );
}

async function loadHomeworkState(
  athleteId: string,
  viewerRole: TaskViewerRole,
): Promise<HomeworkState> {
  if (apiClient.isMockMode) {
    return {
      completion: await apiClient.get<Record<string, HomeworkCompletionRecord>>(
        STORAGE_KEYS.HOMEWORK_COMPLETION,
        {},
      ),
      taskIdsByFeedbackId: {},
    };
  }
  const tasks = await progressPracticeTaskService.listTasksForAthlete(athleteId, viewerRole);
  return buildHomeworkStateFromPracticeTasks(tasks);
}
function getSkillVelocityHighlight(
  progress: AthleteProgress | null,
): SkillVelocityHighlight | null {
  if (!progress) {
    return null;
  }
  const now = Date.now();
  const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000;
  const candidates = progress.skills
    .flatMap((skill) => {
      const mapped = (() => {
        const history = (skill.history ?? [])
          .flatMap((point) => {
            const mapped = {
              level: point.level,
              timestamp: new Date(point.date).getTime(),
            };
            return Number.isFinite(mapped.timestamp) ? [mapped] : [];
          })
          .sort((left, right) => left.timestamp - right.timestamp);
        if (history.length < 2) {
          return null;
        }
        const anchor = history.find((point) => point.timestamp >= now - sixWeeksMs) ?? history[0];
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
      })();
      return mapped !== null ? [mapped] : [];
    })
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
  const practiceLogInFlightRef = useRef(false);
  const [isLoggingPractice, setIsLoggingPractice] = useState(false);
  const {
    children: contextChildren,
    activeChildId: contextActiveChildId,
    setActiveChildId,
    profileMode,
    profileSubjectId,
    setProfileScope,
    canSelectSelfProfile,
    loading: childrenLoading,
  } = useChildContext();
  const { athleteId: athleteIdParam } = useLocalSearchParams<{
    athleteId?: string | string[];
  }>();
  const isParentContext = Boolean(
    currentUser?.role === 'PARENT' ||
    currentUser?.hasChildren ||
    (currentUser?.children?.length ?? 0) > 0 ||
    contextChildren.length > 0,
  );
  const declaredParentHasChildren = Boolean(
    currentUser?.hasChildren || (currentUser?.children?.length ?? 0) > 0,
  );
  const switcherChildren = contextChildren.map((child) => ({
    id: child.id,
    name: child.name,
    initials: child.initials,
    colorCode: child.colorCode,
  }));
  const subjectOptions = buildProfileSubjectOptions({
    currentUser,
    children: contextChildren,
    includeSelf: !isParentContext || canSelectSelfProfile,
  });
  const hasMultipleChildren = isParentContext && switcherChildren.length > 1;
  const selfAthleteId = resolveSelfAthleteId(currentUser);
  const explicitAthleteId = (() => {
    if (!athleteIdParam) return null;
    return Array.isArray(athleteIdParam) ? (athleteIdParam[0] ?? null) : athleteIdParam;
  })();
  const isExplicitAthleteIdValid = (() => {
    if (!explicitAthleteId || !currentUser?.id) return false;
    if (isSelfAthleteTarget(currentUser, explicitAthleteId)) return true;
    return contextChildren.some((child) => child.id === explicitAthleteId);
  })();
  const normalizedExplicitAthleteId = isSelfAthleteTarget(currentUser, explicitAthleteId)
    ? selfAthleteId
    : explicitAthleteId;
  const selectedAthleteId = (() => {
    if (!currentUser) {
      return null;
    }
    if (currentUser.role === 'COACH' && !isExplicitAthleteIdValid) {
      return null;
    }
    if (isExplicitAthleteIdValid && normalizedExplicitAthleteId) {
      return normalizedExplicitAthleteId;
    }
    if (
      isParentContext &&
      declaredParentHasChildren &&
      childrenLoading &&
      contextChildren.length === 0
    ) {
      return null;
    }
    if (profileMode === 'self') {
      if (isParentContext && declaredParentHasChildren && contextChildren.length === 0) {
        return null;
      }
      if (isParentContext && contextChildren.length > 0 && !canSelectSelfProfile) {
        return null;
      }
      return selfAthleteId;
    }
    if (
      profileMode === 'child' &&
      profileSubjectId &&
      contextChildren.some((child) => child.id === profileSubjectId)
    ) {
      return profileSubjectId;
    }
    if (profileSubjectId) {
      const isSelf = isSelfAthleteTarget(currentUser, profileSubjectId);
      const isChild = contextChildren.some((child) => child.id === profileSubjectId);
      if (
        isSelf &&
        isParentContext &&
        (declaredParentHasChildren || contextChildren.length > 0) &&
        !canSelectSelfProfile
      ) {
        return null;
      }
      if (isSelf || isChild) {
        return isSelf ? selfAthleteId : profileSubjectId;
      }
    }
    if (!isParentContext) {
      return selfAthleteId;
    }
    if (contextChildren.length === 0) {
      return null;
    }
    if (contextChildren.length === 1) {
      return contextChildren[0].id;
    }
    if (
      contextActiveChildId &&
      contextChildren.some((child) => child.id === contextActiveChildId)
    ) {
      return contextActiveChildId;
    }
    return contextChildren[0].id;
  })();
  const selectedChild = contextChildren.find((child) => child.id === selectedAthleteId) ?? null;
  const isSelfSubject = isSelfAthleteTarget(currentUser, selectedAthleteId);
  const selectedAthleteName = isSelfSubject
    ? resolveSelfAthleteName(currentUser) || 'Me'
    : (selectedChild?.name ?? currentUser?.name ?? 'Child');
  useEffect(() => {
    if (!selectedAthleteId || !currentUser?.id) {
      return;
    }
    if (isSelfSubject) {
      if (profileMode !== 'self') {
        void setProfileScope({
          mode: 'self',
        });
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
      void setProfileScope({
        mode: 'child',
        childId: selectedAthleteId,
      });
    }
  }, [
    contextActiveChildId,
    contextChildren,
    currentUser?.id,
    isSelfSubject,
    profileMode,
    profileSubjectId,
    selectedAthleteId,
    setActiveChildId,
    setProfileScope,
  ]);
  const loadData = async () => {
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
        homeworkTaskIdsByFeedbackId: {},
        attendanceDates: [],
        todayPracticeMinutes: 0,
        weeklyPracticeMinutes: 0,
      });
    }
    try {
      const viewerRole: TaskViewerRole = isParentContext ? 'parent' : 'athlete';
      const [
        progressData,
        feedbackData,
        badgesData,
        allBadgesData,
        mostPlayedPositionResult,
        streakInfo,
        mediaResult,
        homeworkState,
        bookings,
        practiceLogs,
        todayPractice,
      ] = await Promise.all([
        progressService.getAthleteProgress(selectedAthleteId, viewerRole),
        progressService.getFeedbackForAthlete(selectedAthleteId, viewerRole),
        badgeService.listAwardsForAthlete(selectedAthleteId),
        badgeService.getAllBadgesWithProgress(selectedAthleteId),
        progressPositionService.getMostPlayedPosition(selectedAthleteId),
        badgeService.getStreakInfo(selectedAthleteId),
        mediaService.listMediaForAthlete(selectedAthleteId),
        loadHomeworkState(selectedAthleteId, viewerRole),
        listOptionalAttendanceBookings(),
        progressPracticeLogService.listAthleteLogs(selectedAthleteId),
        progressPracticeLogService.getTodaySummary(selectedAthleteId),
      ]);
      const coachDirectory = await loadCoachDirectoryForProgress(
        feedbackData.map((entry) => entry.coachId),
      );
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
      const attendanceDates = bookings.flatMap((booking) => {
        if (!(booking.status === 'COMPLETED' && bookingMatchesAthlete(booking, selectedAthleteId)))
          return [];
        const mapped = booking.scheduledAt;
        return mapped?.trim().length > 0 ? [mapped] : [];
      });
      const weeklyPracticeMinutes = sumPracticeMinutesForDateWindow(
        practiceLogs,
        todayPractice.dateKey,
        7,
      );
      const coachDirectoryById = buildCoachDirectoryMap(coachDirectory);
      if (!mediaResult.success) {
        logger.error('Failed to load athlete media for progress screen', {
          athleteId: selectedAthleteId,
          error: mediaResult.error,
        });
        return err(mediaResult.error);
      }
      const media = mediaResult.data;
      if (!mostPlayedPositionResult.success) {
        logger.error('Failed to load athlete position history for progress screen', {
          athleteId: selectedAthleteId,
          error: mostPlayedPositionResult.error,
        });
        return err(mostPlayedPositionResult.error);
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
        mostPlayedPosition: mostPlayedPositionResult.data,
        streakInfo,
        media,
        coachDirectoryById,
        familyHighlights,
        homeworkCompletion: homeworkState.completion,
        homeworkTaskIdsByFeedbackId: homeworkState.taskIdsByFeedbackId,
        attendanceDates,
        todayPracticeMinutes: todayPractice.log?.minutes ?? 0,
        weeklyPracticeMinutes,
      });
    } catch (error) {
      logger.warn('Failed to load progress', error);
      return err(serviceError('UNKNOWN', 'Failed to load progress data.', error));
    }
  };
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
  const feedback = data?.feedback ?? [];
  const badges = data?.badges ?? [];
  const allBadges = data?.allBadges ?? [];
  const mostPlayedPosition = data?.mostPlayedPosition ?? null;
  const streakInfo = data?.streakInfo ?? null;
  const media = data?.media ?? [];
  const coachDirectoryById = data?.coachDirectoryById ?? {};
  const familyHighlights = data?.familyHighlights ?? [];
  const homeworkCompletion = data?.homeworkCompletion ?? {};
  const homeworkTaskIdsByFeedbackId = data?.homeworkTaskIdsByFeedbackId ?? {};
  const attendanceDates = data?.attendanceDates ?? [];
  const todayPracticeMinutes = data?.todayPracticeMinutes ?? 0;
  const weeklyPracticeMinutes = data?.weeklyPracticeMinutes ?? 0;

  const logPracticeMinutes = async (minutes: number) => {
    if (!selectedAthleteId) {
      return err(serviceError('VALIDATION', 'Select an athlete before logging practice.'));
    }
    if (practiceLogInFlightRef.current) {
      return err(serviceError('RATE_LIMITED', 'Practice is already being logged.'));
    }
    practiceLogInFlightRef.current = true;
    setIsLoggingPractice(true);
    const result = await progressPracticeLogService
      .logPractice({
        athleteId: selectedAthleteId,
        minutes,
      })
      .catch((error: unknown) =>
        err(serviceError('UNKNOWN', 'Unable to log practice right now.', error)),
      );
    if (result.success) {
      onRefresh();
    }
    practiceLogInFlightRef.current = false;
    setIsLoggingPractice(false);
    return result;
  };
  const sortedFeedback = sortNewest(feedback);
  const latestFeedback = sortedFeedback[0] ?? null;
  const primaryPosition = selectedChild?.profile?.primaryPosition ?? null;
  const initializedAthleteIdRef = useRef<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionRole>('MID');
  useEffect(() => {
    if (!selectedAthleteId) {
      initializedAthleteIdRef.current = null;
      startTransition(() => {
        setSelectedPosition('MID');
      });
      return;
    }
    if (initializedAthleteIdRef.current === selectedAthleteId) {
      return;
    }
    startTransition(() => {
      setSelectedPosition(primaryPosition ?? mostPlayedPosition ?? 'MID');
    });
    initializedAthleteIdRef.current = selectedAthleteId;
  }, [mostPlayedPosition, primaryPosition, selectedAthleteId]);
  const fourCorners = useFourCorners(progress?.skills ?? [], feedback);
  const { pentagonData, availablePositions, universalSkills } = usePentagonData(
    progress?.skills ?? [],
    feedback,
    selectedPosition,
  );
  const cornerValueMap = {
    technical: fourCorners.corners.find((corner) => corner.key === 'technical')?.value ?? 0,
    physical: fourCorners.corners.find((corner) => corner.key === 'physical')?.value ?? 0,
    psychological: fourCorners.corners.find((corner) => corner.key === 'psychological')?.value ?? 0,
    social: fourCorners.corners.find((corner) => corner.key === 'social')?.value ?? 0,
  };
  const cornerTopPercentiles = useCornerPercentiles({
    athleteId: selectedAthleteId,
    cornerValues: cornerValueMap,
  });
  useEffect(() => {
    if (availablePositions.length === 0) {
      return;
    }
    if (!availablePositions.some((position) => position.role === selectedPosition)) {
      startTransition(() => {
        setSelectedPosition(availablePositions[0].role);
      });
    }
  }, [availablePositions, selectedPosition]);
  const monthSummary = useMonthSummary({
    progress,
    feedback,
    badges,
    media,
  });
  const monthSummaryCopy = (() => {
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
  })();
  const coachQualificationById = (() => {
    const fromDirectory = Object.values(coachDirectoryById).reduce<
      Record<string, string | undefined>
    >((acc, coach) => {
      acc[coach.id] = coach.qualifications?.[0];
      return acc;
    }, {});
    for (const entry of feedback) {
      if (fromDirectory[entry.coachId]) {
        continue;
      }
      const fallback = apiClient.isMockMode
        ? resolveCoachAndProfile(entry.coachId).coachProfile
        : undefined;
      fromDirectory[entry.coachId] = fallback?.qualifications?.[0];
    }
    return fromDirectory;
  })();
  const coachFocus = useCoachFocus({
    feedback,
  });
  const pastSessions = usePastSessions({
    feedback,
    media,
    badges,
    coachQualificationById,
  });
  const playerCard = usePlayerCard({
    athleteName: selectedAthleteName,
    progress,
    feedback,
    badges,
    media,
    streakInfo,
    position: selectedPosition,
  });
  const skillVelocityHighlight = getSkillVelocityHighlight(progress);
  useLevelDetection({
    userId: selectedAthleteId,
    currentLevel: playerCard.levelNumber,
    levelName: playerCard.levelName,
  });
  const handleSelectChild = (childId: string) => {
    if (!isParentContext) {
      return;
    }
    void setActiveChildId(childId);
    void setProfileScope({
      mode: 'child',
      childId,
    });
  };
  const handleSelectSubject = (subjectId: string) => {
    const nextSubject = subjectOptions.find((option) => option.id === subjectId);
    if (!nextSubject) {
      return;
    }
    if (nextSubject.kind === 'child') {
      void setActiveChildId(nextSubject.id);
    }
    void setProfileScope(buildProfileScopePayload(nextSubject));
  };
  const handleSelectNextChild = () => {
    const nextSubject = getNextProfileSubject(selectedAthleteId, subjectOptions);
    if (!nextSubject) {
      return;
    }
    if (nextSubject.kind === 'child') {
      void setActiveChildId(nextSubject.id);
    }
    void setProfileScope(buildProfileScopePayload(nextSubject));
  };
  const latestCoachBadge = (() => {
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
    const fallback = apiClient.isMockMode
      ? resolveCoachAndProfile(latestFeedback.coachId).coachProfile
      : null;
    if (!fallback) {
      return null;
    }
    return {
      qualificationLevel: fallback.qualifications?.[0],
      yearsExperience: fallback.yearsExperience,
      dbsChecked: fallback.dbsChecked,
    };
  })();
  const latestHomeworkFeedback =
    sortedFeedback.find((entry) => entry.homework?.trim().length > 0) ?? null;
  const homeworkCompleted = latestHomeworkFeedback
    ? Boolean(homeworkCompletion[latestHomeworkFeedback.id])
    : false;
  const latestHomeworkProof = latestHomeworkFeedback
    ? (homeworkCompletion[latestHomeworkFeedback.id] ?? null)
    : null;
  const markHomeworkDone = async (proof: { proofUri: string; proofType: 'photo' | 'video' }) => {
    if (
      !selectedAthleteId ||
      !currentUser?.id ||
      !latestHomeworkFeedback ||
      homeworkCompleted ||
      !proof.proofUri.trim()
    ) {
      return;
    }
    if (!apiClient.isMockMode) {
      const taskId = homeworkTaskIdsByFeedbackId[latestHomeworkFeedback.id];
      if (!taskId) {
        logger.error('No backend practice task found for homework completion', {
          athleteId: selectedAthleteId,
          feedbackId: latestHomeworkFeedback.id,
        });
        return;
      }
      const completionResult = await progressPracticeTaskService.setTaskCompletion(
        taskId,
        true,
        currentUser.id,
        `${proof.proofType === 'video' ? 'Video' : 'Photo'} proof submitted from My Progress.`,
      );
      if (!completionResult.success) {
        logger.error('Failed to complete homework practice task', {
          athleteId: selectedAthleteId,
          taskId,
          error: completionResult.error,
        });
        return;
      }
      onRefresh();
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
  };
  const generateTermlyReport = async (): Promise<Result<TermlyProgressReport, ServiceError>> => {
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
  };
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
    todayPracticeMinutes,
    weeklyPracticeMinutes,
    logPracticeMinutes,
    isLoggingPractice,
    markHomeworkDone,
    coachFocus,
    familyHighlights,
    isParentContext,
    hasMultipleChildren,
    switcherChildren,
    subjectOptions,
    selectedAthleteId,
    selectedAthleteName,
    isSelfSubject,
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
    cornerTopPercentiles: Record<
      'technical' | 'physical' | 'psychological' | 'social',
      number | null
    >;
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
    todayPracticeMinutes: number;
    weeklyPracticeMinutes: number;
    logPracticeMinutes: (minutes: number) => Promise<Result<PracticeLogEntry, ServiceError>>;
    isLoggingPractice: boolean;
    markHomeworkDone: (proof: { proofUri: string; proofType: 'photo' | 'video' }) => Promise<void>;
    coachFocus: ReturnType<typeof useCoachFocus>;
    familyHighlights: FamilyHighlightItem[];
    isParentContext: boolean;
    hasMultipleChildren: boolean;
    switcherChildren: SwitcherChild[];
    subjectOptions: ProfileSubjectOption[];
    selectedAthleteId: string | null;
    selectedAthleteName: string;
    isSelfSubject: boolean;
    activeChildId: string | null;
    handleSelectChild: (childId: string) => void;
    handleSelectSubject: (subjectId: string) => void;
    handleSelectNextChild: () => void;
    generateTermlyReport: () => Promise<Result<TermlyProgressReport, ServiceError>>;
    handleRefresh: () => void;
  };
}
