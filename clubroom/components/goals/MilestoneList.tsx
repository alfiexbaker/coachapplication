/**
 * MilestoneList Component
 *
 * A list of checkable milestones that track progress towards a goal.
 * Supports completing/uncompleting milestones with animations and haptic feedback.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInLeft } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import type { GoalMilestone } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { MilestoneItem, CompactMilestoneList } from './milestone-list-sections';
import { Row } from '@/components/primitives';

interface MilestoneListProps {
  milestones: GoalMilestone[];
  onToggleMilestone?: (milestoneId: string, completed: boolean) => Promise<void> | void;
  onDeleteMilestone?: (milestoneId: string) => Promise<void> | void;
  onAddMilestone?: (title: string) => Promise<void> | void;
  editable?: boolean;
  showAddInput?: boolean;
  loading?: boolean;
  compact?: boolean;
}

export function MilestoneList({
  milestones,
  onToggleMilestone,
  onDeleteMilestone,
  onAddMilestone,
  editable = true,
  showAddInput = false,
  loading = false,
  compact = false,
}: MilestoneListProps) {
  const { colors: palette } = useTheme();

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  const handleToggle = useCallback(
    async (milestone: GoalMilestone) => {
      if (!editable || loading) return;

      if (Platform.OS !== 'web') void Haptics.impactAsync(
        milestone.isCompleted
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      );

      await onToggleMilestone?.(milestone.id, !milestone.isCompleted);
    },
    [editable, loading, onToggleMilestone],
  );

  const handleDelete = useCallback(
    (milestone: GoalMilestone) => {
      if (!editable || loading) return;

      Alert.alert('Delete Milestone', `Are you sure you want to delete "${milestone.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            void onDeleteMilestone?.(milestone.id);
          },
        },
      ]);
    },
    [editable, loading, onDeleteMilestone],
  );

  const handleAddMilestone = useCallback(async () => {
    if (!newMilestoneTitle.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAddMilestone?.(newMilestoneTitle.trim());
      setNewMilestoneTitle('');
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsAdding(false);
    }
  }, [newMilestoneTitle, isAdding, onAddMilestone]);

  if (compact) {
    return <CompactMilestoneList milestones={milestones} />;
  }

  return (
    <View style={styles.container}>
      {sortedMilestones.map((milestone, index) => (
        <MilestoneItem
          key={milestone.id}
          milestone={milestone}
          index={index}
          onToggle={() => handleToggle(milestone)}
          onDelete={onDeleteMilestone ? () => handleDelete(milestone) : undefined}
          editable={editable}
          loading={loading}
        />
      ))}

      {showAddInput && editable && (
        <Animated.View entering={FadeInLeft.springify()} style={styles.addInputContainer}>
          <TextInput
            style={[
              styles.addInput,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Add a milestone..."
            placeholderTextColor={palette.muted}
            value={newMilestoneTitle}
            onChangeText={setNewMilestoneTitle}
            onSubmitEditing={handleAddMilestone}
            returnKeyType="done"
            editable={!isAdding}
          />
          <Clickable
            onPress={handleAddMilestone}
            disabled={!newMilestoneTitle.trim() || isAdding}
            style={[
              styles.addButton,
              {
                backgroundColor: newMilestoneTitle.trim() ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons name={isAdding ? 'hourglass' : 'add'} size={20} color={palette.onPrimary} />
          </Clickable>
        </Animated.View>
      )}

      {milestones.length === 0 && (
        <Row style={[styles.emptyState, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="flag-outline" size={24} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No milestones yet. Add one to track your progress!
          </ThemedText>
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  addInputContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addInput: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    fontSize: scaleFont(15),
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  emptyText: {
    flex: 1,
    fontSize: scaleFont(14),
  },
});
