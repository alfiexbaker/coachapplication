/**
 * Hook: useCredentials
 *
 * Manages credentials screen state: load verification status, submit credentials.
 * Used by app/verification/credentials.tsx
 */

import { useState, useEffect, useCallback } from 'react';

import { verificationService } from '@/services/verification-service';
import type { VerificationStatus } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useCredentials');

export const CREDENTIAL_TYPES = [
  { id: 'fa-level1', label: 'FA Level 1', category: 'Coaching Badge' },
  { id: 'fa-level2', label: 'FA Level 2', category: 'Coaching Badge' },
  { id: 'fa-level3', label: 'FA Level 3 (UEFA B)', category: 'Coaching Badge' },
  { id: 'first-aid', label: 'Emergency First Aid', category: 'First Aid' },
  { id: 'safeguarding', label: 'Safeguarding Certificate', category: 'Child Safety' },
  { id: 'other', label: 'Other Qualification', category: 'Other' },
] as const;

const COACH_ID = 'coach1';

export function useCredentials() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const loadStatus = useCallback(async () => {
    const result = await verificationService.getStatus(COACH_ID);
    if (result.success) {
      setStatus(result.data);
    } else {
      logger.error('Failed to load verification status:', result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleUpload = useCallback(async () => {
    setUploaded(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !uploaded) return;

    const credentialLabel = selectedType === 'other'
      ? customName || 'Other Qualification'
      : CREDENTIAL_TYPES.find((t) => t.id === selectedType)?.label || 'Credential';

    setSubmitting(true);
    try {
      const result = await verificationService.submitCredential(
        COACH_ID,
        `mock://credential-${selectedType}.pdf`,
        credentialLabel,
      );
      if (result.success) {
        await loadStatus();
        setShowForm(false);
        setSelectedType(null);
        setCustomName('');
        setUploaded(false);
      } else {
        logger.error('Failed to submit credential:', result.error);
      }
    } catch (error) {
      logger.error('Failed to submit credential:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, uploaded, customName, loadStatus]);

  const resetForm = useCallback(() => {
    setShowForm(false);
    setSelectedType(null);
    setCustomName('');
    setUploaded(false);
  }, []);

  const credentials = status?.credentials ?? [];
  const verifiedCount = credentials.filter((c) => c.status === 'VERIFIED').length;

  return {
    credentials, verifiedCount, loading, submitting, showForm, selectedType,
    customName, uploaded,
    setShowForm, setSelectedType, setCustomName,
    handleUpload, handleSubmit, resetForm, setUploaded,
  };
}
