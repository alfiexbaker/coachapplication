/**
 * Hook for the athlete development detail screen.
 * Manages sessions, badges, progression, special needs, and badge award modal state.
 */
import { useState } from 'react';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { apiClient } from '@/services/api-client';
import { badgeService } from '@/services/badge-service';
import { childService, type ChildProfile } from '@/services/child-service';
import { rosterService } from '@/services/roster-service';
import {
  progressFeedbackService,
  type SessionFeedback,
} from '@/services/progress/progress-feedback-service';
import { userService } from '@/services/user-service';
import type { Session, BadgeAward, BadgeCategory, User } from '@/constants/types';
import type { ProgressionLevel } from '@/constants/progression';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { isBrowserFetchFailure } from '@/utils/network-errors';
import type { AccountType } from '@/services/auth-service';

const logger = createLogger('AthleteDetailScreen');

export interface ProgressionSummary {
  totalPoints: number;
  currentLevel: ProgressionLevel;
  nextLevel: ProgressionLevel | null;
  progressPercent: number;
  pointsToNext: number;
  totalBadges: number;
  topCategories: {
    category: BadgeCategory;
    label: string;
    badgeCount: number;
    totalPoints: number;
  }[];
}

interface AthleteDevelopmentData {
  athlete: User | null;
  sessions: Session[];
  awards: BadgeAward[];
  childProfile: ChildProfile | null;
  progressionSummary: ProgressionSummary | null;
}

function getChildProfileDisplayName(profile: ChildProfile): string {
  return (
    profile.nickname?.trim() ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() ||
    'Athlete'
  );
}

function mapChildProfileToUser(profile: ChildProfile): User {
  return {
    id: profile.id,
    name: getChildProfileDisplayName(profile),
    avatar: profile.photoUrl,
    email: '',
    role: 'USER',
    postcode: '',
    dateOfBirth: profile.dateOfBirth ?? '',
  };
}

function formatDate(date: Date | string): string {
  const resolvedDate = typeof date === 'string' ? new Date(date) : date;
  return resolvedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function clampRating(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(1, Math.min(5, Math.round(value ?? 0)));
}

function mapFeedbackToDevelopmentSession(feedback: SessionFeedback): Session {
  const sessionId = feedback.sessionId || feedback.bookingId || feedback.id;
  const skillsWorkedOn =
    feedback.skillsWorkedOn.length > 0
      ? feedback.skillsWorkedOn
      : feedback.skillRatings.map((rating) => rating.skill);
  const nextFocusAreas = [feedback.improvements, feedback.homework]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    id: sessionId,
    bookingId: feedback.bookingId ?? sessionId,
    coachId: feedback.coachId,
    athleteId: feedback.athleteId,
    completedAt: feedback.createdAt,
    attendance: 'ATTENDED',
    notes: feedback.publicSummary || feedback.improvements || feedback.privateNotes || '',
    skillsWorkedOn,
    performanceRating: clampRating(feedback.overallPerformance || feedback.effortRating),
    nextFocusAreas,
    videoUrls: feedback.videoClipUrls,
    coachName: feedback.coachName,
  };
}

async function loadAthleteDevelopmentSessions(
  athleteId: string,
  coachUserId: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
): Promise<Session[]> {
  if (apiClient.isMockMode) {
    const allSessions = await ensureCoachSessionsSeeded();
    return allSessions.filter(
      (session) => session.athleteId === athleteId && session.coachId === coachUserId,
    );
  }

  const feedback = await progressFeedbackService.getFeedbackForAthlete(athleteId, viewerRole);
  return feedback.map(mapFeedbackToDevelopmentSession);
}

export function resolveDevelopmentViewerRole(user: {
  role: string;
  accountType?: AccountType;
  hasChildren?: boolean;
  children?: readonly unknown[];
}): 'coach' | 'parent' | 'athlete' {
  if (user.accountType === 'COACH' || user.role === 'COACH') {
    return 'coach';
  }
  if (
    user.accountType === 'PARENT' ||
    user.role === 'PARENT' ||
    user.hasChildren ||
    (user.children?.length ?? 0) > 0
  ) {
    return 'parent';
  }
  return 'athlete';
}

type AthleteDevelopmentReader = {
  id: string;
  role: string;
  accountType?: AccountType;
  hasChildren?: boolean;
  children?: readonly { childId: string }[];
};

/**
 * Development data includes health-adjacent player context. API mode leaves the
 * decision to Fastify; the local audit fixture must make the equivalent decision
 * before reading its unscoped demo records.
 */
export async function canReadAthleteDevelopment(
  athleteId: string,
  currentUser: AthleteDevelopmentReader,
): Promise<Result<boolean, ServiceError>> {
  if (!apiClient.isMockMode) {
    return ok(true);
  }

  if (currentUser.id === athleteId) {
    return ok(true);
  }

  const viewerRole = resolveDevelopmentViewerRole(currentUser);
  if (viewerRole === 'parent') {
    return childService.canManageChildProfile(athleteId, currentUser);
  }
  if (viewerRole === 'coach') {
    try {
      return ok(Boolean(await rosterService.getRosterEntry(currentUser.id, athleteId)));
    } catch (error) {
      logger.warn('Could not verify coach athlete assignment', { athleteId, error });
      return err(serviceError('UNKNOWN', 'Could not verify athlete access.'));
    }
  }

  return ok(false);
}

