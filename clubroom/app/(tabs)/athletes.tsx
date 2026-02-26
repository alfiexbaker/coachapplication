/**
 * Athletes Tab — Coach's command center for managing their roster.
 */

import React, { useCallback } from 'react';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';
import { useAthletesScreen } from '@/hooks/use-athletes-screen';
import {
import { AccessibleListCell } from '@/components/ui/list-accessibility';
  AthletesListHeader,
  AthletesSearchEmptyState,
  renderAthleteCard,
} from '@/components/athlete/athletes-screen-header-sections';

export default function AthletesScreen() {
  const {
    colors,
    status,
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

  const keyExtractor = useCallback((item: RosterEntry) => item.id, []);
  const handleInviteAthlete = useCallback(() => {
    router.push(Routes.sessionsCreateIntent({ intent: 'existing', source: 'manual' }));
  }, []);

  const listHeader = useCallback(
    () => (
      <AthletesListHeader
        colors={colors}
        roster={roster}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        filter={filter}
        onFilterChange={setFilter}
      />
    ),
    [colors, roster, searchQuery, setSearchQuery, filter, setFilter],
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Athletes" subtitle="Manage your roster" bordered />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Athletes" subtitle="Manage your roster" bordered />
        <ErrorState message={error?.message || 'Failed to load athletes'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader
          title="Athletes"
          subtitle="Manage your roster"
          bordered
        />
        <EmptyState
          icon="people-outline"
          title="No athletes yet"
          message="Athletes will appear here once they book sessions with you. Invite an athlete to get started."
          actionLabel="Invite Athlete"
          onPressAction={handleInviteAthlete}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
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
        renderItem={({ item }) => renderAthleteCard({ item, upcomingSessions })}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<AthletesSearchEmptyState colors={colors} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
});
