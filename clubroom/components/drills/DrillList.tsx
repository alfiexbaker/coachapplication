/**
 * DrillList Component
 *
 * Renders a list of drills with optional filtering by category.
 * Supports both drill library and assignment views.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AssignmentCard } from './AssignmentCard';
import { DrillCard } from './DrillCard';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { Drill, AssignedDrill } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { DrillSectionHeader } from './drill-list-sections';
export type { DrillSectionHeaderProps } from './drill-list-sections';

interface DrillListProps {
  drills?: Drill[];
  assignments?: AssignedDrill[];
  onDrillPress?: (drill: Drill) => void;
  onAssignmentPress?: (assignment: AssignedDrill) => void;
  onAssignmentComplete?: (
    assignment: AssignedDrill,
    completion?: { evidenceVideoUri?: string; notes?: string },
  ) => void;
  compact?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  showAssignmentCount?: boolean;
}

export function DrillList({
  drills,
  assignments,
  onDrillPress,
  onAssignmentPress,
  onAssignmentComplete,
  compact = false,
  loading = false,
  emptyMessage = 'No drills found',
  emptyDescription = 'Check back later for new drills.',
  onEmptyAction,
  emptyActionLabel = 'Create Drill',
  showAssignmentCount = false,
}: DrillListProps) {
  const { colors: palette } = useTheme();

  const isAssignmentMode = Boolean(assignments);
  const items = isAssignmentMode ? assignments : drills;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading drills...
        </ThemedText>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons
            name={isAssignmentMode ? 'clipboard-outline' : 'football-outline'}
            size={48}
            color={palette.tint}
          />
        </View>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          {emptyMessage}
        </ThemedText>
        <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
          {emptyDescription}
        </ThemedText>
        {onEmptyAction && (
          <Button onPress={onEmptyAction} style={styles.emptyButton}>
            {emptyActionLabel}
          </Button>
        )}
      </Animated.View>
    );
  }

  return (
    <View style={styles.list}>
      {isAssignmentMode
        ? (assignments as AssignedDrill[]).map((assignment, index) => (
            <Animated.View key={assignment.id} entering={FadeInDown.delay(index * 50).springify()}>
              <AssignmentCard
                assignment={assignment}
                onPress={() => onAssignmentPress?.(assignment)}
                onComplete={(completion) => onAssignmentComplete?.(assignment, completion)}
                compact={compact}
              />
            </Animated.View>
          ))
        : (drills as Drill[]).map((drill, index) => (
            <Animated.View key={drill.id} entering={FadeInDown.delay(index * 50).springify()}>
              <DrillCard
                drill={drill}
                onPress={() => onDrillPress?.(drill)}
                compact={compact}
                showAssignmentCount={showAssignmentCount}
              />
            </Animated.View>
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  loadingContainer: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: scaleFont(15) },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyDescription: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: { marginTop: Spacing.sm },
});
