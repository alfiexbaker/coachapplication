/**
 * Compare Screen
 *
 * Main comparison view that displays the user's selected coaches side-by-side.
 * Allows removing coaches and quick booking from the comparison.
 */

import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ComparisonTable } from '@/components/compare/ComparisonTable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { comparisonService } from '@/services/comparison-service';

export default function CompareScreen() {
  const { colors: palette } = useTheme();

  const [coachCount, setCoachCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const count = await comparisonService.getComparisonCount();
      setCoachCount(count);
    };
    void loadCount();
  }, [refreshKey]);

  const handleCoachRemoved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClearAll = useCallback(async () => {
    await comparisonService.clearComparison();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoachCount(0);
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all coaches from comparison"
                onPress={handleClearAll}
                style={styles.headerButton}
              >
                <ThemedText style={[styles.headerButtonText, { color: palette.error }]}>
                  Clear All
                </ThemedText>
              </Pressable>
            ) : null }}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        {/* Status bar */}
        <View style={[styles.statusBar, { borderBottomColor: palette.border }]}>
          <View style={styles.statusInfo}>
            <Ionicons name="git-compare" size={18} color={palette.icon} />
            <ThemedText style={styles.statusText}>
              {coachCount === 0
                ? 'No coaches selected'
                : coachCount === 1
                ? '1 coach selected'
                : `${coachCount} coaches selected`}
            </ThemedText>
          </View>
          {coachCount < comparisonService.getMaxCoaches() && coachCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add more coaches to comparison"
              onPress={handleAddMore}
              style={({ pressed }) => [
                styles.addMoreButton,
                {
                  backgroundColor: pressed ? palette.surfaceSecondary : 'transparent',
                  borderColor: palette.border },
              ]}
            >
              <Ionicons name="add" size={16} color={palette.tint} />
              <ThemedText style={[styles.addMoreText, { color: palette.tint }]}>
                Add More
              </ThemedText>
            </Pressable>
          )}
        </View>

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse coaches"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.browseButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint },
              ]}
            >
              <Ionicons name="search" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.browseButtonText, { color: palette.onPrimary }]}>Browse Coaches</ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs },
  headerButtonText: {
    ...Typography.bodySemiBold },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1 },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  statusText: {
    ...Typography.bodySmallSemiBold },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1 },
  addMoreText: {
    ...Typography.smallSemiBold },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md },
  emptyTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center' },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280 },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button },
  browseButtonText: {
    ...Typography.bodySemiBold } });