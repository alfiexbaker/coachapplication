import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConsentCard } from '@/components/consent/ConsentCard';
import { ConsentFilter } from '@/components/consent/ConsentFilter';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  consentService,
  type ConsentFilters,
  CONSENT_TYPE_LABELS,
} from '@/services/consent-service';
import type { AthleteConsent, ConsentSummary, ConsentType } from '@/constants/types';

const logger = createLogger('ConsentsScreen');

function LoadingSkeleton() {
  return (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <Skeleton height={44} width={44} radius={22} />
            <View style={styles.skeletonInfo}>
              <Skeleton height={16} width="60%" />
              <Skeleton height={12} width="40%" />
            </View>
          </View>
          <Skeleton height={32} width="100%" />
        </View>
      ))}
    </View>
  );
}

interface StatCardProps {
  label: string;
  granted: number;
  denied: number;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

function StatCard({ label, granted, denied, icon, isActive, onPress }: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const total = granted + denied;
  const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;

  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.statCard,
        {
          backgroundColor: isActive ? withAlpha(palette.tint, 0.06) : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      <View style={styles.statHeader}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={isActive ? palette.tint : palette.muted}
        />
        <ThemedText
          style={[
            styles.statLabel,
            { color: isActive ? palette.tint : palette.muted },
          ]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      </View>
      <View style={styles.statNumbers}>
        <ThemedText
          style={[styles.statPercentage, { color: palette.success }]}
        >
          {percentage}%
        </ThemedText>
        <ThemedText style={[styles.statDetail, { color: palette.muted }]}>
          {granted}/{total}
        </ThemedText>
      </View>
    </Clickable>
  );
}

export default function ConsentsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [consents, setConsents] = useState<AthleteConsent[]>([]);
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ConsentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<ConsentType | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [consentsData, summaryData] = await Promise.all([
        consentService.getRosterConsents(coachId, {
          ...filters,
          search: searchQuery,
        }),
        consentService.getConsentSummary(coachId),
      ]);
      setConsents(consentsData);
      setSummary(summaryData);
    } catch (error) {
      logger.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, filters, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleFilterChange = (newFilters: ConsentFilters) => {
    setFilters(newFilters);
    setSelectedType(newFilters.type || null);
  };

  const handleStatCardPress = (type: ConsentType) => {
    if (selectedType === type) {
      setSelectedType(null);
      setFilters({ ...filters, type: undefined });
    } else {
      setSelectedType(type);
      setFilters({ ...filters, type });
    }
  };

  const renderItem = ({ item, index }: { item: AthleteConsent; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <ConsentCard
        athleteConsent={item}
        onPress={() =>
          router.push(Routes.rosterAthlete(item.athleteId))
        }
      />
    </Animated.View>
  );

  const activeFiltersCount =
    (filters.type ? 1 : 0) + (filters.status && filters.status !== 'all' ? 1 : 0);

  const consentTypes = consentService.getConsentTypes();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Consent Dashboard</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Quick view before posting content
          </ThemedText>
        </View>
      </View>

      {/* Stats Overview */}
      {summary && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {consentTypes.slice(0, 2).map((type) => {
              const stat = summary.byType[type];
              return (
                <StatCard
                  key={type}
                  label={CONSENT_TYPE_LABELS[type]}
                  granted={stat.granted}
                  denied={stat.denied}
                  icon={consentService.getConsentIcon(type)}
                  isActive={selectedType === type}
                  onPress={() => handleStatCardPress(type)}
                />
              );
            })}
          </View>
          <View style={styles.statsRow}>
            {consentTypes.slice(2).map((type) => {
              const stat = summary.byType[type];
              return (
                <StatCard
                  key={type}
                  label={CONSENT_TYPE_LABELS[type]}
                  granted={stat.granted}
                  denied={stat.denied}
                  icon={consentService.getConsentIcon(type)}
                  isActive={selectedType === type}
                  onPress={() => handleStatCardPress(type)}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: palette.surface }]}>
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
        <Clickable
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterButton,
            {
              backgroundColor:
                activeFiltersCount > 0 ? palette.tint : palette.surface,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFiltersCount > 0 ? Colors.light.onPrimary : palette.text}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <ThemedText style={styles.filterBadgeText}>
                {activeFiltersCount}
              </ThemedText>
            </View>
          )}
        </Clickable>
      </View>

      {/* Filters */}
      {showFilters && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.filtersContainer}
        >
          <ConsentFilter filters={filters} onFilterChange={handleFilterChange} />
        </Animated.View>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={consents}
          keyExtractor={(item) => item.athleteId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.tint}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title="No athletes found"
              message={
                searchQuery || activeFiltersCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'No athletes in your roster have consent data yet.'
              }
              actionLabel={activeFiltersCount > 0 ? 'Clear Filters' : undefined}
              onPressAction={
                activeFiltersCount > 0
                  ? () => {
                      setFilters({});
                      setSelectedType(null);
                    }
                  : undefined
              }
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statLabel: {
    ...Typography.caption,
    flex: 1,
  },
  statNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  statPercentage: {
    ...Typography.heading,
  },
  statDetail: {
    ...Typography.caption,
  },
  searchSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...Typography.micro,
    color: Colors.light.text,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  separator: {
    height: Spacing.sm,
  },
  loadingContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  skeletonCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  skeletonInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
});
