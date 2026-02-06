/**
 * GoalEditor Component
 *
 * Create or edit a development goal with title, description, "set by"
 * selector (coach / parent / athlete), manual progress slider, milestones
 * management, suggested goals, and a progress bar visualisation.
 */

import { useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetByRole = 'coach' | 'parent' | 'athlete';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalData {
  title: string;
  description: string;
  setBy: SetByRole;
  progress: number;
  milestones: Milestone[];
}

export interface GoalEditorProps {
  /** Pre-populated goal data when editing */
  initialData?: Partial<GoalData>;
  /** Athlete age — used for suggested goals */
  athleteAge?: number;
  /** Called when the user taps Save */
  onSave: (data: GoalData) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SET_BY_OPTIONS: { value: SetByRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'coach', label: 'Coach', icon: 'school-outline' },
  { value: 'parent', label: 'Parent', icon: 'people-outline' },
  { value: 'athlete', label: 'Athlete', icon: 'person-outline' },
];

function suggestedGoalsForAge(age?: number): string[] {
  if (!age) return [];
  if (age <= 8) {
    return [
      'Learn to dribble with both feet',
      'Complete 10 passes in a row',
      'Practise basic stretching routine',
    ];
  }
  if (age <= 12) {
    return [
      'Improve weak-foot passing accuracy',
      'Run a full training session without stopping',
      'Score from a set piece in a match',
      'Master 3 new skill moves',
    ];
  }
  return [
    'Increase sprint speed by 5%',
    'Complete advanced tactical drills',
    'Lead a warm-up session independently',
    'Achieve 90% attendance this term',
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalEditor({ initialData, athleteAge, onSave }: GoalEditorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [setBy, setSetBy] = useState<SetByRole>(initialData?.setBy ?? 'coach');
  const [progress, setProgress] = useState(initialData?.progress ?? 0);
  const [milestones, setMilestones] = useState<Milestone[]>(initialData?.milestones ?? []);
  const [newMilestone, setNewMilestone] = useState('');

  const suggestions = suggestedGoalsForAge(athleteAge);

  const handleAddMilestone = useCallback(() => {
    const trimmed = newMilestone.trim();
    if (!trimmed) return;
    setMilestones((prev) => [
      ...prev,
      { id: `ms_${Date.now()}`, title: trimmed, completed: false },
    ]);
    setNewMilestone('');
  }, [newMilestone]);

  const handleToggleMilestone = useCallback((id: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m)),
    );
  }, []);

  const handleRemoveMilestone = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a goal title.');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      setBy,
      progress,
      milestones,
    });
  }, [title, description, setBy, progress, milestones, onSave]);

  const handlePickSuggestion = useCallback((suggestion: string) => {
    setTitle(suggestion);
  }, []);

  // Coarse slider steps: 0, 10, 20, ... 100
  const progressSteps = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <View style={styles.container}>
      {/* Title input */}
      <SurfaceCard style={styles.section}>
        <ThemedText style={[styles.label, { color: palette.foreground }]}>Goal Title</ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              color: palette.foreground,
              backgroundColor: palette.surfaceSecondary,
              borderColor: palette.border,
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Improve weak-foot passing"
          placeholderTextColor={palette.muted}
        />

        {/* Description */}
        <ThemedText style={[styles.label, { color: palette.foreground }]}>Description</ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.multilineInput,
            {
              color: palette.foreground,
              backgroundColor: palette.surfaceSecondary,
              borderColor: palette.border,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="What does success look like?"
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
        />

        {/* Set by */}
        <ThemedText style={[styles.label, { color: palette.foreground }]}>Set By</ThemedText>
        <View style={styles.roleRow}>
          {SET_BY_OPTIONS.map((opt) => {
            const isActive = setBy === opt.value;
            return (
              <Clickable
                key={opt.value}
                onPress={() => setSetBy(opt.value)}
                accessibilityLabel={`Set by ${opt.label}`}
              >
                <View
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: isActive ? palette.tint : palette.surfaceSecondary,
                      borderColor: isActive ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={Components.icon.sm}
                    color={isActive ? palette.surface : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.roleLabel,
                      { color: isActive ? palette.surface : palette.foreground },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </View>
              </Clickable>
            );
          })}
        </View>
      </SurfaceCard>

      {/* Progress tracking */}
      <SurfaceCard style={styles.section}>
        <ThemedText style={[styles.label, { color: palette.foreground }]}>
          Progress: {progress}%
        </ThemedText>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSecondary }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: palette.success, width: `${progress}%` },
            ]}
          />
        </View>

        {/* Step buttons for manual slider */}
        <View style={styles.sliderRow}>
          {progressSteps.map((step) => (
            <Clickable
              key={step}
              onPress={() => setProgress(step)}
              accessibilityLabel={`${step}%`}
            >
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step <= progress ? palette.success : palette.surfaceSecondary,
                  },
                ]}
              />
            </Clickable>
          ))}
        </View>
      </SurfaceCard>

      {/* Milestones */}
      <SurfaceCard style={styles.section}>
        <ThemedText style={[styles.label, { color: palette.foreground }]}>Milestones</ThemedText>

        {milestones.map((ms) => (
          <View key={ms.id} style={styles.milestoneRow}>
            <Clickable
              onPress={() => handleToggleMilestone(ms.id)}
              accessibilityLabel={`Toggle ${ms.title}`}
            >
              <Ionicons
                name={ms.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={Components.icon.lg}
                color={ms.completed ? palette.success : palette.muted}
              />
            </Clickable>
            <ThemedText
              style={[
                styles.milestoneText,
                { color: palette.foreground },
                ms.completed ? styles.milestoneCompleted : undefined,
              ]}
              numberOfLines={1}
            >
              {ms.title}
            </ThemedText>
            <Clickable
              onPress={() => handleRemoveMilestone(ms.id)}
              accessibilityLabel={`Remove ${ms.title}`}
            >
              <Ionicons name="close-circle-outline" size={Components.icon.md} color={palette.error} />
            </Clickable>
          </View>
        ))}

        {/* Add milestone input */}
        <View style={styles.addRow}>
          <TextInput
            style={[
              styles.input,
              styles.addInput,
              {
                color: palette.foreground,
                backgroundColor: palette.surfaceSecondary,
                borderColor: palette.border,
              },
            ]}
            value={newMilestone}
            onChangeText={setNewMilestone}
            placeholder="Add a milestone"
            placeholderTextColor={palette.muted}
            onSubmitEditing={handleAddMilestone}
            returnKeyType="done"
          />
          <Clickable onPress={handleAddMilestone} accessibilityLabel="Add milestone">
            <View style={[styles.addButton, { backgroundColor: palette.tint }]}>
              <Ionicons name="add" size={Components.icon.md} color={palette.surface} />
            </View>
          </Clickable>
        </View>
      </SurfaceCard>

      {/* Suggested goals */}
      {suggestions.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[styles.label, { color: palette.foreground }]}>
            Suggested goals for age {athleteAge}
          </ThemedText>
          {suggestions.map((sug) => (
            <Clickable
              key={sug}
              onPress={() => handlePickSuggestion(sug)}
              accessibilityLabel={`Use suggestion: ${sug}`}
            >
              <View style={[styles.suggestionRow, { borderColor: palette.border }]}>
                <Ionicons name="bulb-outline" size={Components.icon.sm} color={palette.warning} />
                <ThemedText style={[styles.suggestionText, { color: palette.foreground }]}>
                  {sug}
                </ThemedText>
              </View>
            </Clickable>
          ))}
        </SurfaceCard>
      )}

      {/* Save */}
      <Clickable onPress={handleSave} accessibilityLabel="Save goal">
        <View style={[styles.saveButton, { backgroundColor: palette.tint }]}>
          <ThemedText style={[styles.saveText, { color: palette.surface }]}>Save Goal</ThemedText>
        </View>
      </Clickable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  input: {
    height: Components.input.height,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
  multilineInput: {
    height: 88,
    paddingVertical: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: Spacing.xs / 2,
  },
  roleLabel: {
    ...Typography.small,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: Radii.xs,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs / 2,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  milestoneText: {
    ...Typography.body,
    flex: 1,
  },
  milestoneCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    width: Components.button.height,
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    ...Typography.body,
    flex: 1,
  },
  saveButton: {
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...Typography.bodySemiBold,
  },
});
