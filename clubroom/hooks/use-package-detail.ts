/**
 * Hook for the Package Detail screen.
 * Manages package data loading and purchase handlers.
 */

import { useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { packageService } from '@/services/package-service';
import { createLogger } from '@/utils/logger';
import type { SessionPackage } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('PackageDetailScreen');

interface PackageDetailData {
  pkg: SessionPackage | null;
}

export function usePackageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const loadPackage = useCallback(async () => {
    if (!id) {
      return ok<PackageDetailData>({ pkg: null });
    }

    try {
      const result = await packageService.getPackageById(id);
      if (!result.success) {
        logger.error('Failed to load package', result.error);
        return err(result.error);
      }
      return ok<PackageDetailData>({ pkg: result.data });
    } catch (loadError) {
      logger.error('Failed to load package', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load package.', loadError));
    }
  }, [id]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<PackageDetailData>({
    load: loadPackage,
    deps: [id],
    isEmpty: (value) => value.pkg === null,
    refetchOnFocus: true,
  });

  const pkg = data?.pkg ?? null;

  const handlePurchaseSuccess = useCallback(() => {
    showToast('Package purchased successfully!', 'success');
    router.back();
  }, [showToast]);

  const handlePurchaseError = useCallback((error: string) => {
    showToast(error, 'error');
  }, [showToast]);

  const isCoach = currentUser?.role === 'COACH';
  const isOwnPackage = pkg?.coachId === currentUser?.id;
  const pricePerSession = pkg ? (pkg.pricePerSession ?? Math.round((pkg.price / pkg.sessionCount) * 100) / 100) : 0;

  return {
    pkg,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    isOwnPackage,
    pricePerSession,
    handlePurchaseSuccess, handlePurchaseError,
  } satisfies {
    pkg: SessionPackage | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    isCoach: boolean;
    isOwnPackage: boolean;
    pricePerSession: number;
    handlePurchaseSuccess: () => void;
    handlePurchaseError: (error: string) => void;
  };
}
