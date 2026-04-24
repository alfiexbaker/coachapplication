/**
 * ComparisonTable Component
 *
 * Displays a side-by-side comparison of 2-3 coaches.
 * Highlights best values and provides quick booking actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { comparisonService } from '@/services/comparison-service';
import type { CoachComparison, ComparisonCriteria } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { err, ok } from '@/types/result';
import { CoachColumn } from './CoachColumn';

interface ComparisonTableProps {
  coachIds?: string[];
  onCoachRemoved?: (coachId: string) => void;
}

export function ComparisonTable({ coachIds, onCoachRemoved }: ComparisonTableProps) {
  const { colors: palette } = useTheme();
  const [removedCoachIds, setRemovedCoachIds] = useState<string[]>([]);
  const coachIdsKey = coachIds?.join(',') ?? 'selected';

  useEffect(() => {
    setRemovedCoachIds([]);
  }, [coachIdsKey]);

  const {
    data,
    status,
    error,
    retry,
    showLoadingState,
  } = useScreen<CoachComparison[]>({
    load: async () => {
      if (coachIds && coachIds.length > 0) {
        const comparisonResult = await comparisonService.getComparisonData(coachIds);
        return comparisonResult.success ? ok(comparisonResult.data) : err(comparisonResult.error);
      }

      const stateResult = await comparisonService.getComparisonState();
      return stateResult.success ? ok(stateResult.data.coaches) : err(stateResult.error);
    },
    deps: [coachIdsKey],
    isEmpty: (value) => value.length === 0,
    loadingStrategy: 'section-skeleton',
    dataKey: coachIdsKey,
  });
  const coaches = useMemo(
    () => (data ?? []).filter((coach) => !removedCoachIds.includes(coach.coachId)),
    [data, removedCoachIds],
  );

  const bestValues = useMemo((): Record<ComparisonCriteria, string | null> => {
    return {
      PRICE: comparisonService.getBestValue(coaches, 'PRICE'),
      RATING: comparisonService.getBestValue(coaches, 'RATING'),
      EXPERIENCE: comparisonService.getBestValue(coaches, 'EXPERIENCE'),
      AVAILABILITY: comparisonService.getBestValue(coaches, 'AVAILABILITY'),
    };
  }, [coaches]);

  const handleRemove = useCallback(
    async (coachId: string) => {
      const removeResult = await comparisonService.removeFromComparison(coachId);
      if (!removeResult.success) {
        return;
      }
      setRemovedCoachIds((current) => [...current, coachId]);
      onCoachRemoved?.(coachId);
    },
    [onCoachRemoved],
  );

  const handleBook = useCallback((coachId: string) => {
    router.push(
      Routes.bookCoach(coachId, {
        source: 'comparison',
      }),
    );
  }, []);

  if (showLoadingState) {
    return (
      <LoadingState variant="card" scope="section" style={styles.loadingState} />
    );
  }

  if (status === 'error') {
    return (
      <ErrorState message={error?.message ?? 'Failed to load comparison.'} onRetry={retry} />
    );
  }

  if (status === 'empty' || coaches.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <ThemedText type="subtitle">No coaches to compare</ThemedText>
        <ThemedText style={[styles.emptyHint, { color: palette.muted }]}>
          Add coaches to your comparison list to see them side by side
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {coaches.map((coach) => (
        <CoachColumn
          key={coach.coachId}
          coach={coach}
          bestValues={bestValues}
          onRemove={handleRemove}
          onBook={handleBook}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loadingState: {
    padding: Spacing.md,
  },
  emptyHint: { ...Typography.bodySmall, textAlign: 'center', marginTop: Spacing.xs },
});
