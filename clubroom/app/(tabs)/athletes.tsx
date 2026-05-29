/**
 * Athletes Tab — Coach's command center for managing their roster.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';
import { useAthletesScreen } from '@/hooks/use-athletes-screen';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import {
  AthletesListHeader,
  AthletesSearchEmptyState,
  AthleteCardItem,
} from '@/components/athlete/athletes-screen-header-sections';

export default function AthletesScreen() {
  const {
    colors,
    status,
    showLoadingState,
    error,
    refreshing,
    onRefresh,
    retry,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    roster,
    upcomingSessions,
    filteredAthletes,
  } = useAthletesScreen();

  const keyExtractor = (item: RosterEntry) => item.id;
  const handleInviteAthlete = () => {
    router.push(Routes.sessionsCreateIntent({ intent: 'existing', source: 'manual' }));
  };
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderState = (content: ReactNode) =>
    renderShell(
      <>
        <ScreenHeader title="Athletes" subtitle="Manage your roster" bordered />
        {content}
      </>,
    );

  const listHeader = () => (
    <>
      {refreshing ? (
        <SubmitProgressState label="Refreshing athletes" style={styles.pendingState} />
      ) : null}
      <AthletesListHeader
        colors={colors}
        roster={roster}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        filter={filter}
        onFilterChange={setFilter}
      />
    </>
  );
  const renderAthleteItem = ({ item }: { item: RosterEntry }) =>
    <AthleteCardItem item={item} upcomingSessions={upcomingSessions} />;

  if (showLoadingState) {
    return renderState(<LoadingState variant="list" />);
  }

  if (status === 'error') {
    return renderState(
      <ErrorState message={error?.message || 'Failed to load athletes'} onRetry={retry} />,
    );
  }

  if (status === 'empty') {
    return renderState(
      <EmptyState
        icon="people-outline"
        title="No athletes yet"
        message="Athletes will appear here once they book sessions with you. Invite an athlete to get started."
        actionLabel="Invite Athlete"
        onPressAction={handleInviteAthlete}
      />,
    );
  }

  return renderShell(
    <>
      <ScreenHeader
        title="Athletes"
        subtitle={`${roster.length} athletes`}
        action={{
          icon: 'add',
          label: 'Invite',
          onPress: handleInviteAthlete,
        }}
        bordered
      />

      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={filteredAthletes}
        renderItem={renderAthleteItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<AthletesSearchEmptyState colors={colors} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  pendingState: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});
