import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';
import { useMessages } from '@/hooks/use-messages';
import { ConversationRow } from '@/components/messaging/conversation-row';
import { MessagesSearchBar } from '@/components/messaging/messages-search-bar';
import { MessagesViewToggle } from '@/components/messaging/messages-view-toggle';
import { GroupThreadsSection } from '@/components/messaging/group-threads-section';

export default function MessagesScreen() {
  const { colors: palette } = useTheme();
  const {
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
  } = useMessages();

  const handleFindCoaches = useCallback(() => {
    router.push(Routes.MORE);
  }, []);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Messages" subtitle="Your conversations" />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Messages" subtitle="Your conversations" />
        <ErrorState message={error?.message ?? 'Unable to load conversations'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Messages" subtitle="Your conversations" />
        <EmptyState
          icon="chatbubbles"
          title="No messages yet"
          message="Start a conversation with a coach or respond to pending requests."
          actionLabel="Find coaches"
          onPressAction={handleFindCoaches}
        />
      </SafeAreaView>
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

      <ScrollView
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
});
