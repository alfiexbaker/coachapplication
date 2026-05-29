import { useState } from 'react';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { EventRSVP, EventAttendance, EventAttendanceStats } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { AttendeeCard } from './AttendeeCard';
import {
  AttendeeStatsCard,
  AttendeeFilterChip,
  AttendeeEmptyState,
  type FilterType,
  type FilterOption,
} from './attendee-list-sections';

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
  const { colors: palette } = useTheme();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const attendanceMap = (() => {
    const map = new Map<string, EventAttendance>();
    attendance.forEach((a) => map.set(a.userId, a));
    return map;
  })();

  const filteredData = (() => {
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

    return filtered.sort((a, b) => {
      const statusOrder = { GOING: 0, MAYBE: 1, NOT_GOING: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime();
    });
  })();

  const filterOptions: FilterOption[] = [
    { key: 'ALL', label: 'All', count: rsvps.length },
    { key: 'GOING', label: 'Going', count: rsvps.filter((r) => r.status === 'GOING').length },
    { key: 'MAYBE', label: 'Maybe', count: rsvps.filter((r) => r.status === 'MAYBE').length },
    { key: 'CHECKED_IN', label: 'Checked In', count: attendance.length },
  ];

  const renderAttendeeItem = ({ item }: { item: EventRSVP }) => (
    <AttendeeCard
      rsvp={item}
      attendance={attendanceMap.get(item.userId)}
      onPress={onAttendeePress ? () => onAttendeePress(item.userId) : undefined}
      showCheckInStatus={attendance.length > 0}
    />
  );

  const attendeeKeyExtractor = (item: EventRSVP) => item.id;

  const renderFilterItem = ({ item }: { item: FilterOption }) => (
    <AttendeeFilterChip
      item={item}
      isActive={filter === item.key}
      onPress={() => setFilter(item.key)}
      palette={palette}
    />
  );

  const filterKeyExtractor = (item: FilterOption) => item.key;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stats && showStats && <AttendeeStatsCard stats={stats} palette={palette} />}

      {showFilters && (
        <View style={styles.filtersContainer}>
          <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={filterKeyExtractor}
            contentContainerStyle={styles.filtersList}
            renderItem={renderFilterItem}
          />
        </View>
      )}

      {filteredData.length === 0 ? (
        <AttendeeEmptyState message={emptyMessage} palette={palette} />
      ) : (
        <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
          data={filteredData}
          keyExtractor={attendeeKeyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderAttendeeItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  filtersContainer: { marginBottom: Spacing.md },
  filtersList: { gap: Spacing.xs },
  listContent: { paddingBottom: Spacing.lg },
});
