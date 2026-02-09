/**
 * Discover Sessions Screen
 *
 * Allows parents and athletes to browse available sessions from coaches.
 * Features filtering by skill focus, age range, and session type.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { SessionOffering, FootballObjective } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DiscoverSessions');

const SKILL_FILTERS: { value: FootballObjective | ''; label: string }[] = [
  { value: '', label: 'All Skills' },
  { value: 'Dribbling', label: 'Dribbling' },
  { value: 'Passing', label: 'Passing' },
  { value: 'Defending', label: 'Defending' },
  { value: 'Finishing', label: 'Finishing' },
  { value: 'Goalkeeping', label: 'Goalkeeping' },
  { value: 'Conditioning', label: 'Conditioning' },
];

const TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: '1on1', label: '1:1' },
  { value: 'group', label: 'Group' },
];

export default function DiscoverSessionsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [offerings, setOfferings] = useState<SessionOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<FootballObjective | ''>('');
  const [typeFilter, setTypeFilter] = useState<'1on1' | 'group' | ''>('');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const allOfferings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      if (allOfferings.length > 0) {
        // Filter to show only active sessions not owned by current user
        const available = allOfferings.filter(o =>
          o.status === 'active' &&
          o.coachId !== currentUser?.id
        );
        setOfferings(available);
        logger.debug('Loaded offerings', { count: available.length });
      }
    } catch (error) {
      logger.error('Failed to load offerings', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Load all available offerings
  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  // Filter offerings based on search and filters
  const filteredOfferings = useMemo(() => {
    let filtered = offerings;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(query) ||
        o.coachName.toLowerCase().includes(query) ||
        o.location.toLowerCase().includes(query) ||
        (o.description?.toLowerCase().includes(query))
      );
    }

    // Skill filter
    if (skillFilter) {
      filtered = filtered.filter(o => o.footballSkill === skillFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(o => o.sessionType === typeFilter);
    }

    // Sort by next available date
    return filtered.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [offerings, searchQuery, skillFilter, typeFilter]);

  const handleOfferingPress = (offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  };

  const handleModalClose = () => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  };

  const handleModalUpdate = () => {
    loadOfferings();
  };

  const formatNextSession = (offering: SessionOffering): string => {
    if (offering.isRecurring && offering.dayOfWeek !== undefined) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOffering = ({ item }: { item: SessionOffering }) => {
    const registeredCount = item.registrations.filter(r => r.status === 'confirmed').length;
    const spotsLeft = item.maxParticipants - registeredCount;
    const isFull = spotsLeft <= 0;

    return (
      <SurfaceCard
        style={styles.card}
        onPress={() => handleOfferingPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.coachInfo}>
            <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {item.coachName.charAt(0)}
              </ThemedText>
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.coachName}>
                {item.coachName}
              </ThemedText>
              <ThemedText style={[styles.location, { color: palette.muted }]}>
                {item.location}
              </ThemedText>
            </View>
          </View>
          {item.priceUsd !== undefined && item.priceUsd > 0 && (
            <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
              £{item.priceUsd}
            </ThemedText>
          )}
        </View>

        <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
          {item.title}
        </ThemedText>

        {item.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {item.description}
          </ThemedText>
        )}

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.icon} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {formatNextSession(item)}
            </ThemedText>
          </View>

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
              <ThemedText style={[styles.badgeText, { color: palette.accent }]}>
                {item.sessionType === 'group' ? 'Group' : '1:1'}
              </ThemedText>
            </View>

            {item.footballSkill && (
              <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
                  {item.footballSkill}
                </ThemedText>
              </View>
            )}

            {item.sessionType === 'group' && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isFull ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09) },
                ]}
              >
                <ThemedText
                  style={[
                    styles.badgeText,
                    { color: isFull ? palette.error : palette.success },
                  ]}
                >
                  {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Discover Sessions"
        subtitle="Find and book coaching sessions"
        showBack
        onBackPress={() => router.back()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={20} color={palette.muted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search sessions, coaches, locations..."
            placeholderTextColor={palette.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={palette.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filters}>
        <FlatList
          data={TYPE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={item => item.value || 'all-types'}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterPill,
                {
                  backgroundColor: typeFilter === item.value ? palette.tint : 'transparent',
                  borderColor: typeFilter === item.value ? palette.tint : palette.border,
                },
              ]}
              onPress={() => setTypeFilter(item.value as typeof typeFilter)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: typeFilter === item.value ? palette.onPrimary : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      <View style={styles.filters}>
        <FlatList
          data={SKILL_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={item => item.value || 'all-skills'}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterPill,
                {
                  backgroundColor: skillFilter === item.value ? palette.tint : 'transparent',
                  borderColor: skillFilter === item.value ? palette.tint : palette.border,
                },
              ]}
              onPress={() => setSkillFilter(item.value as typeof skillFilter)}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: skillFilter === item.value ? palette.onPrimary : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredOfferings}
        keyExtractor={item => item.id}
        renderItem={renderOffering}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
              <Ionicons name="search-outline" size={40} color={palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {loading ? 'Loading sessions...' : 'No sessions found'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {loading
                ? 'Please wait while we find available sessions'
                : searchQuery || skillFilter || typeFilter
                  ? 'Try adjusting your filters'
                  : 'Check back later for new sessions'}
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...Typography.subheading,
    paddingVertical: Spacing.xxs,
  },
  filters: {
    paddingBottom: Spacing.xs,
  },
  filterList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  filterText: {
    ...Typography.smallSemiBold,
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  card: {
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.subheading,
  },
  coachName: {
    ...Typography.bodySmall,
  },
  location: {
    ...Typography.caption,
  },
  price: {
    ...Typography.heading,
  },
  sessionTitle: {
    ...Typography.heading,
  },
  description: {
    ...Typography.bodySmall,
  },
  meta: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.small,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  badgeText: {
    ...Typography.caption,
  },
  separator: {
    height: Spacing.sm,
  },
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
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.heading,
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
});
