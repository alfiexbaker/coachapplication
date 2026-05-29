/**
 * Hook: useCredentials
 *
 * Manages credentials screen state: load verification status, submit credentials.
 * Used by app/verification/credentials.tsx
 */

import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { verificationService } from '@/services/verification-service';
import type { VerificationStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, serviceError, type ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCredentials');

export const CREDENTIAL_TYPES = [
  { id: 'fa-level1', label: 'FA Level 1', category: 'Coaching Badge' },
  { id: 'fa-level2', label: 'FA Level 2', category: 'Coaching Badge' },
  { id: 'fa-level3', label: 'FA Level 3 (UEFA B)', category: 'Coaching Badge' },
  { id: 'first-aid', label: 'Emergency First Aid', category: 'First Aid' },
  { id: 'safeguarding', label: 'Safeguarding Certificate', category: 'Child Safety' },
  { id: 'other', label: 'Other Qualification', category: 'Other' },
] as const;

export interface UseCredentialsResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  credentials: VerificationStatus['credentials'];
  verifiedCount: number;
  submitting: boolean;
  showForm: boolean;
  selectedType: string | null;
  customName: string;
  uploaded: boolean;
  setShowForm: (value: boolean) => void;
  setSelectedType: (value: string | null) => void;
  setCustomName: (value: string) => void;
  handleUpload: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  setUploaded: (value: boolean) => void;
}

export function useCredentials() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [uploaded, setUploaded] = useState(false);

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
    dataKey: coachId ? `verification-credentials:${coachId}` : 'verification-credentials:missing',
  });

  const loading = screenStatus === 'loading';

  const handleUpload = async () => {
    setUploaded(true);
  };

  const handleSubmit = async () => {
    if (!selectedType || !uploaded || !coachId) return;

    const credentialLabel =
      selectedType === 'other'
        ? customName || 'Other Qualification'
        : CREDENTIAL_TYPES.find((t) => t.id === selectedType)?.label || 'Credential';

    setSubmitting(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await verificationService.submitCredential(
        coachId,
        `mock://credential-${selectedType}.pdf`,
        credentialLabel,
      );
      if (result.success) {
        onRefresh();
        setShowForm(false);
        setSelectedType(null);
        setCustomName('');
        setUploaded(false);
      } else {
        logger.error('Failed to submit credential:', result.error);
      }
    }, async error => {
      logger.error('Failed to submit credential:', error);
    }, () => {
      setSubmitting(false);
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedType(null);
    setCustomName('');
    setUploaded(false);
  };

  const credentials = status?.credentials ?? [];
  const verifiedCount = credentials.filter((c) => c.status === 'VERIFIED').length;

  return {
    status: status ?? null,
    loading,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    credentials,
    verifiedCount,
    submitting,
    showForm,
    selectedType,
    customName,
    uploaded,
    setShowForm,
    setSelectedType,
    setCustomName,
    handleUpload,
    handleSubmit,
    resetForm,
    setUploaded,
  } satisfies UseCredentialsResult;
}
