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

const logger = createLogger('useBackgroundCheck');

export interface UseBackgroundCheckResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  submitting: boolean;
  uploaded: boolean;
  isVerified: boolean;
  isPending: boolean;
  handleUpload: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  setUploaded: (value: boolean) => void;
}

export function useBackgroundCheck() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
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
    dataKey: coachId ? `verification-background:${coachId}` : 'verification-background:missing',
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
      fileName: asset.name || 'dbs-certificate',
      contentType: asset.mimeType,
      sizeBytes: asset.size,
      label: 'Enhanced DBS certificate',
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
    await runAsyncTryCatchFinally(
      async () => {
        const result = await verificationService.submitBackgroundCheckVerification(
          coachId,
          selectedDocument,
        );
        if (result.success) {
          setSelectedDocument(null);
          onRefresh();
          uiFeedback.showToast('DBS certificate submitted for review.', 'success');
        } else {
          uiFeedback.showToast(result.error.message, 'error');
        }
      },
      async (error) => {
        logger.error('Failed to submit DBS certificate:', error);
        uiFeedback.showToast('Failed to submit DBS certificate.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

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
    uploaded,
    isVerified,
    isPending,
    handleUpload,
    handleSubmit,
    setUploaded: (value: boolean) => {
      if (!value) setSelectedDocument(null);
    },
  } satisfies UseBackgroundCheckResult;
}
