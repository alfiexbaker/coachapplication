import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { HealthStatusCard } from '@/components/health/health-status-card';
import { InjuryCard } from '@/components/health';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useCoachAthleteHealth } from '@/hooks/use-coach-athlete-health';
import { useTheme } from '@/hooks/useTheme';

export default function CoachAthleteHealthScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { colors } = useTheme();
  const h = useCoachAthleteHealth(athleteId ?? '');

  const renderShell = (content: React.ReactNode) => (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
  const header = (
    <Row align="center" gap="md" style={styles.header}>
      <Clickable onPress={() => router.back()} accessibilityLabel="Go back" hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <View style={styles.headerCopy}>
        <ThemedText type="title">Health Review</ThemedText>
        <ThemedText style={{ color: colors.muted }}>
          {h.athleteName ? `${h.athleteName}${h.parentName ? ` • ${h.parentName}` : ''}` : 'Loading athlete health'}
        </ThemedText>
      </View>
    </Row>
  );

  if (h.loading) {
    return renderShell(
      <>
        {header}
        <LoadingState variant="card" />
      </>,
    );
  }

  if (h.status === 'error') {
    return renderShell(
      <>
        {header}
        <ErrorState message={h.error?.message ?? 'Failed to load athlete health.'} onRetry={h.retry} />
      </>,
    );
  }

  if (h.status === 'empty' || !h.athleteName) {
    return renderShell(
      <>
        {header}
        <EmptyState
          icon="medkit-outline"
          title="Health profile unavailable"
          message="This athlete is not available in your roster or does not have a visible health record."
          actionLabel="Back to roster"
          onPressAction={() => router.back()}
        />
      </>,
    );
  }

  return renderShell(
    <>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={h.refreshing} onRefresh={h.onRefresh} />}
      >
        <SurfaceCard style={[styles.summaryCard, { borderColor: colors.border }]}>
          <Row justify="between" align="center" gap="md">
            <View style={styles.summaryCopy}>
              <ThemedText type="defaultSemiBold">Coach view</ThemedText>
              <ThemedText style={{ color: colors.muted }}>
                Shared injuries, recovery notes, and current return-to-play status only. Family-only
                notes stay outside this coach view unless they are needed for safety or a delivery
                handoff.
              </ThemedText>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: withAlpha(colors.tint, 0.08) }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.tint} />
            </View>
          </Row>
        </SurfaceCard>

        <HealthStatusCard
          colors={colors}
          injuries={h.injuries}
          activeCount={h.activeCount}
          avgRecovery={h.averageRecovery}
        />

        <SurfaceCard style={[styles.actionsCard, { borderColor: colors.border }]}>
          <Row gap="sm" wrap>
            <Button
              onPress={h.handleOpenEmergency}
              variant="outline"
              style={styles.actionButton}
              label="Emergency Info"
            />
          </Row>
        </SurfaceCard>

        {h.timelineInjuries.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">Shared Injury Timeline</ThemedText>
            <ThemedText style={[styles.sectionCopy, { color: colors.muted }]}>
              Open a record to review recovery notes or update status.
            </ThemedText>
            {h.timelineInjuries.map((injury) => (
              <InjuryCard key={injury.id} injury={injury} onPress={() => h.handleOpenInjury(injury)} />
            ))}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
            </View>
            <ThemedText type="defaultSemiBold">No shared injuries</ThemedText>
            <ThemedText style={[styles.emptyCopy, { color: colors.muted }]}>
              This athlete currently has no coach-visible injury records.
            </ThemedText>
          </SurfaceCard>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  summaryBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
  },
  actionButton: {
    minWidth: 160,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionCopy: {
    ...Typography.bodySmall,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: Radii.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
