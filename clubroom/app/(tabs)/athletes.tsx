import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { RosterEntry } from '@/constants/types';

const logger = createLogger('AthletesScreen');

type FilterType = 'all' | 'active' | 'needs_attention';

export default function AthletesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
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

      // Map upcoming sessions by athlete
      const sessionsMap: Record<string, any> = {};
      bookingsData.forEach((booking: any) => {
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter and search athletes
  const filteredAthletes = roster.filter((athlete) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!athlete.athleteName.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filter === 'active') {
      return athlete.status === 'ACTIVE';
    }
    if (filter === 'needs_attention') {
      // No session in 14+ days or low engagement
      if (!athlete.lastSessionDate) return true;
      const daysSinceSession = Math.floor(
        (Date.now() - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceSession > 14;
    }

    return true;
  });

  // Sort: athletes with upcoming sessions first, then by last session
  const sortedAthletes = [...filteredAthletes].sort((a, b) => {
    const aHasUpcoming = !!upcomingSessions[a.athleteId];
    const bHasUpcoming = !!upcomingSessions[b.athleteId];
    if (aHasUpcoming && !bHasUpcoming) return -1;
    if (!aHasUpcoming && bHasUpcoming) return 1;

    if (!a.lastSessionDate) return 1;
    if (!b.lastSessionDate) return -1;
    return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
  });

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase();

  const formatRelativeDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const formatUpcomingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const needsAttentionCount = roster.filter((a) => {
    if (!a.lastSessionDate) return true;
    const days = Math.floor(
      (Date.now() - new Date(a.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days > 14;
  }).length;

  const renderAthleteCard = ({ item: athlete }: { item: RosterEntry }) => {
    const upcoming = upcomingSessions[athlete.athleteId];
    const needsAttention =
      !athlete.lastSessionDate ||
      Math.floor(
        (Date.now() - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
      ) > 14;

    return (
      <Clickable
        onPress={() =>
          router.push({
            pathname: '/roster/[athleteId]',
            params: { athleteId: athlete.athleteId },
          })
        }
      >
        <SurfaceCard style={styles.athleteCard}>
          <View style={styles.athleteRow}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
              {athlete.athletePhotoUrl ? (
                <Image source={{ uri: athlete.athletePhotoUrl }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {getInitials(athlete.athleteName)}
                </ThemedText>
              )}
              {needsAttention && (
                <View style={[styles.attentionDot, { backgroundColor: palette.warning }]} />
              )}
            </View>

            {/* Info */}
            <View style={styles.athleteInfo}>
              <View style={styles.nameRow}>
                <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                  {athlete.athleteName}
                </ThemedText>
                {athlete.status !== 'ACTIVE' && (
                  <View style={[styles.statusBadge, { backgroundColor: palette.muted + '20' }]}>
                    <ThemedText style={[styles.statusText, { color: palette.muted }]}>
                      {athlete.status.toLowerCase()}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {athlete.totalSessions} sessions
                </ThemedText>
                <ThemedText style={[styles.metaDot, { color: palette.muted }]}>•</ThemedText>
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  Last: {formatRelativeDate(athlete.lastSessionDate)}
                </ThemedText>
              </View>

              {/* Next session or needs attention */}
              {upcoming ? (
                <View style={[styles.upcomingBadge, { backgroundColor: palette.success + '15' }]}>
                  <Ionicons name="calendar" size={12} color={palette.success} />
                  <ThemedText style={[styles.upcomingText, { color: palette.success }]}>
                    Next: {formatUpcomingDate(upcoming.scheduledAt)}
                  </ThemedText>
                </View>
              ) : needsAttention ? (
                <View style={[styles.upcomingBadge, { backgroundColor: palette.warning + '15' }]}>
                  <Ionicons name="alert-circle" size={12} color={palette.warning} />
                  <ThemedText style={[styles.upcomingText, { color: palette.warning }]}>
                    No upcoming session
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Clickable
                style={[styles.actionButton, { backgroundColor: palette.tint }]}
                onPress={() =>
                  router.push({
                    pathname: '/session-invites/create',
                    params: { athleteId: athlete.athleteId, athleteName: athlete.athleteName },
                  })
                }
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Clickable>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </View>
          </View>
        </SurfaceCard>
      </Clickable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search */}
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

      {/* Filters */}
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
                { color: filter === f.id ? '#FFFFFF' : palette.text },
              ]}
            >
              {f.label}
            </ThemedText>
            {f.count > 0 && (
              <View
                style={[
                  styles.filterCount,
                  { backgroundColor: filter === f.id ? 'rgba(255,255,255,0.3)' : palette.muted + '30' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterCountText,
                    { color: filter === f.id ? '#FFFFFF' : palette.muted },
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <ThemedText type="title" style={styles.title}>
          Athletes
        </ThemedText>
        <Clickable
          style={[styles.inviteButton, { backgroundColor: palette.tint }]}
          onPress={() => router.push('/session-invites/create')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
        </Clickable>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 16,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  athleteCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  attentionDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  athleteInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  athleteName: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  metaDot: {
    fontSize: 13,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
