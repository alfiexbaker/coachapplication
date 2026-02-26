import { useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  type SetByRole,
  type Milestone,
  type GoalData,
  type GoalEditorProps,
  SET_BY_OPTIONS,
  suggestedGoalsForAge,
} from './goal-editor-helpers';
import { ProgressSection, MilestonesSection, SuggestionsSection } from './goal-editor-sections';
import { Row } from '@/components/primitives';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export type { SetByRole, Milestone, GoalData, GoalEditorProps };

// ─── Component ──────────────────────────────────────────────────────────────

export function GoalEditor({ initialData, athleteAge, onSave }: GoalEditorProps) {
  const { colors: palette } = useTheme();

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
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m)));
  }, []);

  const handleRemoveMilestone = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a goal title.');
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), setBy, progress, milestones });
  }, [title, description, setBy, progress, milestones, onSave]);

  const handlePickSuggestion = useCallback((suggestion: string) => {
    setTitle(suggestion);
  }, []);

  return (
    <View style={styles.container}>
      {/* Title + Description + Set By */}
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

            maxLength={100}
          />

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

            maxLength={500}
          />

        <ThemedText style={[styles.label, { color: palette.foreground }]}>Set By</ThemedText>
        <Row style={styles.roleRow}>
          {SET_BY_OPTIONS.map((opt) => {
            const isActive = setBy === opt.value;
            return (
              <Clickable
                key={opt.value}
                onPress={() => setSetBy(opt.value)}
                accessibilityLabel={`Set by ${opt.label}`}
              >
                <Row
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
                </Row>
              </Clickable>
            );
          })}
        </Row>
      </SurfaceCard>

      <ProgressSection progress={progress} onProgressChange={setProgress} />

      <MilestonesSection
        milestones={milestones}
        newMilestone={newMilestone}
        onNewMilestoneChange={setNewMilestone}
        onAddMilestone={handleAddMilestone}
        onToggleMilestone={handleToggleMilestone}
        onRemoveMilestone={handleRemoveMilestone}
      />

      <SuggestionsSection
        suggestions={suggestions}
        athleteAge={athleteAge}
        onPickSuggestion={handlePickSuggestion}
      />

      {/* Save */}
      <Clickable onPress={handleSave} accessibilityLabel="Save goal">
        <View style={[styles.saveButton, { backgroundColor: palette.tint }]}>
          <ThemedText style={[styles.saveText, { color: palette.surface }]}>Save Goal</ThemedText>
        </View>
      </Clickable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  label: { ...Typography.bodySemiBold },
  input: {
    height: Components.input.height,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
  multilineInput: { height: 88, paddingVertical: Spacing.sm },
  roleRow: { gap: Spacing.xs },
  roleChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: Spacing.xs / 2,
  },
  roleLabel: { ...Typography.small },
  saveButton: {
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...Typography.bodySemiBold },
});
