/**
 * Hook for the Admin Promo Codes screen.
 * Manages codes data, filters, toggle active, and usage modal state.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { promoService } from '@/services/promo-service';
import { createLogger } from '@/utils/logger';
import type { PromoCode, PromoCodeUsage, PromoCodeStats } from '@/constants/types';

const logger = createLogger('AdminPromoCodesScreen');

export type FilterType = 'all' | 'active' | 'expired' | 'exhausted' | 'inactive';

export function usePromoCodes() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);
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
      setCodes(codesData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load promo codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleToggleActive = useCallback(async (codeId: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) { await promoService.deactivateCode(codeId); }
      else { await promoService.reactivateCode(codeId); }
      await loadData();
    } catch (error) {
      logger.error('Failed to toggle code status:', error);
    }
  }, [loadData]);

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

  const closeUsageModal = useCallback(() => { setUsageModalVisible(false); }, []);

  const filteredCodes = filter === 'all'
    ? codes
    : codes.filter((code) => promoService.getCodeStatus(code) === filter);

  const selectedCode = codes.find((c) => c.id === selectedCodeId) ?? null;

  return {
    loading, refreshing, stats, filter, filteredCodes, codes,
    usageModalVisible, usageData, usageLoading, selectedCode,
    setFilter, handleRefresh, handleToggleActive, handleViewUsage,
    handleCreateCode, closeUsageModal,
  };
}
