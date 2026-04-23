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
import { useScrollToTopOnTabReselect } from '@/hooks/use-scroll-to-top-on-tab-reselect';
import { Skeleton, SkeletonCircle, SkeletonCluster, SkeletonPill, SkeletonText } from '@/components/ui/skeleton';

function MessagesScreenSkeleton() {
  return (
    <SkeletonCluster gap={16} style={styles.loadingShell} accessibilityLabel="Loading conversations">
      <View style={styles.loadingSearch}>
        <Skeleton height={48} radius={24} accessibilityLabel="Loading message search" />
      </View>
      <View style={styles.loadingToggleRow}>
        <SkeletonPill width={82} accessibilityLabel="Loading direct tab" />
        <SkeletonPill width={90} accessibilityLabel="Loading groups tab" />
      </View>
      <View style={styles.loadingList}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.loadingRow}>
            <SkeletonCircle size={48} accessibilityLabel={`Loading conversation avatar ${index + 1}`} />
            <View style={styles.loadingRowText}>
              <SkeletonText
                lines={3}
                widths={['52%', '34%', '78%']}
                accessibilityLabel={`Loading conversation row ${index + 1}`}
              />
            </View>
            <Skeleton width={36} height={12} accessibilityLabel={`Loading conversation date ${index + 1}`} />
          </View>
        ))}
      </View>
    </SkeletonCluster>
  );
}

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
    return renderState(<MessagesScreenSkeleton />);
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
              onPress={() => handleThreadPress(thread.id)}
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
  loadingShell: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  loadingSearch: {
    marginBottom: 4,
  },
  loadingToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingList: {
    gap: 20,
    paddingTop: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loadingRowText: {
    flex: 1,
  },
  pendingState: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
});
