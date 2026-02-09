import { useCallback, useEffect, useState } from 'react';

import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus, VerificationItem } from '@/constants/types';

const logger = createLogger('useVerificationHub');
const COACH_ID = 'coach1';

export function useVerificationHub() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

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

  const progress = status ? verificationService.getProgressPercentage(status) : 0;
  const hasCredentials = (status?.credentials.length ?? 0) > 0;

  const credentialStatus: VerificationItem = hasCredentials
    ? status!.credentials.some(c => c.status === 'VERIFIED')
      ? { status: 'VERIFIED' }
      : status!.credentials.some(c => c.status === 'PENDING')
        ? { status: 'PENDING' }
        : { status: 'NOT_STARTED' }
    : { status: 'NOT_STARTED' };

  return { status, loading, loadStatus, progress, hasCredentials, credentialStatus };
}