export function useAthleteDevelopment(athleteId: string) {
  const { currentUser } = useAuth();

  const [optimisticAwards, setOptimisticAwards] = useState<BadgeAward[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const loadDevelopment = async () => {
    if (!athleteId) {
      return err(serviceError('VALIDATION', 'Missing athlete id.'));
    }
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context.'));
    }

    try {
      const accessResult = await canReadAthleteDevelopment(athleteId, currentUser);
      if (!accessResult.success) {
        return accessResult;
      }
      if (!accessResult.data) {
        return err(serviceError('UNAUTHORIZED', 'You do not have permission to view this player.'));
      }

      const viewerRole = resolveDevelopmentViewerRole(currentUser);
      const childProfile = await childService.getChild(athleteId);
      const athleteResult = childProfile
        ? ok<User>(mapChildProfileToUser(childProfile))
        : await userService.getUserById(athleteId);
      if (!athleteResult.success) {
        logger.error('Failed to load athlete profile', { athleteId, error: athleteResult.error });
        if (athleteResult.error.code === 'NOT_FOUND') {
          return ok<AthleteDevelopmentData>({
            athlete: null,
            sessions: [],
            awards: [],
            childProfile: null,
            progressionSummary: null,
          });
        }
        return err(athleteResult.error);
      }

      const [athleteSessions, awardsData, progression] = await Promise.all([
        loadAthleteDevelopmentSessions(athleteId, currentUser.id, viewerRole),
        badgeService.listAwardsForAthlete(athleteId),
        badgeService.getProgressionSummary(athleteId),
      ]);

      logger.debug('Development data loaded', {
        athleteId,
        sessionCount: athleteSessions.length,
        badgeCount: awardsData.length,
        hasChildProfile: Boolean(childProfile),
      });

      return ok<AthleteDevelopmentData>({
        athlete: athleteResult.data,
        sessions: athleteSessions,
        awards: awardsData,
        childProfile,
        progressionSummary: progression,
      });
    } catch (error) {
      const details = { athleteId, error };
      if (isBrowserFetchFailure(error)) {
        logger.warn('Athlete development fetch was interrupted', details);
      } else {
        logger.error('Failed to load athlete development', details);
      }
      return err(serviceError('UNKNOWN', 'Failed to load athlete progress.', error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AthleteDevelopmentData>({
    load: loadDevelopment,
    deps: [
      athleteId,
      currentUser?.id,
      currentUser?.role,
      currentUser?.accountType,
      currentUser?.children?.map((child) => child.childId).join(','),
    ],
    isEmpty: (value) => !value.athlete,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey:
      athleteId && currentUser?.id
        ? `athlete-development:${currentUser.id}:${athleteId}`
        : 'athlete-development:missing',
  });

  const athlete = data?.athlete ?? null;
  const sessions = data?.sessions ?? [];
  const baseAwards = data?.awards ?? [];
  const awards = (() => {
    if (optimisticAwards.length === 0) {
      return baseAwards;
    }
    const seen = new Set<string>();
    return [...optimisticAwards, ...baseAwards].filter((award) => {
      const key = award.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  })();
  const childProfile = data?.childProfile ?? null;
  const progressionSummary = data?.progressionSummary ?? null;

  // Computed: sorted sessions
  const sortedSessions = Array.from(sessions).toSorted(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  // Computed: selected session label
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.nextFocusAreas?.[0] ?? 'Coaching session'} · ${formatDate(selectedSession.completedAt)}`
    : undefined;

  // Handler: open badge modal from profile button
  const handleOpenBadgeModal = () => {
    logger.press('AwardBadgeFromProfile', { athleteId });
    setShowBadgeModal(true);
  };

  // Handler: select session for badge workspace
  const handleSelectSession = (session: Session) => {
    logger.info('badge_workspace_deeplink', {
      sessionId: session.id,
      athleteId,
      source: 'AthleteSessionHistory',
    });
    setSelectedSession(session);
  };

  // Handler: close modal
  const handleCloseModal = () => {
    setSelectedSession(null);
    setShowBadgeModal(false);
  };

  // Handler: badge awarded
  const handleOnAwarded = (award: BadgeAward) => {
    setOptimisticAwards((prev) => [award, ...prev.filter((item) => item.id !== award.id)]);
    onRefresh();
  };

  return {
    athlete,
    currentUser,
    loading: status === 'loading',
    status: status as ScreenStatus,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    sessions,
    sortedSessions,
    awards,
    selectedSession,
    showBadgeModal,
    childProfile,
    progressionSummary,
    selectedSessionLabel,
    handleOpenBadgeModal,
    handleSelectSession,
    handleCloseModal,
    handleOnAwarded,
  };
}
