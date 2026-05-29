/**
 * Group Sessions Screen
 *
 * Browse and filter group training sessions: camps, clinics,
 * open sessions, and trials. Coach can create new sessions.
 */

import { View, StyleSheet, FlatList, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { EmptyState } from '@/components/ui/empty-state';
import { GroupSessionCard } from '@/components/group/group-session-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useGroupSessions, SESSION_FILTERS, type FilterType } from '@/hooks/use-group-sessions';
import type { GroupSession } from '@/constants/types';
import type { SessionBadgeData } from '@/types/session-child-status';

export default function GroupSessionsScreen() {
  const { colors } = useTheme();
  const {
    sessions,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    filter,
    setFilter,
    isCoach,
    badgeMap,
    isSingleChild,
  } = useGroupSessions();
  const filterItems = getSessionFilterItems(filter, colors, setFilter);
  const sessionItems = getGroupSessionItems(sessions, badgeMap, isSingleChild);
  const header = (
    <Row gap="md" align="center" style={styles.header}>
      <Clickable onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <Column flex>
        <ThemedText type="title">Group Sessions</ThemedText>
        <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
          Camps, clinics & open training
        </ThemedText>
      </Column>
      {isCoach && (
        <Clickable
          accessibilityLabel="Create group session"
          onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
          style={[styles.createButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </Clickable>
      )}
    </Row>
  );
  const filters = (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={filterItems}
      keyExtractor={keySessionFilterItem}
      renderItem={renderSessionFilterItem}
      contentContainerStyle={styles.filtersContainer}
      style={styles.filtersScroll}
    />
  );
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {header}
      {filters}
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="list" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message || 'Failed to load group sessions.'} onRetry={retry} />,
    );
  }

  return renderShell(
    <FlatList
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      data={sessionItems}
      keyExtractor={keyGroupSessionItem}
      renderItem={renderGroupSessionItem}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No sessions found"
          message={
            filter !== 'ALL'
              ? `No ${SESSION_FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} available`
              : 'Check back later for upcoming group sessions'
          }
        />
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />,
  );
}

interface SessionFilterItem {
  key: FilterType;
  label: string;
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function getSessionFilterItems(
  selectedFilter: FilterType,
  colors: ThemeColors,
  onSelectFilter: (filter: FilterType) => void,
): SessionFilterItem[] {
  return SESSION_FILTERS.map((filter) => ({
    key: filter.key,
    label: filter.label,
    isActive: selectedFilter === filter.key,
    colors,
    onPress: () => onSelectFilter(filter.key),
  }));
}

function keySessionFilterItem(item: SessionFilterItem): string {
  return item.key;
}

function renderSessionFilterItem({ item }: ListRenderItemInfo<SessionFilterItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.filterChip,
        { backgroundColor: item.isActive ? item.colors.tint : item.colors.surface },
      ]}
    >
      <ThemedText
        style={[
          Typography.smallSemiBold,
          { color: item.isActive ? item.colors.onPrimary : item.colors.text },
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

interface GroupSessionItem {
  key: string;
  session: GroupSession;
  index: number;
  childBadge: SessionBadgeData | null;
  isSingleChild: boolean;
  onPress: () => void;
}

function getGroupSessionItems(
  sessions: GroupSession[],
  badgeMap: Map<string, SessionBadgeData>,
  isSingleChild: boolean,
): GroupSessionItem[] {
  return sessions.map((session, index) => ({
    key: session.id,
    session,
    index,
    childBadge: badgeMap.get(session.id) ?? null,
    isSingleChild,
    onPress: () => router.push(Routes.groupSession(session.id)),
  }));
}

function keyGroupSessionItem(item: GroupSessionItem): string {
  return item.key;
}

function renderGroupSessionItem({ item }: ListRenderItemInfo<GroupSessionItem>) {
  return (
    <GroupSessionCard
      session={item.session}
      index={item.index}
      onPress={item.onPress}
      childBadge={item.childBadge}
      isSingleChild={item.isSingleChild}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: { flexGrow: 0 },
  filtersContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
});
