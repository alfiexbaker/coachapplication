/**
 * Hook for the Package Detail screen.
 * Manages package data loading and purchase handlers.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { packageService } from '@/services/package-service';
import { createLogger } from '@/utils/logger';
import type { SessionPackage } from '@/constants/types';

const logger = createLogger('PackageDetailScreen');

export function usePackageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [pkg, setPkg] = useState<SessionPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadPackage() {
        if (!id) return;
        setLoading(true);
        try {
          const result = await packageService.getPackageById(id);
          if (!result.success) {
            logger.error('Failed to load package', result.error);
            showToast(result.error.message, 'error');
            setPkg(null);
            return;
          }
          setPkg(result.data);
        } catch (error) {
          logger.error('Failed to load package:', error);
          showToast('Failed to load package', 'error');
        } finally {
          setLoading(false);
        }
      }
      loadPackage();
    }, [id, showToast])
  );

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
    pkg, loading, isCoach, isOwnPackage, pricePerSession,
    handlePurchaseSuccess, handlePurchaseError,
  };
}
