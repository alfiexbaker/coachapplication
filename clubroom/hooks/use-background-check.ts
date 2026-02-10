import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';

import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';

const logger = createLogger('useBackgroundCheck');
const COACH_ID = 'coach1';

export const BG_CHECK_STEPS = [
  { id: 1, title: 'Provide Details', description: 'Enter your personal information for the background check' },
  { id: 2, title: 'Consent & ID Verification', description: 'Confirm your identity and provide consent for the check' },
  { id: 3, title: 'Review & Submit', description: 'The check is processed by our trusted partner' },
  { id: 4, title: 'Receive Results', description: 'Certificate issued upon successful completion' },
];

export function useBackgroundCheck() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    const result = await verificationService.getStatus(COACH_ID);
    if (result.success) {
      setStatus(result.data);
    } else {
      logger.error('Failed to load verification status:', result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleStartCheck = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await verificationService.startBackgroundCheck(COACH_ID);
      if (result.success) {
        await loadStatus();
      } else {
        logger.error('Failed to start background check:', result.error);
      }
    } catch (error) {
      logger.error('Failed to start background check:', error);
    } finally {
      setSubmitting(false);
    }
  }, [loadStatus]);

  const handleMockApprove = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await verificationService.mockApproveVerification(COACH_ID, 'backgroundCheck');
      if (result.success) {
        router.back();
      } else {
        logger.error('Failed to approve:', result.error);
      }
    } catch (error) {
      logger.error('Failed to approve:', error);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const isVerified = status?.backgroundCheck.status === 'VERIFIED';
  const isPending = status?.backgroundCheck.status === 'PENDING';

  return { status, loading, submitting, isVerified, isPending, handleStartCheck, handleMockApprove };
}
