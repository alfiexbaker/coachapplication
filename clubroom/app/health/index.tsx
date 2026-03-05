import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';

import { Row } from '@/components/primitives/row';
import { InjuryCard } from '@/components/health';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useHealthHub } from '@/hooks/use-health-hub';
import { scaleFont } from '@/utils/scale';

export default function HealthDashboardScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    injuries,
    loading,
    status,
    error,
    refreshing,
    handleRefresh,
    retry,
    handleLogInjury,
    handleInjuryPress,
    selectedSubjectName,
    selectedSubjectKind,
    canEditSelectedChild,
    handleEditSelectedChild,
  } = useHealthHub();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (loading) {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState
        message={error?.message ?? 'Failed to load health dashboard.'}
        onRetry={retry}
      />,
    );
  }

  return renderShell(
    <>
      <Row gap="md" align="center" justify="between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Health
        </ThemedText>
        <Clickable
          accessibilityLabel="Log injury"
          onPress={handleLogInjury}
          style={[styles.addButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Clickable>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {selectedSubjectName && (
          <View
            style={[
              styles.kidCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Row align="center" justify="space-between">
              <Row align="center" gap="xs">
                <Ionicons name="person-circle-outline" size={18} color={colors.tint} />
                {selectedSubjectKind === 'child' ? (
                  <ThemedText style={[styles.kidLabel, { color: colors.muted }]}>Kid</ThemedText>
                ) : null}
                <ThemedText style={styles.kidName}>{selectedSubjectName}</ThemedText>
              </Row>
              {canEditSelectedChild ? (
                <Row align="center" gap="xs">
                  <Clickable
                    onPress={handleEditSelectedChild}
                    style={[
                      styles.editKidButton,
                      { borderColor: colors.border, backgroundColor: withAlpha(colors.tint, 0.08) },
                    ]}
                    accessibilityLabel="Edit selected kid profile"
                  >
                    <Row align="center" gap="xxs">
                      <Ionicons name="create-outline" size={14} color={colors.tint} />
                      <ThemedText style={[styles.editKidText, { color: colors.tint }]}>Edit</ThemedText>
                    </Row>
                  </Clickable>
                </Row>
              ) : null}
            </Row>
          </View>
        )}

        {injuries.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.injuriesSection}
          >
            <Row justify="space-between" align="center" style={styles.sectionHeader}>
              <ThemedText type="subtitle">All Injuries</ThemedText>
            </Row>
            {injuries.map((injury) => (
              <InjuryCard
                key={injury.id}
                injury={injury}
                onPress={() => handleInjuryPress(injury)}
              />
            ))}
          </Animated.View>
        )}

        {!loading && injuries.length === 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <Ionicons name="fitness-outline" size={48} color={colors.success} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Stay Injury-Free
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              Track any injuries here to monitor recovery and share status with your coach.
            </ThemedText>
          </Animated.View>
        )}
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { flex: 1, ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  kidCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  kidLabel: {
    ...Typography.caption,
  },
  kidName: {
    ...Typography.bodySmallSemiBold,
  },
  editKidButton: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  editKidText: {
    ...Typography.caption,
  },
  injuriesSection: { marginBottom: Spacing.lg },
  sectionHeader: { marginBottom: Spacing.sm },
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
