/**
 * Injury History Screen
 *
 * Full injury history with status filtering.
 * All state/logic in useInjuries hook.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { InjuryCard } from '@/components/health';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useInjuries, type StatusFilter } from '@/hooks/use-injuries';
import { scaleFont } from '@/utils/scale';

const FILTERS: {
  value: StatusFilter;
  label: string;
  colorKey: 'text' | 'error' | 'warning' | 'success';
}[] = [
  { value: 'ALL', label: 'All', colorKey: 'text' },
  { value: 'ACTIVE', label: 'Active', colorKey: 'error' },
  { value: 'RECOVERING', label: 'Recovering', colorKey: 'warning' },
  { value: 'HEALED', label: 'Healed', colorKey: 'success' },
];

const EMPTY_ICONS: Record<StatusFilter, string> = {
  ALL: 'medical-outline',
  ACTIVE: 'pulse-outline',
  RECOVERING: 'trending-up-outline',
  HEALED: 'checkmark-circle-outline',
};

export default function InjuryHistoryScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useInjuries();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Row align="center" justify="space-between" style={styles.header}>
        <Row align="center" gap="md" style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Injury History
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Log injury"
          onPress={c.handleLogInjury}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={palette.onPrimary} />
        </Clickable>
      </Row>

      <View style={[styles.filterContainer, { borderBottomColor: palette.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap="xs" style={styles.filterRow}>
            {FILTERS.map((filter) => {
              const isActive = c.statusFilter === filter.value;
              const color = palette[filter.colorKey];
              return (
                <Clickable key={filter.value} onPress={() => c.handleFilterChange(filter.value)}>
                  <Row
                    align="center"
                    gap="xs"
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: isActive ? color : 'transparent',
                        borderColor: isActive ? color : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.filterLabel,
                        { color: isActive ? palette.onPrimary : palette.text },
                      ]}
                    >
                      {filter.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.filterCount,
                        {
                          backgroundColor: isActive
                            ? withAlpha(palette.onPrimary, 0.2)
                            : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.filterCountText,
                          { color: isActive ? palette.onPrimary : palette.muted },
                        ]}
                      >
                        {c.counts[filter.value]}
                      </ThemedText>
                    </View>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} />}
      >
        {c.loading ? (
          <LoadingState variant="list" />
        ) : c.status === 'error' ? (
          <ErrorState
            message={c.error?.message ?? 'Failed to load injury history.'}
            onRetry={c.retry}
          />
        ) : c.filteredInjuries.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons
                name={EMPTY_ICONS[c.statusFilter] as keyof typeof Ionicons.glyphMap}
                size={48}
                color={palette.tint}
              />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {c.statusFilter === 'ALL'
                ? 'No Injuries'
                : `No ${c.statusFilter.charAt(0) + c.statusFilter.slice(1).toLowerCase()} Injuries`}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              {c.statusFilter === 'ALL'
                ? "You haven't logged any injuries yet."
                : `You don't have any ${c.statusFilter.toLowerCase()} injuries.`}
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.springify()}>
            {c.filteredInjuries.map((injury, index) => (
              <Animated.View key={injury.id} entering={FadeInDown.delay(index * 50).springify()}>
                <InjuryCard injury={injury} onPress={() => c.handleInjuryPress(injury)} />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: {},
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
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
    borderBottomColor: 'transparent',
  },
  filterRow: { paddingHorizontal: Spacing.lg },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
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
  emptyTitle: { textAlign: 'center' },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
});
