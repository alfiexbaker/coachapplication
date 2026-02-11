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
import { ScreenStatus, useScreen } from '@/hooks/use-screen';
import { ServiceEvents } from '@/services/event-bus';
import { messagingService } from '@/services/messaging-service';
import type { ServiceError } from '@/types/result';

export type ViewMode = 'direct' | 'groups';
export type GroupFilter = 'all' | 'club' | 'squad' | 'class';

export interface UseMessagesResult {
  search: string;
  setSearch: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  groupFilter: GroupFilter;
  setGroupFilter: (filter: GroupFilter) => void;
  status: ScreenStatus;
  error: ServiceError | null;
  retry: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  directThreads: ChatThreadSummary[];
  groupThreads: ChatThreadSummary[];
  isCoach: boolean;
  handleThreadPress: (threadId: string) => void;
}

export function useMessages(): UseMessagesResult {
  const params = useLocalSearchParams<{ coachId?: string }>();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('direct');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const {
    data: threads,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ChatThreadSummary[]>({
    load: () => messagingService.listThreads(),
    events: [
      ServiceEvents.MESSAGE_SENT,
      ServiceEvents.MESSAGE_DELETED,
      ServiceEvents.MESSAGE_EDITED,
    ],
    refetchOnFocus: true,
  });
  const threadList = threads ?? [];

  // Auto-open thread if coachId param is provided.
  useEffect(() => {
    if (!params.coachId || threadList.length === 0) {
      return;
    }
    router.push(Routes.chat(threadList[0].id));
  }, [params.coachId, threadList]);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threadList;
    return threadList.filter((thread) => {
      const haystack = [thread.title, thread.subtitle, thread.serviceName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, threadList]);

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
    status,
    error,
    retry,
    refreshing,
    onRefresh,
    directThreads,
    groupThreads,
    isCoach,
    handleThreadPress,
  };
}
