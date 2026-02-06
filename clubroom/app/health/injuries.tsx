/**
 * Injury History Screen
 *
 * Displays full injury history with filtering by status.
 * Shows all past and current injuries.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { InjuryCard } from '@/components/health';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import type { Injury, InjuryStatus } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const logger = createLogger('InjuryHistoryScreen');

type StatusFilter = InjuryStatus | 'ALL';

/**
 * Injury history screen showing all injuries with filtering.
 */
export default function InjuryHistoryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const userId = currentUser?.id ?? 'user1';

  // Load injuries
  const loadInjuries = useCallback(async () => {
    try {
      const userInjuries = await injuryService.getUserInjuries(userId, true);
      setInjuries(userInjuries);
    } catch (error) {
      logger.error('Failed to load injuries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadInjuries();
    }, [loadInjuries])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInjuries();
  }, [loadInjuries]);

  // Filter injuries
  const filteredInjuries = useMemo(() => {
    if (statusFilter === 'ALL') return injuries;
    return injuries.filter((i) => i.status === statusFilter);
  }, [injuries, statusFilter]);

  // Count by status
  const counts = useMemo(() => ({
    ALL: injuries.length,
    ACTIVE: injuries.filter((i) => i.status === 'ACTIVE').length,
    RECOVERING: injuries.filter((i) => i.status === 'RECOVERING').length,
    HEALED: injuries.filter((i) => i.status === 'HEALED').length,
  }), [injuries]);

  // Navigation
  const handleInjuryPress = useCallback((injury: Injury) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.healthEntry(injury.id));
  }, []);

  const handleFilterChange = useCallback((filter: StatusFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(filter);
  }, []);

  const handleLogInjury = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.HEALTH_LOG);
  }, []);

  const filters: { value: StatusFilter; label: string; color: string }[] = [
    { value: 'ALL', label: 'All', color: palette.text },
    { value: 'ACTIVE', label: 'Active', color: '#EF4444' },
    { value: 'RECOVERING', label: 'Recovering', color: '#F59E0B' },
    { value: 'HEALED', label: 'Healed', color: '#10B981' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Injury History
          </ThemedText>
        </View>
        <Clickable
          onPress={handleLogInjury}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={Colors.light.onPrimary} />
        </Clickable>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const isActive = statusFilter === filter.value;
              const count = counts[filter.value];
              return (
                <Clickable
                  key={filter.value}
                  onPress={() => handleFilterChange(filter.value)}
                >
                  <View
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: isActive ? filter.color : 'transparent',
                        borderColor: isActive ? filter.color : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.filterLabel,
                        { color: isActive ? Colors.light.onPrimary : palette.text },
                      ]}
                    >
                      {filter.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.filterCount,
                        {
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.2)'
                            : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.filterCountText,
                          { color: isActive ? Colors.light.onPrimary : palette.muted },
                        ]}
                      >
                        {count}
                      </ThemedText>
                    </View>
                  </View>
                </Clickable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ThemedText style={{ color: palette.muted }}>Loading injuries...</ThemedText>
          </View>
        ) : filteredInjuries.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons
                name={
                  statusFilter === 'HEALED'
                    ? 'checkmark-circle-outline'
                    : statusFilter === 'ACTIVE'
                      ? 'pulse-outline'
                      : statusFilter === 'RECOVERING'
                        ? 'trending-up-outline'
                        : 'medical-outline'
                }
                size={48}
                color={palette.tint}
              />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {statusFilter === 'ALL'
                ? 'No Injuries'
                : statusFilter === 'ACTIVE'
                  ? 'No Active Injuries'
                  : statusFilter === 'RECOVERING'
                    ? 'No Recovering Injuries'
                    : 'No Healed Injuries'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {statusFilter === 'ALL'
                ? "You haven't logged any injuries yet."
                : `You don't have any ${statusFilter.toLowerCase()} injuries.`}
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.springify()}>
            {filteredInjuries.map((injury, index) => (
              <Animated.View
                key={injury.id}
                entering={FadeInDown.delay(index * 50).springify()}
              >
                <InjuryCard injury={injury} onPress={() => handleInjuryPress(injury)} />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    ...Typography.display, fontSize: scaleFont(Typography.display.fontSize),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterLabel: {
    ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize),
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
});
