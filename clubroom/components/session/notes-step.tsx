/**
 * Notes Step — Step 2 of Session Completion Wizard
 *
 * Captures session summary, skills worked on, overall group effort rating,
 * and homework/practice focus for athletes.
 */

import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SESSION_NOTE_FOCUSES } from '@/constants/football-registry';
import Slider from '@react-native-community/slider';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ============================================================================
// TYPES
// ============================================================================

export interface NotesStepProps {
  colors: ThemeColors;
  sessionSummary: string;
  onSessionSummaryChange: (text: string) => void;
  skillsFocused: string[];
  onSkillsFocusedChange: (skills: string[]) => void;
  overallEffort: number;
  onOverallEffortChange: (value: number) => void;
  homework: string;
  onHomeworkChange: (text: string) => void;
  improvements: string;
  onImprovementsChange: (text: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SKILL_OPTIONS = SESSION_NOTE_FOCUSES;
// ============================================================================
// NOTES STEP
// ============================================================================

export const NotesStep = function NotesStep({
  colors,
  sessionSummary,
  onSessionSummaryChange,
  skillsFocused,
  onSkillsFocusedChange,
  overallEffort,
  onOverallEffortChange,
  homework,
  onHomeworkChange,
  improvements,
  onImprovementsChange,
}: NotesStepProps) {
  const handleToggleSkill = (skill: string) => {
    const isSelected = skillsFocused.includes(skill);
    onSkillsFocusedChange(
      isSelected ? skillsFocused.filter((s) => s !== skill) : [...skillsFocused, skill],
    );
  };

  return (
    <>
      {/* Session Notes */}
      <SurfaceCard style={styles.section}>
        <Row align="center" gap="sm" style={styles.sectionHeader}>
          <Ionicons name="document-text" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Session Notes</ThemedText>
        </Row>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="What did you cover in this session? How did it go?"
          placeholderTextColor={colors.muted}
          value={sessionSummary}
          onChangeText={onSessionSummaryChange}
          multiline
          numberOfLines={4}
          accessibilityLabel="Session notes"

            maxLength={500}
          />
      </SurfaceCard>

      {/* Skills Worked On */}
      <SurfaceCard style={styles.section}>
        <Row align="center" gap="sm" style={styles.sectionHeader}>
          <Ionicons name="football" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Skills Worked On</ThemedText>
        </Row>
        <Row wrap gap="xs">
          {SKILL_OPTIONS.map((skill) => {
            const isSelected = skillsFocused.includes(skill);
            return (
              <Clickable
                key={skill}
                style={[
                  styles.skillChip,
                  {
                    backgroundColor: isSelected ? colors.tint : 'transparent',
                    borderColor: isSelected ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => handleToggleSkill(skill)}
                accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${skill} skill`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText
                  style={[
                    styles.skillChipText,
                    { color: isSelected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {skill}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </SurfaceCard>

      {/* Overall Group Effort */}
      <SurfaceCard style={styles.section}>
        <Row align="center" gap="sm" style={styles.sectionHeader}>
          <Ionicons name="fitness" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Overall Group Effort</ThemedText>
        </Row>
        <Row align="center" gap="sm">
          <ThemedText style={[styles.effortLabel, { color: colors.muted }]}>Low</ThemedText>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={overallEffort}
            onValueChange={onOverallEffortChange}
            minimumTrackTintColor={colors.tint}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.tint}
            accessibilityLabel="Overall effort rating"
          />
          <ThemedText style={[styles.effortLabel, { color: colors.muted }]}>High</ThemedText>
        </Row>
        <ThemedText style={[styles.effortValue, { color: colors.tint }]}>
          {overallEffort}/5
        </ThemedText>
      </SurfaceCard>

      {/* Homework / Practice Focus */}
      <SurfaceCard style={styles.section}>
        <Row align="center" gap="sm" style={styles.sectionHeader}>
          <Ionicons name="clipboard" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Homework / Practice Focus</ThemedText>
        </Row>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="What should they practice before next session?"
          placeholderTextColor={colors.muted}
          value={homework}
          onChangeText={onHomeworkChange}
          accessibilityLabel="Homework and practice focus"

            maxLength={100}
          />
      </SurfaceCard>

      {/* Improvement Focus */}
      <SurfaceCard style={styles.section}>
        <Row align="center" gap="sm" style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={colors.tint} />
          <ThemedText type="subtitle">Improvement Focus</ThemedText>
        </Row>
        <TextInput
          style={[
            styles.input,
            styles.multilineInput,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="What should they focus on improving?"
          placeholderTextColor={colors.muted}
          value={improvements}
          onChangeText={onImprovementsChange}
          multiline
          numberOfLines={3}
          accessibilityLabel="Improvement focus"

            maxLength={500}
          />
      </SurfaceCard>
    </>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: 'center',
  },
  skillChipText: {
    ...Typography.smallSemiBold,
  },
  effortLabel: {
    ...Typography.caption,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  effortValue: {
    textAlign: 'center',
    ...Typography.subheading,
  },
});
