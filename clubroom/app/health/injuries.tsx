/**
 * Injury Center Screen
 *
 * Command-center view for injury tracking:
 * - Subject switcher (self/child)
 * - One-tap recovery actions
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
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
import { Routes } from '@/navigation/routes';

const FILTERS: {
  value: StatusFilter;
  label: string;
  colorKey: 'text' | 'error' | 'warning' | 'success';
}[] = [
  { value: 'ALL', label: 'All', colorKey: 'text' },
  { value: 'ACTIVE', label: 'Active', colorKey: 'error' },
  { value: 'RECOVERING', label: 'Recovering', colorKey: 'warning' },
  { value: 'HEALED', label: 'Recovered', colorKey: 'success' },
];

const EMPTY_ICONS: Record<StatusFilter, keyof typeof Ionicons.glyphMap> = {
  ALL: 'medical-outline',
  ACTIVE: 'pulse-outline',
  RECOVERING: 'trending-up-outline',
  HEALED: 'checkmark-circle-outline',
};

export default function InjuryHistoryScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useInjuries();
  const isAllFilter = c.statusFilter === 'ALL';

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Row align="center" gap="md" style={styles.headerLeft}>
          <Clickable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace(Routes.HEALTH);
            }}
            hitSlop={8}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Injury Center
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Log injury"
          onPress={c.handleLogInjury}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={20} color={palette.onPrimary} />
        </Clickable>
      </Row>

      <View style={[styles.surfaceBlock, { borderBottomColor: palette.border }]}>
        {c.subjectOptions.length > 0 && (
          <View
            style={[
              styles.subjectCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Row align="center" justify="space-between">
              <Row align="center" gap="xs">
                <Ionicons name="person-circle-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.subjectLabel, { color: palette.muted }]}>For</ThemedText>
                <ThemedText style={styles.subjectName}>
                  {c.selectedSubjectName ?? 'Selected'}
                </ThemedText>
              </Row>
              <Row align="center" gap="xs">
                <Clickable
                  onPress={c.handleEditSelectedSubject}
                  style={[
                    styles.subjectActionButton,
                    { borderColor: palette.border, backgroundColor: withAlpha(palette.tint, 0.08) },
                  ]}
                  accessibilityLabel="Edit selected profile"
                >
                  <Row align="center" gap="xxs">
                    <Ionicons name="create-outline" size={14} color={palette.tint} />
                    <ThemedText style={[styles.subjectActionText, { color: palette.tint }]}>
                      Edit
                    </ThemedText>
                  </Row>
                </Clickable>
              </Row>
            </Row>
          </View>
        )}

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
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
                      {filter.label} ({c.counts[filter.value]})
                    </ThemedText>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </ScrollView>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} />}
      >
        {c.loading ? (
          <LoadingState variant="list" />
        ) : c.status === 'error' ? (
          <ErrorState
            message={c.error?.message ?? 'Failed to load injury records.'}
            onRetry={c.retry}
          />
        ) : (
          <View>
            {isAllFilter && (
              <>
                <Row align="center" justify="space-between" style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Open cases</ThemedText>
                  <ThemedText style={[styles.sectionMeta, { color: palette.muted }]}>
                    {c.openInjuries.length}
                  </ThemedText>
                </Row>

                {c.openInjuries.length === 0 ? (
                  <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: withAlpha(palette.success, 0.09) },
                      ]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={42} color={palette.success} />
                    </View>
                    <ThemedText type="subtitle" style={styles.emptyTitle}>
                      No open injuries
                    </ThemedText>
                    <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                      Everything is currently marked recovered.
                    </ThemedText>
                  </Animated.View>
                ) : (
                  c.openInjuries.map((injury, index) => (
                    <Animated.View
                      key={injury.id}
                      entering={FadeInDown.delay(index * 40).springify()}
                    >
                      <InjuryCard injury={injury} onPress={() => c.handleInjuryPress(injury)} />
                      <Row gap="sm" style={styles.cardActions}>
                        <Clickable
                          onPress={() => c.handleInjuryPress(injury)}
                          style={[
                            styles.secondaryAction,
                            { borderColor: palette.border, backgroundColor: palette.surface },
                          ]}
                        >
                          <ThemedText style={[styles.secondaryActionText, { color: palette.text }]}>
                            Open
                          </ThemedText>
                        </Clickable>
                        <Clickable
                          onPress={() => c.handleQuickHeal(injury)}
                          style={[
                            styles.primaryAction,
                            {
                              borderColor: palette.success,
                              backgroundColor: withAlpha(palette.success, 0.16),
                            },
                          ]}
                        >
                          <ThemedText
                            style={[styles.primaryActionText, { color: palette.success }]}
                          >
                            Mark Recovered
                          </ThemedText>
                        </Clickable>
                      </Row>
                    </Animated.View>
                  ))
                )}

                {c.healedInjuries.length > 0 && (
                  <View style={styles.recoveredBlock}>
                    <Row align="center" justify="space-between" style={styles.sectionHeader}>
                      <ThemedText type="subtitle">Recently recovered</ThemedText>
                      <ThemedText style={[styles.sectionMeta, { color: palette.muted }]}>
                        {c.healedInjuries.length}
                      </ThemedText>
                    </Row>
                    {c.healedInjuries.slice(0, 5).map((injury, index) => (
                      <Animated.View
                        key={injury.id}
                        entering={FadeInDown.delay(
                          (index + c.openInjuries.length) * 30,
                        ).springify()}
                      >
                        <InjuryCard
                          injury={injury}
                          compact
                          onPress={() => c.handleInjuryPress(injury)}
                        />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </>
            )}

            {!isAllFilter && c.filteredInjuries.length === 0 && (
              <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                >
                  <Ionicons name={EMPTY_ICONS[c.statusFilter]} size={42} color={palette.tint} />
                </View>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No {c.statusFilter.toLowerCase()} injuries
                </ThemedText>
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  Try another filter or log a new injury.
                </ThemedText>
              </Animated.View>
            )}

            {!isAllFilter &&
              c.filteredInjuries.length > 0 &&
              c.filteredInjuries.map((injury, index) => (
                <Animated.View key={injury.id} entering={FadeInDown.delay(index * 40).springify()}>
                  <InjuryCard injury={injury} onPress={() => c.handleInjuryPress(injury)} />
                  {injury.status !== 'HEALED' && (
                    <Row gap="sm" style={styles.cardActions}>
                      <Clickable
                        onPress={() => c.handleInjuryPress(injury)}
                        style={[
                          styles.secondaryAction,
                          { borderColor: palette.border, backgroundColor: palette.surface },
                        ]}
                      >
                        <ThemedText style={[styles.secondaryActionText, { color: palette.text }]}>
                          Open
                        </ThemedText>
                      </Clickable>
                      <Clickable
                        onPress={() => c.handleQuickHeal(injury)}
                        style={[
                          styles.primaryAction,
                          {
                            borderColor: palette.success,
                            backgroundColor: withAlpha(palette.success, 0.16),
                          },
                        ]}
                      >
                        <ThemedText style={[styles.primaryActionText, { color: palette.success }]}>
                          Mark Recovered
                        </ThemedText>
                      </Clickable>
                    </Row>
                  )}
                </Animated.View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  surfaceBlock: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  subjectCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  subjectLabel: {
    ...Typography.caption,
  },
  subjectName: {
    ...Typography.bodySmallSemiBold,
  },
  subjectActionButton: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  subjectActionText: {
    ...Typography.caption,
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  sectionMeta: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  cardActions: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  primaryAction: {
    flex: 1,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  secondaryAction: {
    minWidth: 84,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  primaryActionText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  secondaryActionText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  recoveredBlock: {
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { textAlign: 'center' },
  emptyText: {
    textAlign: 'center',
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    maxWidth: 260,
  },
});
