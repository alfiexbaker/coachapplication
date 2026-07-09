import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus } from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useBackgroundCheck');

export const BG_CHECK_STEPS = [
  {
    id: 1,
    title: 'Provide Details',
    description: 'Enter your personal information for the background check',
  },
  {
    id: 2,
    title: 'Consent & ID Verification',
    description: 'Confirm your identity and provide consent for the check',
  },
  { id: 3, title: 'Review & Submit', description: 'The check is processed by our trusted partner' },
  { id: 4, title: 'Receive Results', description: 'Certificate issued upon successful completion' },
];

export interface UseBackgroundCheckResult {
  status: VerificationStatus | null;
  loading: boolean;
  screenStatus: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  isVerified: boolean;
  isPending: boolean;
}

export function useBackgroundCheck() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? null;

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
    isVerified,
    isPending,
  } satisfies UseBackgroundCheckResult;
}
