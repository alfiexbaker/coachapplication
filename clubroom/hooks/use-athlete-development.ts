/**
 * Hook for the athlete development detail screen.
 * Manages sessions, badges, progression, special needs, and badge award modal state.
 */
import { useState, useCallback, useMemo } from 'react';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { badgeService } from '@/services/badge-service';
import { childService, type ChildProfile } from '@/services/child-service';
import { userService } from '@/services/user-service';
import type { Session, BadgeAward, BadgeCategory, User } from '@/constants/types';
import type { ProgressionLevel } from '@/constants/progression';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

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

export interface LevelBadge {
  name: string;
  icon: 'trophy-outline' | 'medal-outline' | 'ribbon-outline';
  color: string;
}

interface AthleteDevelopmentData {
  athlete: User | null;
  sessions: Session[];
  awards: BadgeAward[];
  childProfile: ChildProfile | null;
  progressionSummary: ProgressionSummary | null;
}

function formatDate(date: Date | string): string {
  const resolvedDate = typeof date === 'string' ? new Date(date) : date;
  return resolvedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function useAthleteDevelopment(athleteId: string) {
  const { currentUser } = useAuth();

  const [optimisticAwards, setOptimisticAwards] = useState<BadgeAward[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const loadDevelopment = useCallback(async () => {
    if (!athleteId) {
      return err(serviceError('VALIDATION', 'Missing athlete id.'));
    }
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context.'));
    }

    try {
      const athleteResult = await userService.getUserById(athleteId);
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

      const [allSessions, awardsData, progression, childProfile] = await Promise.all([
        ensureCoachSessionsSeeded(),
        badgeService.listAwardsForAthlete(athleteId),
        badgeService.getProgressionSummary(athleteId),
        childService.getChild(athleteId),
      ]);

      const athleteSessions = allSessions.filter(
        (session) => session.athleteId === athleteId && session.coachId === currentUser.id,
      );

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
      logger.error('Failed to load athlete development', { athleteId, error });
      return err(serviceError('UNKNOWN', 'Failed to load athlete progress.', error));
    }
  }, [athleteId, currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AthleteDevelopmentData>({
    load: loadDevelopment,
    deps: [athleteId, currentUser?.id],
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
  const awards = useMemo(() => {
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
  }, [baseAwards, optimisticAwards]);
  const childProfile = data?.childProfile ?? null;
  const progressionSummary = data?.progressionSummary ?? null;

  // Computed: progress trend
  const trend = useMemo(() => {
    if (sessions.length < 2) return 'steady' as const;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const recentAvg =
      sorted.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) /
      Math.min(3, sorted.length);
    const prevSlice = sorted.slice(3, 6);
    if (sorted.length < 4 || prevSlice.length === 0) return 'steady' as const;
    const previousAvg =
      prevSlice.reduce((sum, s) => sum + s.performanceRating, 0) / prevSlice.length;
    if (recentAvg > previousAvg + 0.3) return 'improving' as const;
    if (recentAvg < previousAvg - 0.3) return 'declining' as const;
    return 'steady' as const;
  }, [sessions]);

  // Computed: level badge
  const level: LevelBadge = useMemo(() => {
    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: 'trophy-outline' as const, color: '#FFD700' };
    if (count >= 10) return { name: 'Silver', icon: 'medal-outline' as const, color: '#C0C0C0' };
    return { name: 'Bronze', icon: 'ribbon-outline' as const, color: '#CD7F32' };
  }, [sessions.length]);

  // Computed: sorted sessions
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [sessions],
  );

  // Computed: selected session label
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.nextFocusAreas?.[0] ?? 'Coaching session'} · ${formatDate(selectedSession.completedAt)}`
    : undefined;

  // Handler: open badge modal from profile button
  const handleOpenBadgeModal = useCallback(() => {
    logger.press('AwardBadgeFromProfile', { athleteId });
    setShowBadgeModal(true);
  }, [athleteId]);

  // Handler: select session for badge workspace
  const handleSelectSession = useCallback(
    (session: Session) => {
      logger.info('badge_workspace_deeplink', {
        sessionId: session.id,
        athleteId,
        source: 'AthleteSessionHistory',
      });
      setSelectedSession(session);
    },
    [athleteId],
  );

  // Handler: close modal
  const handleCloseModal = useCallback(() => {
    setSelectedSession(null);
    setShowBadgeModal(false);
  }, []);

  // Handler: badge awarded
  const handleOnAwarded = useCallback(
    (award: BadgeAward) => {
      setOptimisticAwards((prev) => [award, ...prev.filter((item) => item.id !== award.id)]);
      onRefresh();
    },
    [onRefresh],
  );

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
    trend,
    level,
    selectedSessionLabel,
    handleOpenBadgeModal,
    handleSelectSession,
    handleCloseModal,
    handleOnAwarded,
  };
}
