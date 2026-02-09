import { memo, useCallback } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type Milestone, PROGRESS_STEPS } from './goal-editor-helpers';

// ─── Progress Section ───────────────────────────────────────────────────────

interface ProgressSectionProps {
  progress: number;
  onProgressChange: (step: number) => void;
}

export const ProgressSection = memo(function ProgressSection({ progress, onProgressChange }: ProgressSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.section}>
      <ThemedText style={[styles.label, { color: palette.foreground }]}>
        Progress: {progress}%
      </ThemedText>

      <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSecondary }]}>
        <View style={[styles.progressFill, { backgroundColor: palette.success, width: `${progress}%` }]} />
      </View>

      <View style={styles.sliderRow}>
        {PROGRESS_STEPS.map((step) => (
          <Clickable key={step} onPress={() => onProgressChange(step)} accessibilityLabel={`${step}%`}>
            <View style={[styles.stepDot, { backgroundColor: step <= progress ? palette.success : palette.surfaceSecondary }]} />
          </Clickable>
        ))}
      </View>
    </SurfaceCard>
  );
});

// ─── Milestones Section ─────────────────────────────────────────────────────

interface MilestonesSectionProps {
  milestones: Milestone[];
  newMilestone: string;
  onNewMilestoneChange: (text: string) => void;
  onAddMilestone: () => void;
  onToggleMilestone: (id: string) => void;
  onRemoveMilestone: (id: string) => void;
}

export const MilestonesSection = memo(function MilestonesSection({
  milestones,
  newMilestone,
  onNewMilestoneChange,
  onAddMilestone,
  onToggleMilestone,
  onRemoveMilestone,
}: MilestonesSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.section}>
      <ThemedText style={[styles.label, { color: palette.foreground }]}>Milestones</ThemedText>

      {milestones.map((ms) => (
        <View key={ms.id} style={styles.milestoneRow}>
          <Clickable onPress={() => onToggleMilestone(ms.id)} accessibilityLabel={`Toggle ${ms.title}`}>
            <Ionicons
              name={ms.completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={Components.icon.lg}
              color={ms.completed ? palette.success : palette.muted}
            />
          </Clickable>
          <ThemedText
            style={[styles.milestoneText, { color: palette.foreground }, ms.completed ? styles.milestoneCompleted : undefined]}
            numberOfLines={1}
          >
            {ms.title}
          </ThemedText>
          <Clickable onPress={() => onRemoveMilestone(ms.id)} accessibilityLabel={`Remove ${ms.title}`}>
            <Ionicons name="close-circle-outline" size={Components.icon.md} color={palette.error} />
          </Clickable>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.addInput, { color: palette.foreground, backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}
          value={newMilestone}
          onChangeText={onNewMilestoneChange}
          placeholder="Add a milestone"
          placeholderTextColor={palette.muted}
          onSubmitEditing={onAddMilestone}
          returnKeyType="done"
        />
        <Clickable onPress={onAddMilestone} accessibilityLabel="Add milestone">
          <View style={[styles.addButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="add" size={Components.icon.md} color={palette.surface} />
          </View>
        </Clickable>
      </View>
    </SurfaceCard>
  );
});

// ─── Suggestions Section ────────────────────────────────────────────────────

interface SuggestionsSectionProps {
  suggestions: string[];
  athleteAge?: number;
  onPickSuggestion: (suggestion: string) => void;
}

export const SuggestionsSection = memo(function SuggestionsSection({ suggestions, athleteAge, onPickSuggestion }: SuggestionsSectionProps) {
  const { colors: palette } = useTheme();

  if (suggestions.length === 0) return null;

  return (
    <SurfaceCard style={styles.section}>
      <ThemedText style={[styles.label, { color: palette.foreground }]}>
        Suggested goals for age {athleteAge}
      </ThemedText>
      {suggestions.map((sug) => (
        <Clickable key={sug} onPress={() => onPickSuggestion(sug)} accessibilityLabel={`Use suggestion: ${sug}`}>
          <View style={[styles.suggestionRow, { borderColor: palette.border }]}>
            <Ionicons name="bulb-outline" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[styles.suggestionText, { color: palette.foreground }]}>{sug}</ThemedText>
          </View>
        </Clickable>
      ))}
    </SurfaceCard>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  label: { ...Typography.bodySemiBold },
  input: { height: Components.input.height, borderRadius: Radii.md, borderWidth: 1, paddingHorizontal: Spacing.sm, ...Typography.body },
  progressTrack: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: Radii.xs },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xs / 2 },
  stepDot: { width: 16, height: 16, borderRadius: Radii.sm },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  milestoneText: { ...Typography.body, flex: 1 },
  milestoneCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  addRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  addInput: { flex: 1 },
  addButton: { width: Components.button.height, height: Components.button.height, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionText: { ...Typography.body, flex: 1 },
});
