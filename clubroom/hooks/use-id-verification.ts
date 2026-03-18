import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useIdVerification');

export const ID_TYPES = [
  { id: 'passport', label: 'Passport', icon: 'book' },
  { id: 'driving-license', label: 'Driving License', icon: 'car' },
  { id: 'national-id', label: 'National ID Card', icon: 'id-card' },
];

export interface UseIdVerificationResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  submitting: boolean;
  selectedType: string | null;
  uploaded: boolean;
  isVerified: boolean;
  isPending: boolean;
  setSelectedType: (value: string | null) => void;
  setUploaded: (value: boolean) => void;
  handleUpload: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleMockApprove: () => Promise<void>;
}

export function useIdVerification() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

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

  const handleUpload = useCallback(async () => {
    if (!selectedType) return;
    setUploaded(true);
  }, [selectedType]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !uploaded || !coachId) return;
    setSubmitting(true);
    try {
      const result = await verificationService.submitIdVerification(
        coachId,
        `mock://id-document-${selectedType}.jpg`,
      );
      if (result.success) {
        onRefresh();
        router.back();
      } else {
        logger.error('Failed to submit ID:', result.error);
      }
    } catch (error) {
      logger.error('Failed to submit ID:', error);
    } finally {
      setSubmitting(false);
    }
  }, [coachId, selectedType, uploaded, onRefresh]);

  const handleMockApprove = useCallback(async () => {
    if (!coachId) return;
    setSubmitting(true);
    try {
      const result = await verificationService.mockApproveVerification(coachId, 'identity');
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

  const isVerified = status?.identity.status === 'VERIFIED';
  const isPending = status?.identity.status === 'PENDING';

  return {
    status: status ?? null,
    loading,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedType,
    uploaded,
    isVerified,
    isPending,
    setSelectedType,
    setUploaded,
    handleUpload,
    handleSubmit,
    handleMockApprove,
  } satisfies UseIdVerificationResult;
}
