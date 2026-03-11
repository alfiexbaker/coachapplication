import { useCallback } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ServiceEvents } from '@/services/event-bus';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, validationError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { useAuth } from '@/hooks/use-auth';
import {
  orgOwnerDashboardService,
  type OrgOwnerDashboardData,
} from '@/services/org-owner-dashboard-service';

const logger = createLogger('useClubDashboard');

export interface UseClubDashboardResult {
  clubId: string;
  dashboard: OrgOwnerDashboardData | null;
  status: ScreenStatus;
  loading: boolean;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  navigateTo: (path: Href) => void;
}

export function useClubDashboard(): UseClubDashboardResult {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const resolvedClubId = clubId ?? '';

  const loadDashboard = useCallback(async () => {
    if (!resolvedClubId) {
      return err(validationError('Club ID is required'));
    }
    if (!currentUser?.id) {
      return err(validationError('You must be signed in to view this dashboard'));
    }

    try {
      return orgOwnerDashboardService.getDashboardData(resolvedClubId, currentUser.id);
    } catch (loadError) {
      logger.error('Failed to load club dashboard', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load owner dashboard. Pull down to refresh.', loadError),
      );
    }
  }, [currentUser?.id, resolvedClubId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<OrgOwnerDashboardData>({
    load: loadDashboard,
    deps: [currentUser?.id, resolvedClubId],
    events: [
      ServiceEvents.CLUB_MEMBER_JOINED,
      ServiceEvents.CLUB_MEMBER_LEFT,
      ServiceEvents.BOOKING_CREATED,
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.BOOKING_CANCELLED,
      ServiceEvents.SESSION_CREATED,
      ServiceEvents.SESSION_UPDATED,
      ServiceEvents.OPEN_SESSION_PUBLISHED,
      ServiceEvents.INVOICE_PAID,
      ServiceEvents.INVOICE_WRITTEN_OFF,
      ServiceEvents.INVOICE_RESTORED,
      ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED,
      ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED,
      ServiceEvents.PROBLEM_REPORT_CREATED,
    ],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const loading = status === 'loading';

  const navigateTo = useCallback(
    (path: Href) => {
      router.push(path);
    },
    [router],
  );

  return {
    clubId: resolvedClubId,
    dashboard: data,
    status,
    loading,
    error,
    refreshing,
    onRefresh,
    retry,
    navigateTo,
  };
}
