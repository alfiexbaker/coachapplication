/**
 * CreateCodeModal — Modal for generating new invite codes.
 *
 * Allows selecting a school, setting custom code text, and max uses.
 */

import React from 'react';
import { Modal, StyleSheet, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { SCHOOL_SEEDS } from '@/constants/school-seeds';
import type { School } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface CreateCodeModalProps {
  visible: boolean;
  selectedSchool: School | null;
  newCodeText: string;
  maxUses: string;
  onClose: () => void;
  onSelectSchool: (school: School | null) => void;
  onChangeCodeText: (text: string) => void;
  onChangeMaxUses: (uses: string) => void;
  onGenerate: () => void;
}

export const CreateCodeModal = function CreateCodeModal({
  visible,
  selectedSchool,
  newCodeText,
  maxUses,
  onClose,
  onSelectSchool,
  onChangeCodeText,
  onChangeMaxUses,
  onGenerate,
}: CreateCodeModalProps) {
  const { colors: palette } = useTheme();
  const currentYear = new Date().getFullYear();

  const handleCodeTextChange = (text: string) => onChangeCodeText(text.toUpperCase());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <SafeAreaView
        style={[styles.modalContainer, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <Row
          justify="between"
          align="center"
          padding="lg"
          style={[styles.modalHeader, { borderBottomColor: withAlpha(palette.border, 0.3) }]}
        >
          <ThemedText type="title">Generate Invite Code</ThemedText>
          <Clickable
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
            style={styles.closeTarget}
          >
            <ThemedText style={[styles.closeButton, { color: palette.muted }]}>Close</ThemedText>
          </Clickable>
        </Row>

        <Column gap="lg" padding="lg">
          <Column gap="sm">
            <ThemedText style={styles.label}>Select School</ThemedText>
            {SCHOOL_SEEDS.map((school) => (
              <Clickable
                key={school.id}
                onPress={() => onSelectSchool(school)}
                style={[
                  styles.schoolOption,
                  {
                    backgroundColor: selectedSchool?.id === school.id ? palette.tint : palette.card,
                    borderColor: palette.border,
                  },
                ]}
                accessibilityLabel={`Select ${school.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedSchool?.id === school.id }}
              >
                <ThemedText
                  style={[
                    styles.schoolOptionText,
                    selectedSchool?.id === school.id && {
                      ...Typography.bodySemiBold,
                      color: palette.onPrimary,
                    },
                  ]}
                >
                  {school.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.schoolOptionSubtext,
                    {
                      color:
                        selectedSchool?.id === school.id
                          ? withAlpha(palette.onPrimary, 0.8)
                          : palette.muted,
                    },
                  ]}
                >
                  {school.city}, {school.state} {'\u2022'} {school.activeCoachesCount} coaches
                </ThemedText>
              </Clickable>
            ))}
          </Column>

          <Column gap="sm">
            <ThemedText style={styles.label}>
              Code (optional - leave blank to auto-generate)
            </ThemedText>
            <TextInput
              value={newCodeText}
              onChangeText={handleCodeTextChange}
              autoCapitalize="characters"
              placeholder={`MYSCHOOL${currentYear}`}
              placeholderTextColor={palette.muted}
              style={[
                styles.input,
                { borderColor: palette.border, backgroundColor: palette.card, color: palette.text },
              ]}
              accessibilityLabel="Custom code text"

            maxLength={20}
          />
          </Column>

          <Column gap="sm">
            <ThemedText style={styles.label}>Max Uses</ThemedText>
            <TextInput
              value={maxUses}
              onChangeText={onChangeMaxUses}
              keyboardType="number-pad"
              placeholder="20"
              placeholderTextColor={palette.muted}
              style={[
                styles.input,
                { borderColor: palette.border, backgroundColor: palette.card, color: palette.text },
              ]}
              accessibilityLabel="Maximum number of uses"

            maxLength={10}
          />
          </Column>

          <Clickable
            onPress={onGenerate}
            disabled={!selectedSchool}
            style={[
              styles.generateButton,
              {
                backgroundColor: selectedSchool ? palette.tint : palette.border,
                opacity: selectedSchool ? 1 : 0.5,
              },
            ]}
            accessibilityLabel="Generate invite code"
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedSchool }}
          >
            <ThemedText style={[styles.generateButtonText, { color: palette.onPrimary }]}>
              Generate Code
            </ThemedText>
          </Clickable>
        </Column>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    borderBottomWidth: 1,
  },
  closeTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  closeButton: {
    ...Typography.body,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
    minHeight: 44,
  },
  schoolOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xxs,
    minHeight: 44,
  },
  schoolOptionText: {
    ...Typography.body,
    fontWeight: '500',
  },
  schoolOptionSubtext: {
    ...Typography.caption,
  },
  generateButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 44,
  },
  generateButtonText: {
    ...Typography.subheading,
  },
});
