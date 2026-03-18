import { useCallback } from 'react';

import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus, VerificationItem } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useVerificationHub');

export interface UseVerificationHubResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  loadStatus: () => void;
  progress: number;
  hasCredentials: boolean;
  credentialStatus: VerificationItem;
}

export function useVerificationHub() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;

  const loadStatus = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Sign in as a coach to view verification status.'));
    }

    const result = await verificationService.getStatus(coachId);
    if (!result.success) {
      logger.error('Failed to load verification status:', result.error);
    }
    return result;
  }, [coachId]);

  const {
    data: status,
    status: screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<VerificationStatus>({
    load: loadStatus,
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const loading = screenStatus === 'loading';

  const progress = status ? verificationService.getProgressPercentage(status) : 0;
  const hasCredentials = (status?.credentials.length ?? 0) > 0;

  const credentialStatus: VerificationItem = hasCredentials
    ? status!.credentials.some((c) => c.status === 'VERIFIED')
      ? { status: 'VERIFIED' }
      : status!.credentials.some((c) => c.status === 'PENDING')
        ? { status: 'PENDING' }
        : { status: 'NOT_STARTED' }
    : { status: 'NOT_STARTED' };

  return {
    status: status ?? null,
    loading,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    loadStatus: retry,
    progress,
    hasCredentials,
    credentialStatus,
  } satisfies UseVerificationHubResult;
}
