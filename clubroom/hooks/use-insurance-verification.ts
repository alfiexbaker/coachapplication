import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { verificationService } from '@/services/verification-service';
import { uiFeedback } from '@/services/ui-feedback';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useInsuranceVerification');

export interface UseInsuranceVerificationResult {
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
  handleUpload: () => Promise<void>;
}

export function useInsuranceVerification() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Sign in as a coach to view verification status.'));
    }

    const result = await verificationService.getStatus(coachId);
    if (!result.success) {
      logger.error('Failed to load verification status:', result.error);
    }
    return result;
  };

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
    dataKey: coachId ? `verification-insurance:${coachId}` : 'verification-insurance:missing',
  });

  const loading = screenStatus === 'loading';

  const handleUpload = async () => {
    if (!coachId) return;

    setSubmitting(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await verificationService.mockApproveVerification(coachId, 'insurance');
      if (result.success) {
        onRefresh();
        uiFeedback.showToast('Insurance verification approved.', 'success');
      } else {
        uiFeedback.showToast(result.error.message, 'error');
      }
    }, async error => {
      logger.error('Failed to verify insurance:', error);
      uiFeedback.showToast('Failed to verify insurance.', 'error');
    }, () => {
      setSubmitting(false);
    });
  };

  const isVerified = status?.insurance.status === 'VERIFIED';
  const isPending = status?.insurance.status === 'PENDING';

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
    handleUpload,
  } satisfies UseInsuranceVerificationResult;
}
