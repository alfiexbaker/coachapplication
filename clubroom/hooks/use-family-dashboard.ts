import { useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { familyService, type FamilyMember, type FamilyCalendarEvent } from '@/services/family';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('FamilyOverviewScreen');

interface FamilyDashboardData {
  members: FamilyMember[];
  upcomingSessions: FamilyCalendarEvent[];
}

export function useFamilyDashboard() {
  const { currentUser } = useAuth();

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilyDashboardData>({
        members: [],
        upcomingSessions: [],
      });
    }

    try {
      const [membersData, sessionsData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getUpcomingForFamily(currentUser.id, 5),
      ]);

      return ok<FamilyDashboardData>({
        members: membersData,
        upcomingSessions: sessionsData,
      });
    } catch (error) {
      logger.error('Failed to load family data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load family overview.', error));
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

  const handleMemberPress = useCallback((member: FamilyMember) => {
    router.push(Routes.developmentChildProgress(member.id));
  }, []);

  const handleSessionPress = useCallback((session: FamilyCalendarEvent) => {
    router.push(Routes.booking(session.id, { returnTo: Routes.FAMILY as string }));
  }, []);

  const navigateToCalendar = useCallback(() => {
    router.push(Routes.FAMILY_CALENDAR);
  }, []);

  const navigateToSpending = useCallback(() => {
    router.push(Routes.FAMILY_SPENDING);
  }, []);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    members,
    upcomingSessions,
    handleMemberPress,
    handleSessionPress,
    navigateToCalendar,
    navigateToSpending,
  };
}
