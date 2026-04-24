import { useCallback, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Routes } from '@/navigation/routes';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { EmptyState, ErrorState, SubmitProgressState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';
import { useMessages } from '@/hooks/use-messages';
import { ConversationRow } from '@/components/messaging/conversation-row';
import { MessagesSearchBar } from '@/components/messaging/messages-search-bar';
import { MessagesViewToggle } from '@/components/messaging/messages-view-toggle';
import { GroupThreadsSection } from '@/components/messaging/group-threads-section';
import { MessagesScreenLoadingState } from '@/components/messaging/messaging-loading-states';
import { useScrollToTopOnTabReselect } from '@/hooks/use-scroll-to-top-on-tab-reselect';

export default function MessagesScreen() {
  const { colors: palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabReselect(scrollRef);
  const {
    search,
    setSearch,
    viewMode,
    setViewMode,
    groupFilter,
    setGroupFilter,
    status,
    showLoadingState,
    isPending,
    error,
    retry,
    refreshing,
    onRefresh,
    directThreads,
    groupThreads,
    isCoach,
    handleThreadPress,
  } = useMessages();

  const handleFindCoaches = useCallback(() => {
    router.push(Routes.DISCOVER_MAP);
  }, []);
  const renderState = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScreenHeader title="Messages" subtitle="Your conversations" />
      {content}
    </SafeAreaView>
  );

  if (showLoadingState) {
    return renderState(<MessagesScreenLoadingState />);
  }

  if (status === 'error') {
    return renderState(
      <ErrorState message={error?.message ?? 'Unable to load conversations'} onRetry={retry} />,
    );
  }

  if (status === 'empty') {
    return renderState(
      <>
        {isPending ? (
          <SubmitProgressState label="Refreshing conversations" style={styles.pendingState} />
        ) : null}
        <EmptyState
          icon="chatbubbles"
          title="No messages yet"
          message="Start a conversation with a coach or respond to pending requests."
          actionLabel="Find coaches"
          onPressAction={handleFindCoaches}
        />
      </>,
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScreenHeader title="Messages" subtitle="Your conversations" />
      <MessagesSearchBar value={search} onChangeText={setSearch} />
      <MessagesViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      {isPending ? (
        <SubmitProgressState label="Refreshing conversations" style={styles.pendingState} />
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {viewMode === 'groups' ? (
          <GroupThreadsSection
            threads={groupThreads}
            groupFilter={groupFilter}
            onGroupFilterChange={setGroupFilter}
            isCoach={isCoach}
            onThreadPress={handleThreadPress}
          />
        ) : directThreads.length === 0 ? (
          <EmptyState
            icon="chatbubbles"
            title="No messages yet"
            message="Start a conversation with a coach or respond to pending requests."
            actionLabel="Find coaches"
            onPressAction={handleFindCoaches}
          />
        ) : (
          directThreads.map((thread, index) => (
            <ConversationRow
              key={thread.id}
              thread={thread}
              index={index}
              onPress={() => handleThreadPress(thread)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  pendingState: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
});
