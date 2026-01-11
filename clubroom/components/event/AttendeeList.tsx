import { useState, useMemo } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { EventRSVP, EventAttendance, EventAttendanceStats, RSVPStatus } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

import { AttendeeCard } from './AttendeeCard';

type FilterType = 'ALL' | RSVPStatus | 'CHECKED_IN' | 'NOT_CHECKED_IN';

interface AttendeeListProps {
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  stats?: EventAttendanceStats;
  onAttendeePress?: (userId: string) => void;
  showFilters?: boolean;
  showStats?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function AttendeeList({
  rsvps,
  attendance,
  stats,
  onAttendeePress,
  showFilters = true,
  showStats = true,
  loading = false,
  emptyMessage = 'No attendees yet',
}: AttendeeListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [filter, setFilter] = useState<FilterType>('ALL');

  // Create a map of attendance by userId for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, EventAttendance>();
    attendance.forEach((a) => map.set(a.userId, a));
    return map;
  }, [attendance]);

  // Filter and combine data
  const filteredData = useMemo(() => {
    let filtered = rsvps;

    switch (filter) {
      case 'GOING':
        filtered = rsvps.filter((r) => r.status === 'GOING');
        break;
      case 'MAYBE':
        filtered = rsvps.filter((r) => r.status === 'MAYBE');
        break;
      case 'NOT_GOING':
        filtered = rsvps.filter((r) => r.status === 'NOT_GOING');
        break;
      case 'CHECKED_IN':
        filtered = rsvps.filter((r) => attendanceMap.has(r.userId));
        break;
      case 'NOT_CHECKED_IN':
        filtered = rsvps.filter((r) => r.status === 'GOING' && !attendanceMap.has(r.userId));
        break;
    }

    // Sort by status (GOING first), then by response time
    return filtered.sort((a, b) => {
      const statusOrder = { GOING: 0, MAYBE: 1, NOT_GOING: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime();
    });
  }, [rsvps, filter, attendanceMap]);

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: rsvps.length },
    { key: 'GOING', label: 'Going', count: rsvps.filter((r) => r.status === 'GOING').length },
    { key: 'MAYBE', label: 'Maybe', count: rsvps.filter((r) => r.status === 'MAYBE').length },
    { key: 'CHECKED_IN', label: 'Checked In', count: attendance.length },
  ];

  const renderStatsCard = () => {
    if (!stats || !showStats) return null;

    const { rsvpCounts, checkedInCount, attendanceRate, capacity } = stats;
    const totalGoing = rsvpCounts.going + stats.expectedGuests;

    return (
      <View style={[styles.statsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.statsRow}>
          {/* Going */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            </View>
            <ThemedText style={styles.statValue}>{rsvpCounts.going}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Going</ThemedText>
          </View>

          {/* Maybe */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.warning}15` }]}>
              <Ionicons name="help-circle" size={20} color={palette.warning} />
            </View>
            <ThemedText style={styles.statValue}>{rsvpCounts.maybe}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Maybe</ThemedText>
          </View>

          {/* Checked In */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="log-in" size={20} color={palette.tint} />
            </View>
            <ThemedText style={styles.statValue}>{checkedInCount}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Checked In</ThemedText>
          </View>

          {/* Attendance Rate */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.accent}15` }]}>
              <Ionicons name="analytics" size={20} color={palette.accent} />
            </View>
            <ThemedText style={styles.statValue}>{attendanceRate}%</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Rate</ThemedText>
          </View>
        </View>

        {/* Capacity bar */}
        {capacity && (
          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <ThemedText style={[styles.capacityLabel, { color: palette.muted }]}>
                Capacity
              </ThemedText>
              <ThemedText style={[styles.capacityValue, { color: palette.text }]}>
                {totalGoing} / {capacity}
              </ThemedText>
            </View>
            <View style={[styles.capacityBar, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.capacityFill,
                  {
                    backgroundColor: totalGoing >= capacity ? palette.error : palette.success,
                    width: `${Math.min(100, (totalGoing / capacity) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isActive = filter === item.key;
            return (
              <Clickable
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? palette.tint : 'transparent',
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {item.label}
                </ThemedText>
                <View
                  style={[
                    styles.filterChipCount,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : palette.surface },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterChipCountText,
                      { color: isActive ? '#FFFFFF' : palette.muted },
                    ]}
                  >
                    {item.count}
                  </ThemedText>
                </View>
              </Clickable>
            );
          }}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {emptyMessage}
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStatsCard()}
      {renderFilters()}

      {filteredData.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AttendeeCard
              rsvp={item}
              attendance={attendanceMap.get(item.userId)}
              onPress={onAttendeePress ? () => onAttendeePress(item.userId) : undefined}
              showCheckInStatus={attendance.length > 0}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  statsCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  capacitySection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  capacityValue: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  capacityBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
  },
  filtersList: {
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  filterChipCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    minWidth: 22,
    alignItems: 'center',
  },
  filterChipCountText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: scaleFont(15),
    textAlign: 'center',
  },
});
