/**
 * EditLanguagesSection — Languages list + add/edit modal for coach profiles.
 */

import React from 'react';
import { Modal, StyleSheet, TextInput, View, Keyboard } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CoachLanguage } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditLanguagesSectionProps {
  colors: ThemeColors;
  languages: CoachLanguage[];
  onOpenModal: (language?: CoachLanguage) => void;
  onRemove: (id: string) => void;
  proficiencyOptions: CoachLanguage['proficiency'][];
  // Modal
  modalVisible: boolean;
  draft: CoachLanguage;
  onDraftChange: React.Dispatch<React.SetStateAction<CoachLanguage>>;
  onSave: () => void;
  onCloseModal: () => void;
  modalError?: string | null;
}

export const EditLanguagesSection = function EditLanguagesSection({
  colors,
  languages,
  onOpenModal,
  onRemove,
  proficiencyOptions,
  modalVisible,
  draft,
  onDraftChange,
  onSave,
  onCloseModal,
  modalError,
}: EditLanguagesSectionProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <>
      <SurfaceCard style={styles.section}>
        <Row justify="between" align="center">
          <ThemedText type="subtitle">Languages</ThemedText>
          <Clickable
            onPress={() => onOpenModal()}
            style={styles.inlineAction}
            accessibilityLabel="Add language"
            accessibilityRole="button"
          >
            <Row align="center" gap="xs">
              <Ionicons name="add-circle" size={22} color={colors.tint} />
              <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
            </Row>
          </Clickable>
        </Row>

        {languages.length > 0 ? (
          <View style={styles.list}>
            {languages.map((lang) => (
              <Row
                key={lang.id}
                align="center"
                gap="sm"
                style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                <View style={styles.copy}>
                  <ThemedText style={styles.name}>{lang.name}</ThemedText>
                  <ThemedText style={styles.proficiency}>{lang.proficiency}</ThemedText>
                </View>
                <Row gap="xs">
                  <Clickable
                    onPress={() => onOpenModal(lang)}
                    style={[styles.iconButton, { borderColor: colors.border }]}
                    accessibilityLabel={`Edit ${lang.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="pencil" size={16} color={colors.muted} />
                  </Clickable>
                  <Clickable
                    onPress={() => onRemove(lang.id)}
                    style={[styles.iconButton, { borderColor: colors.border }]}
                    accessibilityLabel={`Remove ${lang.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={16} color={colors.warning} />
                  </Clickable>
                </Row>
              </Row>
            ))}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <ThemedText style={styles.emptyText}>No languages added.</ThemedText>
          </SurfaceCard>
        )}
      </SurfaceCard>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          onCloseModal();
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.text, 0.35) }]}>
          <SurfaceCard style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Row justify="between" align="center">
              <ThemedText type="subtitle">Language</ThemedText>
              <Clickable
                onPress={() => {
                  Keyboard.dismiss();
                  onCloseModal();
                }}
                style={styles.modalClose}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Clickable>
            </Row>
            <View style={styles.modalContent}>
              {modalError ? (
                <ThemedText
                  style={[styles.errorText, { color: colors.error }]}
                  accessibilityRole="alert"
                >
                  {modalError}
                </ThemedText>
              ) : null}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Language</ThemedText>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, name: t }))}
                  placeholder="English"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Language name"
                  maxLength={80}
                />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Proficiency</ThemedText>
                <Row wrap gap="xs">
                  {proficiencyOptions.map((level) => {
                    const isActive = draft.proficiency === level;
                    return (
                      <Clickable
                        key={level}
                        onPress={() => onDraftChange((p) => ({ ...p, proficiency: level }))}
                        style={[
                          styles.chip,
                          {
                            borderColor: isActive ? colors.tint : colors.border,
                            backgroundColor: isActive ? withAlpha(colors.tint, 0.09) : colors.card,
                          },
                        ]}
                        accessibilityLabel={level}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isActive }}
                      >
                        <ThemedText
                          style={styles.chipText}
                          lightColor={isActive ? colors.tint : undefined}
                          darkColor={isActive ? colors.tint : undefined}
                        >
                          {level}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </Row>
              </View>
              <Clickable
                onPress={onSave}
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                accessibilityLabel="Save language"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                  Save language
                </ThemedText>
              </Clickable>
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  inlineAction: {
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: { fontWeight: '700' },
  list: { gap: Spacing.sm },
  row: { padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md },
  dot: { width: 10, height: 10, borderRadius: Radii.sm },
  copy: { flex: 1, gap: Spacing.micro },
  name: { fontWeight: '700' },
  proficiency: { ...Typography.caption, opacity: 0.7 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: { textAlign: 'center', opacity: 0.7 },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: { fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', maxHeight: '90%', padding: Spacing.lg, gap: Spacing.md },
  modalContent: { gap: Spacing.md },
  modalClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  errorText: { ...Typography.caption },
  primaryButton: {
    marginTop: Spacing.sm,
    minHeight: 48,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...Typography.subheading },
});
