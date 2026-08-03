import { useState } from 'react';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  VERIFICATION_DOCUMENT_PICKER_TYPES,
  validateVerificationDocumentSelection,
  verificationService,
  type VerificationDocumentUploadInput,
} from '@/services/verification-service';
import { uiFeedback } from '@/services/ui-feedback';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useIdVerification');

export const ID_TYPES = [
  { id: 'passport', label: 'Passport' },
  { id: 'driving-licence', label: 'Driving licence' },
  { id: 'national-id', label: 'National ID card' },
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
}

export function useIdVerification() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VerificationDocumentUploadInput | null>(
    null,
  );

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
    dataKey: coachId ? `verification-id:${coachId}` : 'verification-id:missing',
  });

  const loading = screenStatus === 'loading';
  const uploaded = Boolean(selectedDocument);

  const handleUpload = async () => {
    if (!selectedType) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: VERIFICATION_DOCUMENT_PICKER_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const selection = validateVerificationDocumentSelection({
      uri: asset.uri,
      fileName: asset.name || `id-document-${selectedType}`,
      contentType: asset.mimeType,
      sizeBytes: asset.size,
      label: ID_TYPES.find((type) => type.id === selectedType)?.label ?? selectedType,
    });
    if (!selection.success) {
      uiFeedback.showToast(selection.error.message, 'error');
      return;
    }
    setSelectedDocument(selection.data);
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedDocument || !coachId) return;
    setSubmitting(true);

    await runAsyncTryCatchFinally(
      async () => {
        const result = await verificationService.submitIdVerification(coachId, selectedDocument);
        if (result.success) {
          uiFeedback.showToast('ID document submitted for review.', 'success');
          onRefresh();
          router.back();
        } else {
          logger.error('Failed to submit ID:', result.error);
          uiFeedback.showToast(result.error.message, 'error');
        }
      },
      async (error) => {
        logger.error('Failed to submit ID:', error);
        uiFeedback.showToast('Failed to submit ID document.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

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
    setSelectedType: (value: string | null) => {
      setSelectedType(value);
      setSelectedDocument(null);
    },
    setUploaded: (value: boolean) => {
      if (!value) setSelectedDocument(null);
    },
    handleUpload,
    handleSubmit,
  } satisfies UseIdVerificationResult;
}
