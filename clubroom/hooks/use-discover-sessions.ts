/**
 * Hook for the Discover Sessions screen.
 * Manages offerings data, search, filters, and modal state.
 */

import { useState, useMemo, useCallback } from 'react';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import type { SessionOffering, FootballObjective } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('DiscoverSessions');

export const SKILL_FILTERS: { value: FootballObjective | ''; label: string }[] = [
  { value: '', label: 'All Skills' },
  { value: 'Dribbling', label: 'Dribbling' },
  { value: 'Passing', label: 'Passing' },
  { value: 'Defending', label: 'Defending' },
  { value: 'Finishing', label: 'Finishing' },
  { value: 'Goalkeeping', label: 'Goalkeeping' },
  { value: 'Conditioning', label: 'Conditioning' },
];

export const TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: '1on1', label: '1:1' },
  { value: 'group', label: 'Group' },
];

interface DiscoverSessionsData {
  offerings: SessionOffering[];
}

export interface UseDiscoverSessionsResult {
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  searchQuery: string;
  skillFilter: FootballObjective | '';
  typeFilter: '1on1' | 'group' | '';
  filteredOfferings: SessionOffering[];
  selectedOffering: SessionOffering | null;
  showDetailModal: boolean;
  setSearchQuery: (value: string) => void;
  setSkillFilter: (value: FootballObjective | '') => void;
  setTypeFilter: (value: '1on1' | 'group' | '') => void;
  clearSearch: () => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  handleModalClose: () => void;
  handleModalUpdate: () => void;
}

export function useDiscoverSessions() {
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<FootballObjective | ''>('');
  const [typeFilter, setTypeFilter] = useState<'1on1' | 'group' | ''>('');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadOfferings = useCallback(async () => {
    try {
      const allOfferings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      const available = allOfferings.filter(
        (offering) => offering.status === 'active' && offering.coachId !== currentUser?.id
      );
      logger.debug('Loaded offerings', { count: available.length });
      return ok<DiscoverSessionsData>({ offerings: available });
    } catch (loadError) {
      logger.error('Failed to load offerings', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load discover sessions. Pull down to refresh.', loadError));
    }
  }, [currentUser?.id]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<DiscoverSessionsData>({
    load: loadOfferings,
    deps: [currentUser?.id],
    isEmpty: (value) => value.offerings.length === 0,
    refetchOnFocus: true,
  });

  const offerings = data?.offerings ?? [];
  const loading = status === 'loading';

  const filteredOfferings = useMemo(() => {
    let filtered = offerings;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(query) ||
        getSessionOfferingCoachName(o).toLowerCase().includes(query) ||
        o.location.toLowerCase().includes(query) ||
        (o.description?.toLowerCase().includes(query))
      );
    }
    if (skillFilter) filtered = filtered.filter(o => o.footballSkill === skillFilter);
    if (typeFilter) filtered = filtered.filter(o => o.sessionType === typeFilter);
    return filtered.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [offerings, searchQuery, skillFilter, typeFilter]);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, []);

  const handleModalUpdate = useCallback(() => {
    onRefresh();
  }, [onRefresh]);
  const clearSearch = useCallback(() => { setSearchQuery(''); }, []);

  return {
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    searchQuery,
    skillFilter,
    typeFilter,
    filteredOfferings,
    selectedOffering,
    showDetailModal,
    setSearchQuery,
    setSkillFilter,
    setTypeFilter,
    clearSearch,
    handleOfferingPress,
    handleModalClose,
    handleModalUpdate,
  } satisfies UseDiscoverSessionsResult;
}

export function formatNextSession(offering: SessionOffering): string {
  if (offering.isRecurring && offering.dayOfWeek !== undefined) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
  }
  const date = new Date(offering.scheduledAt);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
