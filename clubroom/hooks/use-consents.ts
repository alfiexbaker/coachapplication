/**
 * Hook for the Consent Dashboard screen.
 * Manages consent data loading, filtering, search, and stat selection.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { consentService, type ConsentFilters } from '@/services/consent-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { AthleteConsent, ConsentSummary, ConsentType } from '@/constants/types';

const logger = createLogger('ConsentsScreen');

interface ConsentsLoadData {
  consents: AthleteConsent[];
  summary: ConsentSummary | null;
}

export function useConsents() {
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ConsentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<ConsentType | null>(null);

  const coachId = currentUser?.id ?? null;

  const loadData = async () => {
    if (!coachId || currentUser?.role !== 'COACH') {
      return err(serviceError('UNAUTHORIZED', 'Sign in as a coach to view roster consents.'));
    }

    try {
      const [consentsResult, summaryResult] = await Promise.all([
        consentService.getRosterConsents(coachId, { ...filters, search: searchQuery }),
        consentService.getConsentSummary(coachId),
      ]);

      if (!consentsResult.success) {
        logger.error('Failed to load roster consents', consentsResult.error);
        return err(consentsResult.error);
      }

      if (!summaryResult.success) {
        logger.error('Failed to load consent summary', summaryResult.error);
        return err(summaryResult.error);
      }

      return ok<ConsentsLoadData>({
        consents: consentsResult.data,
        summary: summaryResult.data,
      });
    } catch (error) {
      logger.error('Failed to load consents:', error);
      return err(serviceError('UNKNOWN', 'Failed to load consent dashboard.', error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ConsentsLoadData>({
    load: loadData,
    deps: [coachId, currentUser?.role, filters, searchQuery],
    isEmpty: (value) => value.consents.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: `consents:${coachId ?? 'missing'}:${searchQuery}:${filters.type ?? 'all'}:${filters.status ?? 'all'}`,
  });

  const consents = data?.consents ?? [];
  const summary = data?.summary ?? null;

  const handleFilterChange = (newFilters: ConsentFilters) => {
    setFilters(newFilters);
    setSelectedType(newFilters.type || null);
  };

  const handleStatCardPress = (type: ConsentType) => {
    const newType = selectedType === type ? null : type;
    setSelectedType(newType);
    setFilters((currentFilters) => ({
      ...currentFilters,
      type: newType || undefined,
    }));
  };

  const toggleFilters = () => {
    setShowFilters((v) => !v);
  };
  const clearSearch = () => {
    setSearchQuery('');
  };
  const clearFilters = () => {
    setFilters({});
    setSelectedType(null);
  };

  const activeFiltersCount =
    (filters.type ? 1 : 0) + (filters.status && filters.status !== 'all' ? 1 : 0);
  const consentTypes = consentService.getConsentTypes();

  return {
    consents,
    summary,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    searchQuery,
    filters,
    showFilters,
    selectedType,
    activeFiltersCount,
    consentTypes,
    setSearchQuery,
    clearSearch,
    onRefresh,
    handleFilterChange,
    handleStatCardPress,
    toggleFilters,
    clearFilters,
    retry,
  };
}
