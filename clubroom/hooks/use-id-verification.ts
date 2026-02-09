import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';

import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';

const logger = createLogger('useIdVerification');
const COACH_ID = 'coach1';

export const ID_TYPES = [
  { id: 'passport', label: 'Passport', icon: 'book' },
  { id: 'driving-license', label: 'Driving License', icon: 'car' },
  { id: 'national-id', label: 'National ID Card', icon: 'id-card' },
];

export function useIdVerification() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await verificationService.getStatus(COACH_ID);
      setStatus(data);
    } catch (error) {
      logger.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleUpload = useCallback(async () => {
    if (!selectedType) return;
    setUploaded(true);
  }, [selectedType]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !uploaded) return;
    setSubmitting(true);
    try {
      await verificationService.submitIdVerification(COACH_ID, `mock://id-document-${selectedType}.jpg`);
      router.back();
    } catch (error) {
      logger.error('Failed to submit ID:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, uploaded]);

  const handleMockApprove = useCallback(async () => {
    setSubmitting(true);
    try {
      await verificationService.mockApproveVerification(COACH_ID, 'identity');
      router.back();
    } catch (error) {
      logger.error('Failed to approve:', error);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const isVerified = status?.identity.status === 'VERIFIED';
  const isPending = status?.identity.status === 'PENDING';

  return {
    status, loading, submitting, selectedType, uploaded, isVerified, isPending,
    setSelectedType, setUploaded, handleUpload, handleSubmit, handleMockApprove,
  };
}
