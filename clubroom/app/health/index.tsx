import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { InjuryCard } from '@/components/health';
import { HealthStatusCard } from '@/components/health/health-status-card';
import { HealthStatsCard } from '@/components/health/health-stats-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useHealthHub } from '@/hooks/use-health-hub';
import { scaleFont } from '@/utils/scale';

export default function HealthDashboardScreen() {
  const { colors } = useTheme();
  const {
    injuries, stats, loading, refreshing, activeCount, avgRecovery,
    handleRefresh, handleLogInjury, handleViewHistory, handleInjuryPress,
  } = useHealthHub();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" justify="between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>Health</ThemedText>
        <Clickable accessibilityLabel="Log injury" onPress={handleLogInjury} style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Clickable>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <HealthStatusCard colors={colors} injuries={injuries} activeCount={activeCount} avgRecovery={avgRecovery} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.actionsRow}>
          <Row gap="sm">
            <Clickable onPress={handleLogInjury} style={{ flex: 1 }}>
              <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.error, 0.09) }]}>
                  <Ionicons name="add-circle-outline" size={24} color={colors.error} />
                </View>
                <ThemedText style={styles.actionLabel}>Log Injury</ThemedText>
              </View>
            </Clickable>
            <Clickable onPress={handleViewHistory} style={{ flex: 1 }}>
              <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                  <Ionicons name="time-outline" size={24} color={colors.tint} />
                </View>
                <ThemedText style={styles.actionLabel}>View History</ThemedText>
              </View>
            </Clickable>
          </Row>
        </Animated.View>

        {injuries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.injuriesSection}>
            <Row justify="space-between" align="center" style={styles.sectionHeader}>
              <ThemedText type="subtitle">Current Injuries</ThemedText>
              <Clickable onPress={handleViewHistory}>
                <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>See all</ThemedText>
              </Clickable>
            </Row>
            {injuries.slice(0, 3).map((injury) => (
              <InjuryCard key={injury.id} injury={injury} onPress={() => handleInjuryPress(injury)} />
            ))}
          </Animated.View>
        )}

        {stats && stats.totalInjuries > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <HealthStatsCard colors={colors} stats={stats} />
          </Animated.View>
        )}

        {!loading && injuries.length === 0 && stats?.totalInjuries === 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <Ionicons name="fitness-outline" size={48} color={colors.success} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>Stay Injury-Free</ThemedText>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              Track any injuries here to monitor recovery and share status with your coach.
            </ThemedText>
            <Button onPress={handleLogInjury} style={styles.emptyButton}>Log an Injury</Button>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { flex: 1, ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  actionsRow: { marginBottom: Spacing.lg },
  actionCard: { padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, alignItems: 'center', gap: Spacing.xs },
  actionIcon: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  injuriesSection: { marginBottom: Spacing.lg },
  sectionHeader: { marginBottom: Spacing.sm },
  seeAllText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing.lg, gap: Spacing.md },
  emptyIcon: { width: 96, height: 96, borderRadius: Radii['3xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle: { textAlign: 'center' },
  emptyText: { textAlign: 'center', ...Typography.body, fontSize: scaleFont(Typography.body.fontSize), lineHeight: scaleFont(22), maxWidth: 280 },
  emptyButton: { marginTop: Spacing.sm },
});
