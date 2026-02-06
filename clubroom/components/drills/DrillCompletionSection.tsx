/**
 * DrillCompletionSection
 *
 * Provides the completion controls for a drill: optional feedback input,
 * the "Mark as Complete" button, and the "Mark as Incomplete" undo action.
 */

import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrillCompletionSectionProps {
  isCompleted: boolean;
  completing: boolean;
  feedback: string;
  showFeedbackInput: boolean;
  onFeedbackChange: (text: string) => void;
  onShowFeedbackInput: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrillCompletionSectionInner({
  isCompleted,
  completing,
  feedback,
  showFeedbackInput,
  onFeedbackChange,
  onShowFeedbackInput,
  onComplete,
  onUncomplete,
}: DrillCompletionSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (isCompleted) {
    return (
      <View style={styles.undoSection}>
        <Clickable onPress={onUncomplete} style={styles.undoButton}>
          <Ionicons name="arrow-undo-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.undoText, { color: palette.muted }]}>
            Mark as incomplete
          </ThemedText>
        </Clickable>
      </View>
    );
  }

  return (
    <View style={[styles.completionSection, { borderTopColor: palette.border }]}>
      {/* Feedback input (optional) */}
      {showFeedbackInput ? (
        <View style={styles.feedbackInputContainer}>
          <ThemedText style={[styles.feedbackLabel, { color: palette.muted }]}>
            Add feedback (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.feedbackInput,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="How did it go? Any notes for your coach..."
            placeholderTextColor={palette.muted}
            value={feedback}
            onChangeText={onFeedbackChange}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      ) : (
        <Clickable onPress={onShowFeedbackInput} style={styles.addFeedbackButton}>
          <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.addFeedbackText, { color: palette.tint }]}>
            Add feedback with completion
          </ThemedText>
        </Clickable>
      )}

      <Button
        onPress={onComplete}
        disabled={completing}
        style={styles.completeButton}
      >
        {completing ? 'Marking Complete...' : 'Mark as Complete'}
      </Button>
    </View>
  );
}

export const DrillCompletionSection = React.memo(DrillCompletionSectionInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  completionSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  feedbackInputContainer: {
    marginBottom: Spacing.md,
  },
  feedbackLabel: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
    marginBottom: Spacing.xs,
  },
  feedbackInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  addFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
  },
  addFeedbackText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  completeButton: {
    marginTop: Spacing.xs,
  },
  undoSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  undoText: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
});
