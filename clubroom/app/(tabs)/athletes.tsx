/**
 * Athletes Tab — Coach's command center for managing their roster.
 *
 * Features: needs attention section, stats bar, search + filters, athlete list.
 * Uses useScreen() for proper loading/error/empty states.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { AthleteCard } from '@/components/roster/athlete-card';
import { AthletesStatsBar } from '@/components/athlete/athletes-stats-bar';
import { NeedsAttentionSection } from '@/components/athlete/needs-attention-section';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import { bookingService } from '@/services/booking-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, storageError, type Result, type ServiceError } from '@/types/result';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | 'active' | 'needs_attention';

interface AthletesData {
  roster: RosterEntry[];
  upcomingSessions: Record<string, Booking>;
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function AthletesScreen() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach_1';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // --- useScreen for data loading ---
  const { data, status, error, refreshing, onRefresh, retry, colors } =
    useScreen<AthletesData>({
      load: async (): Promise<Result<AthletesData, ServiceError>> => {
        try {
          const [rosterData, bookingsData] = await Promise.all([
            rosterService.getRoster(coachId),
            bookingService.getUpcomingBookings(coachId),
          ]);
          const sessionsMap: Record<string, Booking> = {};
          bookingsData.forEach((booking: Booking) => {
            if (booking.athleteId && !sessionsMap[booking.athleteId]) {
              sessionsMap[booking.athleteId] = booking;
            }
          });
          return ok({ roster: rosterData, upcomingSessions: sessionsMap });
        } catch (e) {
          return err(storageError('Failed to load athletes'));
        }
      },
      deps: [coachId],
      events: [
        ServiceEvents.BOOKING_CREATED,
        ServiceEvents.BOOKING_CANCELLED,
        ServiceEvents.CONCERN_RAISED,
      ],
      isEmpty: (d) => d.roster.length === 0,
    });

  // --- Derived state ---
  const roster = data?.roster || [];
  const upcomingSessions = data?.upcomingSessions || {};

  const needsAttentionCount = useMemo(
    () =>
      roster.filter((a) => {
        if (a.status !== 'ACTIVE') return false;
        if (!a.lastSessionDate) return true;
        return (
          Math.floor(
            (Date.now() - new Date(a.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
          ) > 14
        );
      }).length,
    [roster]
  );

  const filteredAthletes = useMemo(() => {
    let filtered = roster;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.athleteName.toLowerCase().includes(q) ||
          a.parentName.toLowerCase().includes(q)
      );
    }

    if (filter === 'active') {
      filtered = filtered.filter((a) => a.status === 'ACTIVE');
    } else if (filter === 'needs_attention') {
      filtered = filtered.filter((a) => {
        if (a.status !== 'ACTIVE') return false;
        if (!a.lastSessionDate) return true;
        return (
          Math.floor(
            (Date.now() - new Date(a.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
          ) > 14
        );
      });
    }

    return [...filtered].sort((a, b) => {
      const aUp = !!upcomingSessions[a.athleteId];
      const bUp = !!upcomingSessions[b.athleteId];
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (!a.lastSessionDate) return 1;
      if (!b.lastSessionDate) return -1;
      return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
    });
  }, [roster, searchQuery, filter, upcomingSessions]);

  // --- Renderers ---
  const renderAthleteCard = useCallback(
    ({ item }: { item: RosterEntry }) => (
      <AthleteCard athlete={item} upcomingSession={upcomingSessions[item.athleteId]} />
    ),
    [upcomingSessions]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContent}>
        {/* Stats Bar */}
        <AthletesStatsBar roster={roster} upcomingSessions={upcomingSessions} />

        {/* Needs Attention */}
        <NeedsAttentionSection roster={roster} />

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search athletes..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search athletes"
          />
          {searchQuery.length > 0 && (
            <Clickable accessibilityLabel="Clear search" onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Clickable>
          )}
        </View>

        {/* Filters */}
        <Row gap="sm" style={styles.filterRow}>
          {[
            { id: 'all' as FilterType, label: 'All', count: roster.length },
            { id: 'active' as FilterType, label: 'Active', count: roster.filter((a) => a.status === 'ACTIVE').length },
            { id: 'needs_attention' as FilterType, label: 'Needs Attention', count: needsAttentionCount },
          ].map((f) => (
            <Clickable
              key={f.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.id ? colors.tint : colors.card,
                  borderColor: filter === f.id ? colors.tint : colors.border,
                },
              ]}
              onPress={() => setFilter(f.id)}
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filter === f.id ? colors.onPrimary : colors.text },
                ]}
              >
                {f.label}
              </ThemedText>
              {f.count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    {
                      backgroundColor:
                        filter === f.id
                          ? withAlpha(colors.onPrimary, 0.3)
                          : withAlpha(colors.muted, 0.19),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterCountText,
                      { color: filter === f.id ? colors.onPrimary : colors.muted },
                    ]}
                  >
                    {f.count}
                  </ThemedText>
                </View>
              )}
            </Clickable>
          ))}
        </Row>
      </View>
    ),
    [roster, upcomingSessions, searchQuery, filter, needsAttentionCount, colors]
  );

  const keyExtractor = useCallback((item: RosterEntry) => item.id, []);

  // --- 4 visual states ---
  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title="Athletes" subtitle="Manage your roster" bordered />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title="Athletes" subtitle="Manage your roster" bordered />
        <ErrorState message={error?.message || 'Failed to load athletes'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title="Athletes"
          subtitle="Manage your roster"
          action={{
            icon: 'add',
            label: 'Invite',
            onPress: () => router.push(Routes.SESSION_INVITES_CREATE),
          }}
          bordered
        />
        <EmptyState
          icon="people-outline"
          title="No athletes yet"
          message="Athletes will appear here once they book sessions with you. Invite an athlete to get started."
          actionLabel="Invite Athlete"
          onPressAction={() => router.push(Routes.SESSION_INVITES_CREATE)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Athletes"
        subtitle={`${roster.length} athletes`}
        action={{
          icon: 'add',
          label: 'Invite',
          onPress: () => router.push(Routes.SESSION_INVITES_CREATE),
        }}
        bordered
      />

      <FlatList
        data={filteredAthletes}
        renderItem={renderAthleteCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={40} color={colors.muted} />
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
              No athletes found
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.muted }]}>
              Try a different search or filter
            </ThemedText>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...Typography.subheading,
    paddingVertical: Spacing.xxs,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 36,
  },
  filterText: {
    ...Typography.smallSemiBold,
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
  },
  filterCountText: {
    ...Typography.caption,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.heading,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
