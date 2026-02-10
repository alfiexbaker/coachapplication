/**
 * ComparisonTable Component
 *
 * Displays a side-by-side comparison of 2-3 coaches.
 * Highlights best values and provides quick booking actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { comparisonService } from '@/services/comparison-service';
import type { CoachComparison, ComparisonCriteria } from '@/constants/types';
import { CoachColumn } from './CoachColumn';

interface ComparisonTableProps {
  coachIds?: string[];
  onCoachRemoved?: (coachId: string) => void;
}

export function ComparisonTable({ coachIds, onCoachRemoved }: ComparisonTableProps) {
  const { colors: palette } = useTheme();

  const [coaches, setCoaches] = useState<CoachComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparisonData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let data: CoachComparison[] = [];
    if (coachIds && coachIds.length > 0) {
      const comparisonResult = await comparisonService.getComparisonData(coachIds);
      if (!comparisonResult.success) {
        setError(comparisonResult.error.message);
        setIsLoading(false);
        return;
      }
      data = comparisonResult.data;
    } else {
      const stateResult = await comparisonService.getComparisonState();
      if (!stateResult.success) {
        setError(stateResult.error.message);
        setIsLoading(false);
        return;
      }
      data = stateResult.data.coaches;
    }
    setCoaches(data);
    setIsLoading(false);
  }, [coachIds]);

  useEffect(() => {
    void loadComparisonData();
  }, [loadComparisonData]);

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
        setError(removeResult.error.message);
        return;
      }
      setCoaches((prev) => prev.filter((c) => c.coachId !== coachId));
      onCoachRemoved?.(coachId);
    },
    [onCoachRemoved]
  );

  const handleBook = useCallback((coachId: string) => {
    router.push(Routes.bookSessionType(coachId));
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading comparison...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
      </View>
    );
  }

  if (coaches.length === 0) {
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
  loadingText: { ...Typography.bodySmall, marginTop: Spacing.sm },
  errorText: { ...Typography.bodySmall, textAlign: 'center' },
  emptyHint: { ...Typography.bodySmall, textAlign: 'center',
    marginTop: Spacing.xs },
});
