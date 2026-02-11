import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/constants/app-types';
import { BADGE_REASONS } from '@/components/badges/badge-award-modal';
import { getSessionAthleteName } from '@/utils/session-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useDevBadges');

function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

export const BADGES: BadgeItem[] = [
  {
    id: 'consistency',
    title: 'Consistency',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Logged 4+ sessions this month',
    category: 'toAward',
  },
  {
    id: 'leadership',
    title: 'Leadership',
    athlete: 'James Wilson',
    athleteId: 'user3',
    detail: 'Captained team drills and encouraged peers',
    category: 'toAward',
  },
  {
    id: 'recent-pace',
    title: 'Burst of Pace',
    athlete: 'Emma Henderson',
    athleteId: 'user2',
    detail: 'Awarded after sprint focus block',
    category: 'recent',
    awardedAt: '2025-02-13',
    sessionName: 'Speed mechanics lab',
  },
  {
    id: 'recent-keeper',
    title: 'Safe Hands',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Completed three clean sheets in a row',
    category: 'recent',
    awardedAt: '2025-02-11',
    sessionName: 'Shot-stopping clinic',
  },
  {
    id: 'shared-technique',
    title: 'Technique Spotlight',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Shared with parents for weekly digest',
    category: 'shared',
    sharedWith: 'Parents (U13s)',
    awardedAt: '2025-02-09',
  },
  {
    id: 'shared-team',
    title: 'Team Player',
    athlete: 'James Wilson',
    athleteId: 'user3',
    detail: 'Highlighted to club staff',
    category: 'shared',
    sharedWith: 'Club staff channel',
    awardedAt: '2025-02-07',
  },
];

export const BADGE_TABS: { key: BadgeCategory; label: string; icon: string }[] = [
  { key: 'toAward', label: 'To award', icon: 'ribbon-outline' },
  { key: 'recent', label: 'Recently awarded', icon: 'sparkles-outline' },
  { key: 'shared', label: 'Shared badges', icon: 'share-social-outline' },
];

const getSessionLabel = (session: Session) => session.nextFocusAreas?.[0] ?? 'Coaching session';

interface DevBadgesData {
  sessions: Session[];
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

  const loadSessions = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<DevBadgesData>({ sessions: [] });
    }

    try {
      const storedSessions = await apiClient.get<Session[]>('coach_sessions', []);
      const coachSessions = storedSessions.filter((session) => session.coachId === currentUser.id);
      return ok<DevBadgesData>({ sessions: coachSessions });
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

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.toLowerCase();
    return sessions
      .filter(
        (s) =>
          getSessionAthleteName(s).toLowerCase().includes(q) ||
          getSessionLabel(s).toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [sessions, sessionQuery]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const linkedAthlete = selectedSession ? getSessionAthleteName(selectedSession) : 'Session';

  const sessionLabelFn = useCallback((session: Session | null) => {
    if (!session) return undefined;
    return `${getSessionLabel(session)} · ${formatDate(session.completedAt)}`;
  }, []);

  const visibleBadges = useMemo(() => BADGES.filter((b) => b.category === activeTab), [activeTab]);

  const openAwardModal = useCallback(
    (badge: BadgeItem) => {
      const athleteId = badge.athleteId;
      if (!athleteId || !currentUser) return;

      let session: Session | null = null;
      if (selectedSession && selectedSession.athleteId === athleteId) {
        session = selectedSession;
      } else {
        session = sessions.find((s) => s.athleteId === athleteId) ?? null;
      }

      const matchFromTitle = BADGE_REASONS.find((r) =>
        badge.title.toLowerCase().includes(r.toLowerCase()),
      );
      const reason =
        matchFromTitle ??
        BADGE_REASONS.find((r) => badge.detail.toLowerCase().includes(r.toLowerCase()));

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

  useEffect(() => {
    if (!sessionIdParam || sessions.length === 0) return;
    const paramId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
    const match = sessions.find((s) => s.id === paramId);
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
  };
}
