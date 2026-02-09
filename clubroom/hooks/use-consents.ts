/**
 * Hook for the Consent Dashboard screen.
 * Manages consent data loading, filtering, search, and stat selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { consentService, type ConsentFilters } from '@/services/consent-service';
import { createLogger } from '@/utils/logger';
import type { AthleteConsent, ConsentSummary, ConsentType } from '@/constants/types';

const logger = createLogger('ConsentsScreen');

export function useConsents() {
  const { currentUser } = useAuth();

  const [consents, setConsents] = useState<AthleteConsent[]>([]);
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ConsentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<ConsentType | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [consentsData, summaryData] = await Promise.all([
        consentService.getRosterConsents(coachId, { ...filters, search: searchQuery }),
        consentService.getConsentSummary(coachId),
      ]);
      setConsents(consentsData);
      setSummary(summaryData);
    } catch (error) {
      logger.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, filters, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleFilterChange = useCallback((newFilters: ConsentFilters) => {
    setFilters(newFilters);
    setSelectedType(newFilters.type || null);
  }, []);

  const handleStatCardPress = useCallback((type: ConsentType) => {
    setSelectedType((prev) => {
      const newType = prev === type ? null : type;
      setFilters((f) => ({ ...f, type: newType || undefined }));
      return newType;
    });
  }, []);

  const toggleFilters = useCallback(() => { setShowFilters((v) => !v); }, []);
  const clearSearch = useCallback(() => { setSearchQuery(''); }, []);
  const clearFilters = useCallback(() => { setFilters({}); setSelectedType(null); }, []);

  const activeFiltersCount = (filters.type ? 1 : 0) + (filters.status && filters.status !== 'all' ? 1 : 0);
  const consentTypes = consentService.getConsentTypes();

  return {
    consents, summary, loading, refreshing, searchQuery, filters,
    showFilters, selectedType, activeFiltersCount, consentTypes,
    setSearchQuery, clearSearch, onRefresh, handleFilterChange,
    handleStatCardPress, toggleFilters, clearFilters,
  };
}
