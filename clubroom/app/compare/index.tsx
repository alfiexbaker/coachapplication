/**
 * Compare Screen
 *
 * Main comparison view that displays the user's selected coaches side-by-side.
 * Allows removing coaches and quick booking from the comparison.
 */

import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { ComparisonTable } from '@/components/compare/ComparisonTable';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { comparisonService } from '@/services/comparison-service';

export default function CompareScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  const [refreshKey, setRefreshKey] = useState(0);
  const {
    data: coachCountData,
    status,
    error,
    retry,
    showLoadingState,
  } = useScreen<number>({
    load: async () => {
      const countResult = await comparisonService.getComparisonCount();
      return countResult.success
        ? ok(countResult.data)
        : {
            success: false,
            error: countResult.error,
          };
    },
    deps: [refreshKey],
    isEmpty: () => false,
    loadingStrategy: 'warm-first',
    dataKey: 'compare-count',
  });
  const coachCount = coachCountData ?? 0;

  const handleCoachRemoved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClearAll = useCallback(async () => {
    const clearResult = await comparisonService.clearComparison();
    if (!clearResult.success) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAddMore = useCallback(() => {
    router.back();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Compare Coaches',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerRight: () =>
            coachCount > 0 ? (
              <Clickable
                accessibilityLabel="Clear all coaches from comparison"
                onPress={handleClearAll}
                style={styles.headerButton}
              >
                <ThemedText style={[styles.headerButtonText, { color: palette.error }]}>
                  Clear All
                </ThemedText>
              </Clickable>
            ) : null,
        }}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        {showLoadingState ? (
          <LoadingState variant="detail" />
        ) : status === 'error' ? (
          <ErrorState
            message={error?.message ?? 'Failed to load compared coaches.'}
            onRetry={retry}
          />
        ) : (
          <>
            {/* Status bar */}
            <Row style={[styles.statusBar, { borderBottomColor: palette.border }]}>
              <Row style={styles.statusInfo}>
                <Ionicons name="git-compare" size={18} color={palette.icon} />
                <ThemedText style={styles.statusText}>
                  {coachCount === 0
                    ? 'No coaches selected'
                    : coachCount === 1
                      ? '1 coach selected'
                      : `${coachCount} coaches selected`}
                </ThemedText>
              </Row>
              {coachCount < comparisonService.getMaxCoaches() && coachCount > 0 && (
                <Clickable
                  accessibilityLabel="Add more coaches to comparison"
                  onPress={handleAddMore}
                  style={({ pressed }) => [
                    styles.addMoreButton,
                    {
                      backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Row align="center" gap="xxs">
                    <Ionicons name="add" size={16} color={palette.tint} />
                    <ThemedText style={[styles.addMoreText, { color: palette.tint }]}>
                      Add More
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </Row>

            {/* Comparison table */}
            <ComparisonTable key={refreshKey} onCoachRemoved={handleCoachRemoved} />

            {/* Empty state */}
            {coachCount === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: palette.surfaceSecondary }]}>
                  <Ionicons name="git-compare" size={48} color={palette.muted} />
                </View>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No Coaches to Compare
                </ThemedText>
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  Browse coaches and tap the compare button to add them to your comparison list
                </ThemedText>
                <Clickable
                  accessibilityLabel="Browse coaches"
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.browseButton,
                    {
                      backgroundColor: pressed ? palette.tintPressed : palette.tint,
                    },
                  ]}
                >
                  <Row align="center" gap="xs">
                    <Ionicons name="search" size={18} color={palette.onPrimary} />
                    <ThemedText style={[styles.browseButtonText, { color: palette.onPrimary }]}>
                      Browse Coaches
                    </ThemedText>
                  </Row>
                </Clickable>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headerButtonText: {
    ...Typography.bodySemiBold,
  },
  statusBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmallSemiBold,
  },
  addMoreButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  addMoreText: {
    ...Typography.smallSemiBold,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  browseButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
  },
  browseButtonText: {
    ...Typography.bodySemiBold,
  },
});
