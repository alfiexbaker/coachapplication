import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import type { Session } from '@/constants/app-types';
import { BADGE_REASONS } from '@/components/badges/badge-award-modal';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useDevBadges');

function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fallbackAthleteName(athleteId: string): string {
  return athleteId
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function getSessionLabel(session: Session): string {
  return session.nextFocusAreas?.[0] ?? 'Coaching session';
}

function getRecognitionDetail(session: Session): string {
  const focus = session.nextFocusAreas?.[0];
  const skill = session.skillsWorkedOn?.[0];
  const effort =
    session.performanceRating >= 4.5
      ? 'Outstanding session quality and consistency'
      : session.performanceRating >= 3.5
        ? 'Strong effort and clear progression'
        : 'Positive attitude with room to build confidence';

  if (focus) {
    return `${effort}. Focus area: ${focus}.`;
  }
  if (skill) {
    return `${effort}. Highlighted skill: ${skill}.`;
  }
  return effort;
}

export type BadgeCategory = 'toAward' | 'recent' | 'shared';

export type BadgeItem = {
  id: string;
  title: string;
  athlete: string;
  athleteId?: string;
  detail: string;
  category: BadgeCategory;
  awardedAt?: string;
  sessionName?: string;
  sharedWith?: string;
};

export const BADGE_TABS: { key: BadgeCategory; label: string; icon: string }[] = [
  { key: 'toAward', label: 'To award', icon: 'ribbon-outline' },
  { key: 'recent', label: 'Recently awarded', icon: 'sparkles-outline' },
  { key: 'shared', label: 'Shared badges', icon: 'share-social-outline' },
];

interface DevBadgesData {
  sessions: Session[];
  coachAwards: BadgeAward[];
  athleteNameById: Record<string, string>;
}

function getSharedLabel(visibility: BadgeAward['visibility']): string {
  if (visibility === 'supporters') return 'Parents & athlete';
  if (visibility === 'athlete') return 'Athlete only';
  return 'Coach only';
}

export function useDevBadges() {
  const { currentUser } = useAuth();
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId?: string }>();

  const [activeTab, setActiveTab] = useState<BadgeCategory>('toAward');
  const [sessionQuery, setSessionQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardContext, setAwardContext] = useState<{
    athleteId: string;
    athleteName: string;
    sessionId?: string;
    sessionLabel?: string;
    reason?: string;
  } | null>(null);

  const [showQuickRecognition, setShowQuickRecognition] = useState(false);
  const [quickRecognitionContext, setQuickRecognitionContext] = useState<{
    athleteId: string;
    athleteName: string;
    sessionId?: string;
    sessionLabel?: string;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<DevBadgesData>({ sessions: [], coachAwards: [], athleteNameById: {} });
    }

    try {
      const [storedSessions, allAwards] = await Promise.all([
        apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
        badgeService.listAwards(),
      ]);

      const coachSessions = storedSessions
        .filter((session) => session.coachId === currentUser.id)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      const coachAwards = allAwards
        .filter((award) => award.coachId === currentUser.id)
        .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());

      const athleteIds = Array.from(
        new Set([
          ...coachSessions.map((session) => session.athleteId).filter(Boolean),
          ...coachAwards.map((award) => award.athleteId).filter(Boolean),
        ]),
      );
      const athleteNameById: Record<string, string> = {};

      if (athleteIds.length > 0) {
        const usersResult = await userService.getUsersByIds(athleteIds);
        if (usersResult.success) {
          usersResult.data.forEach((user) => {
            const normalizedName = user.name?.trim();
            athleteNameById[user.id] =
              normalizedName && normalizedName.length > 0
                ? normalizedName
                : fallbackAthleteName(user.id);
          });
        }
      }

      athleteIds.forEach((athleteId) => {
        if (!athleteNameById[athleteId]) {
          athleteNameById[athleteId] = fallbackAthleteName(athleteId);
        }
      });

      return ok<DevBadgesData>({ sessions: coachSessions, coachAwards, athleteNameById });
    } catch (error) {
      logger.error('Failed to load coach sessions for badges', { coachId: currentUser.id, error });
      return err(serviceError('UNKNOWN', 'Failed to load badge sessions.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<DevBadgesData>({
    load: loadSessions,
    deps: [currentUser?.id],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const sessions = data?.sessions ?? [];
  const coachAwards = data?.coachAwards ?? [];
  const athleteNameById = data?.athleteNameById ?? {};
  const awardsBySession = useMemo(() => {
    const counts = new Map<string, number>();
    coachAwards.forEach((award) => {
      if (!award.sessionId) return;
      counts.set(award.sessionId, (counts.get(award.sessionId) ?? 0) + 1);
    });
    return counts;
  }, [coachAwards]);

  const getAthleteName = useCallback(
    (athleteId: string) => athleteNameById[athleteId] ?? fallbackAthleteName(athleteId),
    [athleteNameById],
  );

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.toLowerCase().trim();
    return sessions
      .filter((session) => {
        if (!q) return true;
        const athleteName = getAthleteName(session.athleteId).toLowerCase();
        return (
          athleteName.includes(q) ||
          getSessionLabel(session).toLowerCase().includes(q) ||
          formatDate(session.completedAt).toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [sessions, sessionQuery, getAthleteName]);

  useEffect(() => {
    if (selectedSessionId || sessions.length === 0) return;
    setSelectedSessionId(sessions[0].id);
  }, [selectedSessionId, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const linkedAthlete = selectedSession ? getAthleteName(selectedSession.athleteId) : 'Session';

  const sessionLabelFn = useCallback(
    (session: Session | null) => {
      if (!session) return undefined;
      return `${getSessionLabel(session)} · ${formatDate(session.completedAt)}`;
    },
    [],
  );

  const badges = useMemo<BadgeItem[]>(() => {
    const toAwardItems: BadgeItem[] = sessions
      .filter((session) => (awardsBySession.get(session.id) ?? 0) === 0)
      .slice(0, 10)
      .map((session) => ({
        id: `to-award-${session.id}`,
        title: 'Session Recognition',
        athlete: getAthleteName(session.athleteId),
        athleteId: session.athleteId,
        detail: getRecognitionDetail(session),
        category: 'toAward' as const,
        sessionName: sessionLabelFn(session),
      }));

    const recentItems: BadgeItem[] = coachAwards.slice(0, 12).map((award) => {
      const session = sessions.find((entry) => entry.id === award.sessionId);
      return {
        id: `recent-${award.id}`,
        title: award.badgeLabel,
        athlete: getAthleteName(award.athleteId),
        athleteId: award.athleteId,
        detail: award.reason,
        category: 'recent' as const,
        awardedAt: award.awardedAt,
        sessionName: session ? sessionLabelFn(session) : undefined,
      };
    });

    const sharedItems: BadgeItem[] = coachAwards
      .filter((award) => award.visibility !== 'coach_only')
      .slice(0, 12)
      .map((award) => ({
        id: `shared-${award.id}`,
        title: award.badgeLabel,
        athlete: getAthleteName(award.athleteId),
        athleteId: award.athleteId,
        detail: award.reason,
        category: 'shared' as const,
        sharedWith: getSharedLabel(award.visibility),
        awardedAt: award.awardedAt,
      }));

    return [...toAwardItems, ...recentItems, ...sharedItems];
  }, [sessions, awardsBySession, coachAwards, getAthleteName, sessionLabelFn]);

  const visibleBadges = useMemo(() => badges.filter((badge) => badge.category === activeTab), [badges, activeTab]);

  const openAwardModal = useCallback(
    (badge: BadgeItem) => {
      const athleteId = badge.athleteId;
      if (!athleteId || !currentUser) return;

      let session: Session | null = null;
      if (selectedSession && selectedSession.athleteId === athleteId) {
        session = selectedSession;
      } else {
        session = sessions.find((entry) => entry.athleteId === athleteId) ?? null;
      }

      const matchFromTitle = BADGE_REASONS.find((reason) =>
        badge.title.toLowerCase().includes(reason.toLowerCase()),
      );
      const reason =
        matchFromTitle ??
        BADGE_REASONS.find((candidate) =>
          badge.detail.toLowerCase().includes(candidate.toLowerCase()),
        );

      setAwardContext({
        athleteId,
        athleteName: badge.athlete,
        sessionId: session?.id,
        sessionLabel: sessionLabelFn(session),
        reason,
      });
      setShowAwardModal(true);
    },
    [currentUser, selectedSession, sessions, sessionLabelFn],
  );

  const closeAwardModal = useCallback(() => {
    setShowAwardModal(false);
    setAwardContext(null);
  }, []);

  const openQuickRecognition = useCallback(
    (athleteId: string, athleteName: string) => {
      const session = sessions.find((entry) => entry.athleteId === athleteId) ?? selectedSession;
      setQuickRecognitionContext({
        athleteId,
        athleteName,
        sessionId: session?.id,
        sessionLabel: session ? sessionLabelFn(session) : undefined,
      });
      setShowQuickRecognition(true);
    },
    [sessions, selectedSession, sessionLabelFn],
  );

  const closeQuickRecognition = useCallback(() => {
    setShowQuickRecognition(false);
    setQuickRecognitionContext(null);
  }, []);

  useEffect(() => {
    if (!sessionIdParam || sessions.length === 0) return;
    const paramId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
    const match = sessions.find((session) => session.id === paramId);
    if (match) setSelectedSessionId(paramId);
  }, [sessionIdParam, sessions]);

  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    activeTab,
    setActiveTab,
    sessionQuery,
    setSessionQuery,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    linkedAthlete,
    filteredSessions,
    visibleBadges,
    showAwardModal,
    awardContext,
    currentUser,
    openAwardModal,
    closeAwardModal,
    showQuickRecognition,
    quickRecognitionContext,
    openQuickRecognition,
    closeQuickRecognition,
  } satisfies {
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    activeTab: BadgeCategory;
    setActiveTab: (key: BadgeCategory) => void;
    sessionQuery: string;
    setSessionQuery: (value: string) => void;
    selectedSessionId: string | null;
    setSelectedSessionId: (value: string | null) => void;
    selectedSession: Session | null;
    linkedAthlete: string;
    filteredSessions: Session[];
    visibleBadges: BadgeItem[];
    showAwardModal: boolean;
    awardContext: {
      athleteId: string;
      athleteName: string;
      sessionId?: string;
      sessionLabel?: string;
      reason?: string;
    } | null;
    currentUser: typeof currentUser;
    openAwardModal: (badge: BadgeItem) => void;
    closeAwardModal: () => void;
    showQuickRecognition: boolean;
    quickRecognitionContext: {
      athleteId: string;
      athleteName: string;
      sessionId?: string;
      sessionLabel?: string;
    } | null;
    openQuickRecognition: (athleteId: string, athleteName: string) => void;
    closeQuickRecognition: () => void;
  };
}
