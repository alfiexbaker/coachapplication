import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { AthleteCard } from '@/components/roster/athlete-card';
import { Spacing, Radii, Typography  , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('AthletesScreen');

type FilterType = 'all' | 'active' | 'needs_attention';

export default function AthletesScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Record<string, Booking>>({});
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [rosterData, bookingsData] = await Promise.all([
        rosterService.getRoster(currentUser.id),
        bookingService.getUpcomingBookings(currentUser.id),
      ]);
      setRoster(rosterData);
      const sessionsMap: Record<string, Booking> = {};
      bookingsData.forEach((booking: Booking) => {
        if (booking.athleteId && !sessionsMap[booking.athleteId]) {
          sessionsMap[booking.athleteId] = booking;
        }
      });
      setUpcomingSessions(sessionsMap);
    } catch (error) {
      logger.error('Failed to load athletes', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredAthletes = roster.filter((athlete) => {
    if (searchQuery) {
      if (!athlete.athleteName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    if (filter === 'active') return athlete.status === 'ACTIVE';
    if (filter === 'needs_attention') {
      if (!athlete.lastSessionDate) return true;
      return Math.floor((Date.now() - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)) > 14;
    }
    return true;
  });

  const sortedAthletes = [...filteredAthletes].sort((a, b) => {
    const aUp = !!upcomingSessions[a.athleteId];
    const bUp = !!upcomingSessions[b.athleteId];
    if (aUp && !bUp) return -1;
    if (!aUp && bUp) return 1;
    if (!a.lastSessionDate) return 1;
    if (!b.lastSessionDate) return -1;
    return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
  });

  const needsAttentionCount = roster.filter((a) => {
    if (!a.lastSessionDate) return true;
    return Math.floor((Date.now() - new Date(a.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)) > 14;
  }).length;

  const renderAthleteCard = ({ item: athlete }: { item: RosterEntry }) => (
    <AthleteCard athlete={athlete} upcomingSession={upcomingSessions[athlete.athleteId]} />
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={[styles.searchContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Ionicons name="search" size={18} color={palette.muted} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search athletes..."
          placeholderTextColor={palette.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Clickable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Clickable>
        )}
      </View>

      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All', count: roster.length },
          { id: 'active', label: 'Active', count: roster.filter((a) => a.status === 'ACTIVE').length },
          { id: 'needs_attention', label: 'Needs Attention', count: needsAttentionCount },
        ].map((f) => (
          <Clickable
            key={f.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.id ? palette.tint : palette.card,
                borderColor: filter === f.id ? palette.tint : palette.border,
              },
            ]}
            onPress={() => setFilter(f.id as FilterType)}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === f.id ? palette.onPrimary : palette.text },
              ]}
            >
              {f.label}
            </ThemedText>
            {f.count > 0 && (
              <View
                style={[
                  styles.filterCount,
                  { backgroundColor: filter === f.id ? 'rgba(255,255,255,0.3)' : withAlpha(palette.muted, 0.19) },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterCountText,
                    { color: filter === f.id ? palette.onPrimary : palette.muted },
                  ]}
                >
                  {f.count}
                </ThemedText>
              </View>
            )}
          </Clickable>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
        {searchQuery ? 'No athletes found' : 'No athletes yet'}
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
        {searchQuery
          ? 'Try a different search term'
          : 'Athletes will appear here once they book sessions with you'}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
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

      <FlatList
        data={sortedAthletes}
        renderItem={renderAthleteCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
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
  emptyState: {
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
    lineHeight: 20,
  },
});
