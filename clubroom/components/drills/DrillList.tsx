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
import { Colors, Spacing } from '@/constants/theme';
import type { Drill, AssignedDrill, DrillCategory } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

interface DrillListProps {
  /** List of drills to display (for library view) */
  drills?: Drill[];
  /** List of assignments to display (for athlete view) */
  assignments?: AssignedDrill[];
  /** Callback when a drill is pressed */
  onDrillPress?: (drill: Drill) => void;
  /** Callback when an assignment is pressed */
  onAssignmentPress?: (assignment: AssignedDrill) => void;
  /** Callback when assignment completion is toggled */
  onAssignmentComplete?: (assignment: AssignedDrill) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether data is loading */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state action */
  onEmptyAction?: () => void;
  /** Empty state action label */
  emptyActionLabel?: string;
  /** Whether to show assignment count on drill cards */
  showAssignmentCount?: boolean;
}

/**
 * List component for rendering drills or assignments.
 */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Determine which list to render
  const isAssignmentMode = Boolean(assignments);
  const items = isAssignmentMode ? assignments : drills;

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading drills...
        </ThemedText>
      </View>
    );
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.emptyContainer}
      >
        <View style={[styles.emptyIcon, { backgroundColor: `${palette.tint}15` }]}>
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

  // Render list
  return (
    <View style={styles.list}>
      {isAssignmentMode
        ? // Render assignments
          (assignments as AssignedDrill[]).map((assignment, index) => (
            <Animated.View
              key={assignment.id}
              entering={FadeInDown.delay(index * 50).springify()}
            >
              <AssignmentCard
                assignment={assignment}
                onPress={() => onAssignmentPress?.(assignment)}
                onComplete={() => onAssignmentComplete?.(assignment)}
                compact={compact}
              />
            </Animated.View>
          ))
        : // Render drills
          (drills as Drill[]).map((drill, index) => (
            <Animated.View
              key={drill.id}
              entering={FadeInDown.delay(index * 50).springify()}
            >
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

/**
 * Section header for grouping drills by category
 */
interface DrillSectionHeaderProps {
  /** Category to display */
  category: DrillCategory;
  /** Number of items in this section */
  count: number;
}

export function DrillSectionHeader({ category, count }: DrillSectionHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Category info mapping
  const categoryInfo: Record<DrillCategory, { label: string; icon: string; color: string }> = {
    WARMUP: { label: 'Warm-up', icon: 'flame', color: '#F59E0B' },
    TECHNIQUE: { label: 'Technique', icon: 'football', color: '#3B82F6' },
    FITNESS: { label: 'Fitness', icon: 'fitness', color: '#10B981' },
    COOLDOWN: { label: 'Cool-down', icon: 'snow', color: '#6366F1' },
    TACTICAL: { label: 'Tactical', icon: 'bulb', color: '#8B5CF6' },
  };

  const info = categoryInfo[category];

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: `${info.color}20` }]}>
          <Ionicons
            name={info.icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={info.color}
          />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {info.label}
        </ThemedText>
      </View>
      <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
        {count} {count === 1 ? 'drill' : 'drills'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: scaleFont(15),
  },
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
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  sectionCount: {
    fontSize: scaleFont(13),
  },
});
