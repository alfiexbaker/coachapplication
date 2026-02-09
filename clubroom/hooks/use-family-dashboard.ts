import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import {
  familyService,
  type FamilyMember,
  type FamilyCalendarEvent,
  type FamilyOverview,
} from '@/services/family';

const logger = createLogger('FamilyDashboardScreen');

export function useFamilyDashboard() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<FamilyCalendarEvent[]>([]);
  const [overview, setOverview] = useState<FamilyOverview | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [membersData, sessionsData, overviewData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getUpcomingForFamily(currentUser.id, 5),
        familyService.getFamilyOverview(currentUser.id),
      ]);

      setMembers(membersData);
      setUpcomingSessions(sessionsData);
      setOverview(overviewData);
    } catch (error) {
      logger.error('Failed to load family data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  return {
    loading, members, upcomingSessions, overview,
    handleMemberPress, handleSessionPress,
    navigateToCalendar, navigateToSpending,
  };
}
