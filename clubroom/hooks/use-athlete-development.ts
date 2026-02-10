/**
 * Hook for the athlete development detail screen.
 * Manages sessions, badges, progression, special needs, and badge award modal state.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { getUserById, getSessionsForCoach, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { badgeService } from '@/services/badge-service';
import { childService, type ChildProfile } from '@/services/child-service';
import type { Session, BadgeAward, BadgeCategory } from '@/constants/types';
import type { ProgressionLevel } from '@/constants/progression';

const logger = createLogger('AthleteDetailScreen');

export interface ProgressionSummary {
  totalPoints: number;
  currentLevel: ProgressionLevel;
  nextLevel: ProgressionLevel | null;
  progressPercent: number;
  pointsToNext: number;
  totalBadges: number;
  topCategories: { category: BadgeCategory; label: string; badgeCount: number; totalPoints: number }[];
}

export interface LevelBadge {
  name: string;
  icon: 'trophy-outline' | 'medal-outline' | 'ribbon-outline';
  color: string;
}

export function useAthleteDevelopment(athleteId: string) {
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<ProgressionSummary | null>(null);

  const athlete = getUserById(athleteId);

  // Load sessions from mock data + AsyncStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;
      try {
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );
        const asyncSessions = await apiClient.get<Session[]>('coach_sessions', []);
        const athleteAsyncSessions = asyncSessions.filter(
          (s) => s.athleteId === athleteId && s.coachId === currentUser.id
        );
        const allSessions = [...mockSessions, ...athleteAsyncSessions];
        setSessions(allSessions);
        logger.debug('Sessions loaded', {
          mockCount: mockSessions.length,
          asyncCount: athleteAsyncSessions.length,
          total: allSessions.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );
        setSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [athleteId, currentUser]);

  // Load awards + progression summary
  useEffect(() => {
    if (!athleteId) return;
    Promise.all([
      badgeService.listAwardsForAthlete(athleteId),
      badgeService.getProgressionSummary(athleteId),
    ]).then(([awardsData, progression]) => {
      setAwards(awardsData);
      setProgressionSummary(progression);
    });
  }, [athleteId]);

  // Load child profile for special needs
  useEffect(() => {
    if (!athlete) return;
    const loadChildProfile = async () => {
      try {
        const nameParts = athlete.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const profile = await childService.getChildByName(firstName, lastName);
        if (profile) {
          setChildProfile(profile);
          logger.debug('Child profile loaded', { athleteId, childId: profile.id, hasSpecialNeeds: profile.hasSpecialNeeds });
        }
      } catch (error) {
        logger.error('Failed to load child profile', error);
      }
    };
    loadChildProfile();
  }, [athlete, athleteId]);

  // Computed: progress trend
  const trend = useMemo(() => {
    if (sessions.length < 2) return 'steady' as const;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const recentAvg = sorted.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sorted.length);
    const prevSlice = sorted.slice(3, 6);
    if (sorted.length < 4 || prevSlice.length === 0) return 'steady' as const;
    const previousAvg = prevSlice.reduce((sum, s) => sum + s.performanceRating, 0) / prevSlice.length;
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
    () => [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [sessions]
  );

  // Computed: selected session label
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.nextFocusAreas?.[0] ?? 'Coaching session'} · ${formatDate(selectedSession.completedAt)}`
    : undefined;

  // Handler: log a new session
  const handleLogSession = useCallback(async () => {
    if (!currentUser || !athlete) return;
    logger.press('LogSession');
    try {
      const sessionId = `session-${Date.now()}`;
      const sessionRecord = {
        id: sessionId,
        athleteId,
        athleteName: athlete.name,
        coachId: currentUser.id,
        coachName: currentUser.name,
        bookingId: `manual-${Date.now()}`,
        completedAt: new Date().toISOString(),
        performanceRating: 3,
        skillsWorkedOn: [],
        notes: '',
        videoUrls: [],
        nextFocusAreas: [],
        attendance: 'ATTENDED' as const,
      };
      const existing = await apiClient.get<Session[]>('coach_sessions', []);
      existing.push(sessionRecord);
      await apiClient.set('coach_sessions', existing);
      logger.info('Session created', { sessionId, athleteId });
      router.push(Routes.developmentSession(sessionId));
    } catch (error) {
      logger.error('Failed to create session', error);
    }
  }, [currentUser, athlete, athleteId]);

  // Handler: open badge modal from profile button
  const handleOpenBadgeModal = useCallback(() => {
    logger.press('AwardBadgeFromProfile', { athleteId });
    setShowBadgeModal(true);
  }, [athleteId]);

  // Handler: select session for badge workspace
  const handleSelectSession = useCallback((session: Session) => {
    logger.info('badge_workspace_deeplink', {
      sessionId: session.id,
      athleteId,
      source: 'AthleteSessionHistory',
    });
    setSelectedSession(session);
  }, [athleteId]);

  // Handler: close modal
  const handleCloseModal = useCallback(() => {
    setSelectedSession(null);
    setShowBadgeModal(false);
  }, []);

  // Handler: badge awarded
  const handleOnAwarded = useCallback((award: BadgeAward) => {
    setAwards((prev) => [award, ...prev]);
  }, []);

  return {
    athlete,
    currentUser,
    loading,
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
    handleLogSession,
    handleOpenBadgeModal,
    handleSelectSession,
    handleCloseModal,
    handleOnAwarded,
  };
}
