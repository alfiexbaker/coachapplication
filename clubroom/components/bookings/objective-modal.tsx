/**
 * ObjectiveModal — Modal for adding or editing a football objective.
 *
 * Contains skill grid selector, goal text input, and target sessions input.
 */

import React, { memo } from 'react';
import { Modal, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { FOOTBALL_OBJECTIVES } from '@/hooks/use-objectives';
import type { FootballObjective } from '@/constants/types';

interface ObjectiveModalProps {
  visible: boolean;
  isEditing: boolean;
  selectedSkill: FootballObjective;
  onSelectSkill: (skill: FootballObjective) => void;
  note: string;
  onChangeNote: (text: string) => void;
  targetSessions: string;
  onChangeTargetSessions: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const ObjectiveModal = memo(function ObjectiveModal({
  visible,
  isEditing,
  selectedSkill,
  onSelectSkill,
  note,
  onChangeNote,
  targetSessions,
  onChangeTargetSessions,
  onSave,
  onClose,
}: ObjectiveModalProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Row
          justify="between"
          align="center"
          paddingH="lg"
          paddingV="md"
          style={{ borderBottomWidth: 1, borderBottomColor: palette.border }}
        >
          <Clickable onPress={onClose} accessibilityLabel="Close modal">
            <Ionicons name="close" size={28} color={palette.foreground} />
          </Clickable>
          <ThemedText type="subtitle">{isEditing ? 'Edit Goal' : 'New Goal'}</ThemedText>
          <Clickable onPress={onSave} accessibilityLabel="Save goal">
            <ThemedText style={[styles.saveButton, { color: palette.tint }]}>Save</ThemedText>
          </Clickable>
        </Row>

        <Column gap="lg" padding="lg">
          {/* Skill Selection */}
          <Column gap="sm">
            <ThemedText type="defaultSemiBold">Skill</ThemedText>
            <Row wrap gap="xs">
              {FOOTBALL_OBJECTIVES.map((skill) => (
                <Clickable
                  key={skill}
                  onPress={() => onSelectSkill(skill)}
                  accessibilityLabel={`Select ${skill}`}
                  style={[
                    styles.skillChip,
                    {
                      backgroundColor: selectedSkill === skill ? palette.tint : palette.card,
                      borderColor: selectedSkill === skill ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.skillText,
                      selectedSkill === skill && { color: palette.onPrimary },
                    ]}
                  >
                    {skill}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>
          </Column>

          {/* Goal Note */}
          <Column gap="sm">
            <ThemedText type="defaultSemiBold">Goal</ThemedText>
            <TextInput
              value={note}
              onChangeText={onChangeNote}
              placeholder="What do you want to improve?"
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                styles.textInput,
                styles.textArea,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  color: palette.foreground,
                },
              ]}

            maxLength={500}
          />
          </Column>

          {/* Target Sessions */}
          <Column gap="sm">
            <ThemedText type="defaultSemiBold">Target Sessions</ThemedText>
            <TextInput
              value={targetSessions}
              onChangeText={onChangeTargetSessions}
              placeholder="10"
              keyboardType="number-pad"
              placeholderTextColor={palette.muted}
              style={[
                styles.textInput,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  color: palette.foreground,
                },
              ]}

            maxLength={10}
          />
          </Column>
        </Column>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButton: {
    ...Typography.subheading,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  skillText: {
    ...Typography.bodySmallSemiBold,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
});
