/**
 * Discover Sessions Screen
 *
 * Browse available coaching sessions with search, skill/type filters.
 * All state/logic in useDiscoverSessions hook. Card extracted to component.
 */

import { View, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useDiscoverSessions, SKILL_FILTERS, TYPE_FILTERS } from '@/hooks/use-discover-sessions';
import { Routes } from '@/navigation/routes';
import type { FootballObjective } from '@/constants/types';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

export default function DiscoverSessionsScreen() {
  const { colors: palette } = useTheme();
  const c = useDiscoverSessions();
  const hasFilters = Boolean(c.searchQuery.trim() || c.skillFilter || c.typeFilter);
  const header = (
    <PageHeader
      title="Discover Sessions"
      subtitle="Browse sessions, or open the map to find nearby coaches"
      showBack
      onBackPress={() => router.back()}
      action="Map"
      actionIcon="map-outline"
      onActionPress={() => router.push(Routes.DISCOVER_MAP)}
    />
  );
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {header}
      {content}
    </SafeAreaView>
  );

  if (c.loading) {
    return renderShell(<LoadingState variant="list" />);
  }

  if (c.status === 'error') {
    return renderShell(
      <ErrorState
        message={c.error?.message || 'Failed to load discover sessions.'}
        onRetry={c.retry}
      />,
    );
  }

  if (c.status === 'empty') {
    return renderShell(
      <EmptyState
        icon="search-outline"
        title="No sessions available"
        message="There are no active sessions to discover right now. Pull to refresh or check again later."
        actionLabel="Refresh"
        onPressAction={c.onRefresh}
      />,
    );
  }

  return renderShell(
    <>
      <PendingInvitesSection
        invites={c.pendingInvites}
        onAccept={c.handleAcceptInvite}
        onDecline={c.handleDeclineInvite}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Row
          align="center"
          gap="sm"
          style={[
            styles.searchBar,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="search" size={20} color={palette.muted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search sessions, coaches, locations..."
            placeholderTextColor={palette.muted}
            value={c.searchQuery}
            onChangeText={c.setSearchQuery}

            maxLength={100}
          />
          {c.searchQuery.length > 0 && (
            <Clickable accessibilityLabel="Clear search" onPress={c.clearSearch}>
              <Ionicons name="close-circle" size={20} color={palette.muted} />
            </Clickable>
          )}
        </Row>
      </View>

      {/* Type Filter Pills */}
      <View style={styles.filters}>
        <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
          data={TYPE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item.value || 'all-types'}
          renderItem={({ item }) => (
            <Clickable
              style={[
                styles.filterPill,
                {
                  backgroundColor: c.typeFilter === item.value ? palette.tint : 'transparent',
                  borderColor: c.typeFilter === item.value ? palette.tint : palette.border,
                },
              ]}
              onPress={() => c.setTypeFilter(item.value as typeof c.typeFilter)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: c.typeFilter === item.value ? palette.onPrimary : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Clickable>
          )}
        />
      </View>

      {/* Skill Filter Pills */}
      <View style={styles.filters}>
        <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
          data={SKILL_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item.value || 'all-skills'}
          renderItem={({ item }) => (
            <Clickable
              style={[
                styles.filterPill,
                {
                  backgroundColor: c.skillFilter === item.value ? palette.tint : 'transparent',
                  borderColor: c.skillFilter === item.value ? palette.tint : palette.border,
                },
              ]}
              onPress={() => c.setSkillFilter(item.value as FootballObjective | '')}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: c.skillFilter === item.value ? palette.onPrimary : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Clickable>
          )}
        />
      </View>

      {/* Results */}
      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={c.filteredOfferings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionOfferingCard offering={item} onPress={() => c.handleOfferingPress(item)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={c.refreshing}
            onRefresh={c.onRefresh}
            tintColor={palette.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
              <Ionicons name="search-outline" size={40} color={palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {hasFilters ? 'No matching sessions' : 'No sessions found'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {hasFilters
                ? 'Try adjusting your search or filters'
                : 'Check back later for new sessions'}
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  searchBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, ...Typography.subheading, paddingVertical: Spacing.xxs },
  filters: { paddingBottom: Spacing.xs },
  filterList: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  filterText: { ...Typography.smallSemiBold },
  list: { padding: Spacing.md, paddingTop: Spacing.sm },
  separator: { height: Spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.heading },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
