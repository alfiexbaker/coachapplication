import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useBackgroundCheck');

export const BG_CHECK_STEPS = [
  {
    id: 1,
    title: 'Provide Details',
    description: 'Enter your personal information for the background check',
  },
  {
    id: 2,
    title: 'Consent & ID Verification',
    description: 'Confirm your identity and provide consent for the check',
  },
  { id: 3, title: 'Review & Submit', description: 'The check is processed by our trusted partner' },
  { id: 4, title: 'Receive Results', description: 'Certificate issued upon successful completion' },
];

export interface UseBackgroundCheckResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  submitting: boolean;
  isVerified: boolean;
  isPending: boolean;
  handleStartCheck: () => Promise<void>;
  handleMockApprove: () => Promise<void>;
}

export function useBackgroundCheck() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);

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
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ? `verification-background:${coachId}` : 'verification-background:missing',
  });

  const loading = screenStatus === 'loading';

  const handleStartCheck = useCallback(async () => {
    if (!coachId) return;

    setSubmitting(true);
    try {
      const result = await verificationService.startBackgroundCheck(coachId);
      if (result.success) {
        onRefresh();
      } else {
        logger.error('Failed to start background check:', result.error);
      }
    } catch (error) {
      logger.error('Failed to start background check:', error);
    } finally {
      setSubmitting(false);
    }
  }, [coachId, onRefresh]);

  const handleMockApprove = useCallback(async () => {
    if (!coachId) return;

    setSubmitting(true);
    try {
      const result = await verificationService.mockApproveVerification(coachId, 'backgroundCheck');
      if (result.success) {
        onRefresh();
        router.back();
      } else {
        logger.error('Failed to approve:', result.error);
      }
    } catch (error) {
      logger.error('Failed to approve:', error);
    } finally {
      setSubmitting(false);
    }
  }, [coachId, onRefresh]);

  const isVerified = status?.backgroundCheck.status === 'VERIFIED';
  const isPending = status?.backgroundCheck.status === 'PENDING';

  return {
    status: status ?? null,
    loading,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    isVerified,
    isPending,
    handleStartCheck,
    handleMockApprove,
  } satisfies UseBackgroundCheckResult;
}
