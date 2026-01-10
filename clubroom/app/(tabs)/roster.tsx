import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService, type RosterFilters } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

type StatusFilter = 'ALL' | RosterEntry['status'];

function AthleteCard({
  entry,
  index,
  onPress,
}: {
  entry: RosterEntry;
  index: number;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const statusColor = rosterService.getStatusColor(entry.status);
  const initials = entry.athleteName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <SurfaceCard style={styles.athleteCard} onPress={onPress}>
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
            {entry.athletePhotoUrl ? (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {initials}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {initials}
              </ThemedText>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                {entry.athleteName}
              </ThemedText>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>

            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {entry.athleteAge ? `Age ${entry.athleteAge}` : ''}{' '}
              {entry.primaryFocus ? `· ${entry.primaryFocus}` : ''}
            </ThemedText>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <ThemedText style={[styles.statValue, { color: palette.text }]}>
                  {entry.totalSessions}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  sessions
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText style={[styles.statValue, { color: palette.text }]}>
                  {entry.averageRating.toFixed(1)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  avg rating
                </ThemedText>
              </View>
              {entry.lastSessionDate && (
                <View style={styles.stat}>
                  <ThemedText style={[styles.statValue, { color: palette.text }]}>
                    {new Date(entry.lastSessionDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    last session
                  </ThemedText>
                </View>
              )}
            </View>

            {entry.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {entry.tags.slice(0, 3).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: `${palette.tint}10` }]}
                  >
                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>
                      {tag}
                    </ThemedText>
                  </View>
                ))}
                {entry.tags.length > 3 && (
                  <ThemedText style={[styles.moreTag, { color: palette.muted }]}>
                    +{entry.tags.length - 3}
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function RosterScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoster();
  }, [currentUser?.id]);

  const loadRoster = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await rosterService.getRoster(currentUser.id);
      setRoster(data);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoster = useMemo(() => {
    let filtered = roster;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.athleteName.toLowerCase().includes(searchLower) ||
          r.parentName.toLowerCase().includes(searchLower) ||
          r.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [roster, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: roster.length,
      active: roster.filter((r) => r.status === 'ACTIVE').length,
      paused: roster.filter((r) => r.status === 'PAUSED').length,
      graduated: roster.filter((r) => r.status === 'GRADUATED').length,
    };
  }, [roster]);

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: `All (${stats.total})`, value: 'ALL' },
    { label: `Active (${stats.active})`, value: 'ACTIVE' },
    { label: `Paused (${stats.paused})`, value: 'PAUSED' },
    { label: `Graduated (${stats.graduated})`, value: 'GRADUATED' },
  ];

  const handleAthletePress = (entry: RosterEntry) => {
    router.push({
      pathname: '/roster/[athleteId]',
      params: { athleteId: entry.athleteId },
    });
  };

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <PageHeader
          title="My Athletes"
          subtitle={`${stats.active} active athletes`}
        />
      }
      gap={Spacing.md}
    >
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: palette.surface }]}>
        <Ionicons name="search" size={20} color={palette.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search athletes or tags"
          placeholderTextColor={palette.muted}
          style={[styles.searchInput, { color: palette.text }]}
        />
        {search ? (
          <Clickable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={palette.muted} />
          </Clickable>
        ) : null}
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {statusFilters.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            selected={statusFilter === filter.value}
            onPress={() => setStatusFilter(filter.value)}
          />
        ))}
      </ScrollView>

      {/* Roster List */}
      {filteredRoster.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No matches found' : 'No athletes yet'}
          message={
            search
              ? 'Try a different search term'
              : 'Athletes will appear here after they book sessions with you'
          }
        />
      ) : (
        <View style={styles.list}>
          {filteredRoster.map((entry, index) => (
            <AthleteCard
              key={entry.id}
              entry={entry}
              index={index}
              onPress={() => handleAthletePress(entry)}
            />
          ))}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersRow: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  athleteCard: {
    padding: Spacing.md,
  },
  cardRow: {
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
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  athleteName: {
    fontSize: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreTag: {
    fontSize: 11,
    fontWeight: '500',
    paddingVertical: 2,
  },
});
