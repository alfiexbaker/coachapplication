/**
 * Health Dashboard Screen
 *
 * Main health and injury tracking dashboard. Shows active injuries,
 * recovery progress, and provides quick access to log new injuries.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { InjuryCard } from '@/components/health';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Injury, InjuryStats } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

/**
 * Health Dashboard Screen showing injury overview and active injuries.
 */
export default function HealthDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [stats, setStats] = useState<InjuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = currentUser?.id ?? 'user1';

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [userInjuries, injuryStats] = await Promise.all([
        injuryService.getUserInjuries(userId, false),
        injuryService.getInjuryStats(userId),
      ]);
      setInjuries(userInjuries);
      setStats(injuryStats);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Navigation
  const handleLogInjury = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/health/log');
  }, []);

  const handleViewHistory = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/health/injuries');
  }, []);

  const handleInjuryPress = useCallback((injury: Injury) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/health/[id]', params: { id: injury.id } });
  }, []);

  // Calculate summary stats
  const activeCount = useMemo(
    () => injuries.filter((i) => i.status === 'ACTIVE' || i.status === 'RECOVERING').length,
    [injuries]
  );

  const avgRecovery = useMemo(() => {
    const recovering = injuries.filter((i) => i.status === 'RECOVERING');
    if (recovering.length === 0) return 0;
    return Math.round(recovering.reduce((sum, i) => sum + i.recoveryPercent, 0) / recovering.length);
  }, [injuries]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Health
          </ThemedText>
        </View>
        <Clickable
          onPress={handleLogInjury}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status overview */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.statusCard}>
            {activeCount === 0 ? (
              <View style={styles.healthyState}>
                <View style={[styles.healthyIcon, { backgroundColor: `${palette.success}15` }]}>
                  <Ionicons name="checkmark-circle" size={48} color={palette.success} />
                </View>
                <ThemedText type="subtitle" style={styles.healthyTitle}>
                  All Clear!
                </ThemedText>
                <ThemedText style={[styles.healthyText, { color: palette.muted }]}>
                  You have no active injuries. Keep up the great work!
                </ThemedText>
              </View>
            ) : (
              <View style={styles.statusContent}>
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusIcon, { backgroundColor: `${palette.error}15` }]}>
                      <Ionicons name="pulse" size={24} color={palette.error} />
                    </View>
                    <ThemedText type="title" style={[styles.statusValue, { color: palette.error }]}>
                      {injuries.filter((i) => i.status === 'ACTIVE').length}
                    </ThemedText>
                    <ThemedText style={[styles.statusLabel, { color: palette.muted }]}>
                      Active
                    </ThemedText>
                  </View>
                  <View style={[styles.statusDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.statusItem}>
                    <View style={[styles.statusIcon, { backgroundColor: `${palette.warning}15` }]}>
                      <Ionicons name="trending-up" size={24} color={palette.warning} />
                    </View>
                    <ThemedText type="title" style={[styles.statusValue, { color: palette.warning }]}>
                      {injuries.filter((i) => i.status === 'RECOVERING').length}
                    </ThemedText>
                    <ThemedText style={[styles.statusLabel, { color: palette.muted }]}>
                      Recovering
                    </ThemedText>
                  </View>
                  <View style={[styles.statusDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.statusItem}>
                    <View style={[styles.statusIcon, { backgroundColor: `${palette.tint}15` }]}>
                      <Ionicons name="fitness" size={24} color={palette.tint} />
                    </View>
                    <ThemedText type="title" style={[styles.statusValue, { color: palette.tint }]}>
                      {avgRecovery}%
                    </ThemedText>
                    <ThemedText style={[styles.statusLabel, { color: palette.muted }]}>
                      Avg Recovery
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.actionsRow}>
          <Clickable onPress={handleLogInjury} style={{ flex: 1 }}>
            <View style={[styles.actionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="add-circle-outline" size={24} color={palette.error} />
              </View>
              <ThemedText style={styles.actionLabel}>Log Injury</ThemedText>
            </View>
          </Clickable>
          <Clickable onPress={handleViewHistory} style={{ flex: 1 }}>
            <View style={[styles.actionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="time-outline" size={24} color={palette.tint} />
              </View>
              <ThemedText style={styles.actionLabel}>View History</ThemedText>
            </View>
          </Clickable>
        </Animated.View>

        {/* Active injuries */}
        {injuries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.injuriesSection}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Current Injuries</ThemedText>
              <Clickable onPress={handleViewHistory}>
                <ThemedText style={[styles.seeAllText, { color: palette.tint }]}>
                  See all
                </ThemedText>
              </Clickable>
            </View>
            {injuries.slice(0, 3).map((injury) => (
              <InjuryCard
                key={injury.id}
                injury={injury}
                onPress={() => handleInjuryPress(injury)}
              />
            ))}
          </Animated.View>
        )}

        {/* Stats summary */}
        {stats && stats.totalInjuries > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <SurfaceCard style={styles.statsCard}>
              <ThemedText type="subtitle" style={styles.statsTitle}>
                Injury History
              </ThemedText>
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <ThemedText style={[styles.statsValue, { color: palette.text }]}>
                    {stats.totalInjuries}
                  </ThemedText>
                  <ThemedText style={[styles.statsLabel, { color: palette.muted }]}>
                    Total
                  </ThemedText>
                </View>
                <View style={styles.statsItem}>
                  <ThemedText style={[styles.statsValue, { color: palette.success }]}>
                    {stats.healedInjuries}
                  </ThemedText>
                  <ThemedText style={[styles.statsLabel, { color: palette.muted }]}>
                    Healed
                  </ThemedText>
                </View>
                <View style={styles.statsItem}>
                  <ThemedText style={[styles.statsValue, { color: palette.text }]}>
                    {stats.averageRecoveryDays}
                  </ThemedText>
                  <ThemedText style={[styles.statsLabel, { color: palette.muted }]}>
                    Avg Days
                  </ThemedText>
                </View>
              </View>
              {stats.commonBodyParts.length > 0 && (
                <View style={styles.commonParts}>
                  <ThemedText style={[styles.commonPartsLabel, { color: palette.muted }]}>
                    Most common areas:
                  </ThemedText>
                  <View style={styles.commonPartsList}>
                    {stats.commonBodyParts.slice(0, 3).map((item) => (
                      <View
                        key={item.bodyPart}
                        style={[styles.commonPartBadge, { backgroundColor: `${palette.tint}10` }]}
                      >
                        <ThemedText style={[styles.commonPartText, { color: palette.tint }]}>
                          {injuryService.getBodyPartLabel(item.bodyPart)} ({item.count})
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Empty state for first-time users */}
        {!loading && injuries.length === 0 && stats?.totalInjuries === 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="fitness-outline" size={48} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Stay Injury-Free
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Track any injuries here to monitor recovery and share status with your coach.
            </ThemedText>
            <Button onPress={handleLogInjury} style={styles.emptyButton}>
              Log an Injury
            </Button>
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
    fontSize: scaleFont(24),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  statusCard: {
    marginBottom: Spacing.md,
  },
  healthyState: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  healthyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  healthyTitle: {
    marginBottom: 4,
  },
  healthyText: {
    textAlign: 'center',
    fontSize: scaleFont(14),
  },
  statusContent: {
    padding: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statusValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: scaleFont(12),
  },
  statusDivider: {
    width: 1,
    height: 50,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  injuriesSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  statsItem: {
    alignItems: 'center',
  },
  statsValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: scaleFont(12),
  },
  commonParts: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.md,
  },
  commonPartsLabel: {
    fontSize: scaleFont(12),
    marginBottom: Spacing.xs,
  },
  commonPartsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  commonPartBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  commonPartText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
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
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
