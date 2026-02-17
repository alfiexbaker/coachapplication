import { useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import {
  familyService,
  type FamilyMember,
  type FamilyCalendarEvent,
  type FamilyOverview,
} from '@/services/family';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('FamilyDashboardScreen');

interface FamilyDashboardData {
  members: FamilyMember[];
  upcomingSessions: FamilyCalendarEvent[];
  overview: FamilyOverview | null;
  childRecognitions: BadgeAward[];
}

export function useFamilyDashboard() {
  const { currentUser } = useAuth();

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilyDashboardData>({
        members: [],
        upcomingSessions: [],
        overview: null,
        childRecognitions: [],
      });
    }

    try {
      const [membersData, sessionsData, overviewData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getUpcomingForFamily(currentUser.id, 5),
        familyService.getFamilyOverview(currentUser.id),
      ]);

      // Fetch recognitions for all children
      const childAwardArrays = await Promise.all(
        membersData.map((m) => badgeService.listAwardsForAthlete(m.id)),
      );
      const childRecognitions = childAwardArrays
        .flat()
        .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());

      return ok<FamilyDashboardData>({
        members: membersData,
        upcomingSessions: sessionsData,
        overview: overviewData,
        childRecognitions,
      });
    } catch (error) {
      logger.error('Failed to load family data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load family dashboard.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<FamilyDashboardData>({
    load: loadData,
    deps: [currentUser?.id],
    isEmpty: (value) => value.members.length === 0 && value.upcomingSessions.length === 0,
    refetchOnFocus: true,
  });

  const members = data?.members ?? [];
  const upcomingSessions = data?.upcomingSessions ?? [];
  const overview = data?.overview ?? null;
  const childRecognitions = data?.childRecognitions ?? [];

  const handleMemberPress = useCallback((member: FamilyMember) => {
    router.push(Routes.developmentChildProgress(member.id));
  }, []);

  const handleSessionPress = useCallback((session: FamilyCalendarEvent) => {
    router.push(Routes.booking(session.id));
  }, []);

  const navigateToCalendar = useCallback(() => {
    router.push(Routes.FAMILY_CALENDAR);
  }, []);

  const navigateToSpending = useCallback(() => {
    router.push(Routes.FAMILY_SPENDING);
  }, []);

  const navigateToRecognitions = useCallback(() => {
    // Navigate to first child's progress if available
    if (members.length > 0) {
      router.push(Routes.developmentChildProgress(members[0].id));
    }
  }, [members]);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    members,
    upcomingSessions,
    overview,
    childRecognitions,
    handleMemberPress,
    handleSessionPress,
    navigateToCalendar,
    navigateToSpending,
    navigateToRecognitions,
  };
}
