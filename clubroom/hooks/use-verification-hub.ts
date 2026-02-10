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
    const result = await verificationService.getStatus(COACH_ID);
    if (result.success) {
      setStatus(result.data);
    } else {
      logger.error('Failed to load verification status:', result.error);
    }
    setLoading(false);
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
