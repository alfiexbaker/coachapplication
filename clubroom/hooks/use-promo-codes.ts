/**
 * Hook for the Admin Promo Codes screen.
 * Manages codes data, filters, toggle active, and usage modal state.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { promoService } from '@/services/promo-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { PromoCode, PromoCodeUsage, PromoCodeStats } from '@/constants/types';

const logger = createLogger('AdminPromoCodesScreen');

export type FilterType = 'all' | 'active' | 'expired' | 'exhausted' | 'inactive';

interface PromoCodesData {
  codes: PromoCode[];
  stats: PromoCodeStats;
}

export interface UsePromoCodesResult {
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  stats: PromoCodeStats | null;
  filter: FilterType;
  filteredCodes: PromoCode[];
  codes: PromoCode[];
  usageModalVisible: boolean;
  usageData: PromoCodeUsage[];
  usageLoading: boolean;
  selectedCode: PromoCode | null;
  setFilter: (filter: FilterType) => void;
  onRefresh: () => void;
  retry: () => void;
  handleRefresh: () => void;
  handleToggleActive: (codeId: string, currentlyActive: boolean) => Promise<void>;
  handleViewUsage: (codeId: string) => Promise<void>;
  handleCreateCode: () => void;
  closeUsageModal: () => void;
}

export function usePromoCodes() {
  const router = useRouter();

  const [filter, setFilter] = useState<FilterType>('all');

  // Usage modal state
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [usageData, setUsageData] = useState<PromoCodeUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [codesData, statsData] = await Promise.all([
        promoService.getAllPromoCodes(),
        promoService.getCodeStats(),
      ]);
      return ok<PromoCodesData>({ codes: codesData, stats: statsData });
    } catch (e) {
      logger.error('Failed to load promo codes:', e);
      return err(serviceError('UNKNOWN', 'Failed to load promo codes.', e));
    }
  }, []);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<PromoCodesData>({
    load: loadData,
    isEmpty: (value) => value.codes.length === 0,
    refetchOnFocus: true,
  });

  const codes = data?.codes ?? [];
  const stats = data?.stats ?? null;

  const handleToggleActive = useCallback(
    async (codeId: string, currentlyActive: boolean) => {
      try {
        if (currentlyActive) {
          await promoService.deactivateCode(codeId);
        } else {
          await promoService.reactivateCode(codeId);
        }
        onRefresh();
      } catch (error) {
        logger.error('Failed to toggle code status:', error);
      }
    },
    [onRefresh],
  );

  const handleViewUsage = useCallback(async (codeId: string) => {
    setSelectedCodeId(codeId);
    setUsageModalVisible(true);
    setUsageLoading(true);
    try {
      const usage = await promoService.getCodeUsage(codeId);
      setUsageData(usage);
    } catch (error) {
      logger.error('Failed to load usage:', error);
      setUsageData([]);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const handleCreateCode = useCallback(() => {
    router.push(Routes.ADMIN_PROMO_CODES_CREATE);
  }, [router]);

  const closeUsageModal = useCallback(() => {
    setUsageModalVisible(false);
  }, []);

  const filteredCodes =
    filter === 'all' ? codes : codes.filter((code) => promoService.getCodeStatus(code) === filter);

  const selectedCode = codes.find((c) => c.id === selectedCodeId) ?? null;

  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    stats,
    filter,
    filteredCodes,
    codes,
    usageModalVisible,
    usageData,
    usageLoading,
    selectedCode,
    setFilter,
    onRefresh,
    retry,
    handleRefresh: onRefresh,
    handleToggleActive,
    handleViewUsage,
    handleCreateCode,
    closeUsageModal,
  } satisfies UsePromoCodesResult;
}
