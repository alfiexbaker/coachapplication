import { useState } from 'react';
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
  uploaded: boolean;
  handleUpload: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  setUploaded: (value: boolean) => void;
}

export function useInsuranceVerification() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VerificationDocumentUploadInput | null>(null);

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
  const uploaded = Boolean(selectedDocument);

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: VERIFICATION_DOCUMENT_PICKER_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const selection = validateVerificationDocumentSelection({
      uri: asset.uri,
      fileName: asset.name || 'insurance-certificate',
      contentType: asset.mimeType,
      sizeBytes: asset.size,
      label: 'Public liability insurance certificate',
    });
    if (!selection.success) {
      uiFeedback.showToast(selection.error.message, 'error');
      return;
    }
    setSelectedDocument(selection.data);
  };

  const handleSubmit = async () => {
    if (!coachId || !selectedDocument) return;

    setSubmitting(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await verificationService.submitInsuranceVerification(
        coachId,
        selectedDocument,
      );
      if (result.success) {
        setSelectedDocument(null);
        onRefresh();
        uiFeedback.showToast('Insurance document submitted for review.', 'success');
      } else {
        uiFeedback.showToast(result.error.message, 'error');
      }
    }, async error => {
      logger.error('Failed to submit insurance:', error);
      uiFeedback.showToast('Failed to submit insurance document.', 'error');
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
    uploaded,
    handleUpload,
    handleSubmit,
    setUploaded: (value: boolean) => {
      if (!value) setSelectedDocument(null);
    },
  } satisfies UseInsuranceVerificationResult;
}
