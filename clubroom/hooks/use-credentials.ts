/**
 * Hook: useCredentials
 *
 * Manages credentials screen state: load verification status, submit credentials.
 * Used by app/verification/credentials.tsx
 */

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
import type { VerificationStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, serviceError, type ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCredentials');

export const CREDENTIAL_TYPES = [
  {
    id: 'introduction-to-coaching-football',
    label: 'Introduction to Coaching Football',
    category: 'England Football',
  },
  { id: 'uefa-c', label: 'UEFA C Licence', category: 'Coaching licence' },
  { id: 'uefa-b', label: 'UEFA B Licence', category: 'Coaching licence' },
  { id: 'uefa-a', label: 'UEFA A Licence', category: 'Coaching licence' },
  { id: 'first-aid', label: 'Emergency First Aid', category: 'First aid' },
  { id: 'safeguarding', label: 'Safeguarding certificate', category: 'Safeguarding' },
  { id: 'other', label: 'Other qualification', category: 'Other' },
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
    dataKey: coachId ? `verification-credentials:${coachId}` : 'verification-credentials:missing',
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
    const credentialLabel =
      selectedType === 'other'
        ? customName || 'Other Qualification'
        : CREDENTIAL_TYPES.find((t) => t.id === selectedType)?.label || 'Credential';
    const selection = validateVerificationDocumentSelection({
      uri: asset.uri,
      fileName: asset.name || `credential-${selectedType}`,
      contentType: asset.mimeType,
      sizeBytes: asset.size,
      label: credentialLabel,
    });
    if (!selection.success) {
      uiFeedback.showToast(selection.error.message, 'error');
      return;
    }
    setSelectedDocument(selection.data);
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedDocument || !coachId) return;

    const credentialLabel =
      selectedType === 'other'
        ? customName || 'Other Qualification'
        : CREDENTIAL_TYPES.find((t) => t.id === selectedType)?.label || 'Credential';

    setSubmitting(true);

    await runAsyncTryCatchFinally(
      async () => {
        const result = await verificationService.submitCredential(
          coachId,
          selectedDocument,
          credentialLabel,
        );
        if (result.success) {
          uiFeedback.showToast('Credential submitted for review.', 'success');
          onRefresh();
          setShowForm(false);
          setSelectedType(null);
          setCustomName('');
          setSelectedDocument(null);
        } else {
          logger.error('Failed to submit credential:', result.error);
          uiFeedback.showToast(result.error.message, 'error');
        }
      },
      async (error) => {
        logger.error('Failed to submit credential:', error);
        uiFeedback.showToast('Failed to submit credential.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedType(null);
    setCustomName('');
    setSelectedDocument(null);
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
    setSelectedType: (value: string | null) => {
      setSelectedType(value);
      setSelectedDocument(null);
    },
    setCustomName,
    handleUpload,
    handleSubmit,
    resetForm,
    setUploaded: (value: boolean) => {
      if (!value) setSelectedDocument(null);
    },
  } satisfies UseCredentialsResult;
}
