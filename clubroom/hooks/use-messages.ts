/**
 * useMessages — State management hook for the Messages tab screen.
 *
 * Encapsulates thread loading, search filtering, view mode toggling,
 * and group filter logic. Used by the Messages screen as a thin
 * composition layer.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { ChatThreadSummary } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { messagingService } from '@/services/messaging-service';

export type ViewMode = 'direct' | 'groups';
export type GroupFilter = 'all' | 'club' | 'squad' | 'class';

export interface UseMessagesResult {
  search: string;
  setSearch: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  groupFilter: GroupFilter;
  setGroupFilter: (filter: GroupFilter) => void;
  refreshing: boolean;
  handleRefresh: () => void;
  directThreads: ChatThreadSummary[];
  groupThreads: ChatThreadSummary[];
  isCoach: boolean;
  handleThreadPress: (threadId: string) => void;
}

export function useMessages(): UseMessagesResult {
  const params = useLocalSearchParams<{ coachId?: string }>();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('direct');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    messagingService.listThreads().then((result) => {
      if (result.success) {
        setThreads(result.data);
      }
    });
  }, []);

  // Auto-open thread if coachId param is provided.
  useEffect(() => {
    if (!params.coachId || threads.length === 0) {
      return;
    }
    router.push(Routes.chat(threads[0].id));
  }, [params.coachId, threads]);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((thread) => {
      const haystack = [thread.coachName, thread.title, thread.subtitle, thread.serviceName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, threads]);

  const directThreads = useMemo(
    () => filteredThreads.filter((thread) => thread.kind !== 'group'),
    [filteredThreads],
  );

  const groupThreads = useMemo(
    () =>
      filteredThreads.filter(
        (thread) =>
          thread.kind === 'group' && (groupFilter === 'all' || thread.groupType === groupFilter),
      ),
    [filteredThreads, groupFilter],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleThreadPress = useCallback((threadId: string) => {
    router.push(Routes.chat(threadId));
  }, []);

  return {
    search,
    setSearch,
    viewMode,
    setViewMode,
    groupFilter,
    setGroupFilter,
    refreshing,
    handleRefresh,
    directThreads,
    groupThreads,
    isCoach,
    handleThreadPress,
  };
}
