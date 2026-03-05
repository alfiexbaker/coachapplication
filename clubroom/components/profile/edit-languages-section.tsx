/**
 * EditLanguagesSection — Languages list + add/edit modal for coach profiles.
 */

import React, { memo } from 'react';
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
  onQuickAdd: (name: string) => void;
  languageOptions: string[];
  proficiencyOptions: CoachLanguage['proficiency'][];
  // Modal
  modalVisible: boolean;
  draft: CoachLanguage;
  onDraftChange: React.Dispatch<React.SetStateAction<CoachLanguage>>;
  onSave: () => void;
  onCloseModal: () => void;
  modalError?: string | null;
}

export const EditLanguagesSection = memo(function EditLanguagesSection({
  colors,
  languages,
  onOpenModal,
  onRemove,
  onQuickAdd,
  languageOptions,
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
        <ThemedText style={styles.subtitle}>
          Set expectations for onboarding calls and session briefings with your language strengths.
        </ThemedText>

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
            <Ionicons name="chatbubbles-outline" size={20} color={colors.muted} />
            <ThemedText style={styles.emptyText}>
              Add the languages you coach in so parents feel confident you can welcome their family.
            </ThemedText>
          </SurfaceCard>
        )}

        <View style={[styles.quickAddRow, { borderColor: colors.border }]}>
          <ThemedText style={styles.helper}>Quick add</ThemedText>
          <Row wrap gap="xs">
            {languageOptions.map((option) => {
              const isAdded = languages.some((l) => l.name.toLowerCase() === option.toLowerCase());
              return (
                <Clickable
                  key={option}
                  disabled={isAdded}
                  onPress={() => onQuickAdd(option)}
                  style={[
                    styles.chip,
                    {
                      opacity: isAdded ? 0.35 : 1,
                      borderColor: isAdded ? colors.border : colors.tint,
                      backgroundColor: isAdded ? colors.card : withAlpha(colors.tint, 0.09),
                    },
                  ]}
                  accessibilityLabel={`Quick add ${option}`}
                  accessibilityRole="button"
                >
                  <ThemedText
                    style={styles.chipText}
                    lightColor={isAdded ? undefined : colors.tint}
                    darkColor={isAdded ? undefined : colors.tint}
                  >
                    {option}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
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
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Clickable>
            </Row>
            <View style={styles.modalContent}>
              {modalError ? (
                <ThemedText style={[styles.errorText, { color: colors.error }]} accessibilityRole="alert">
                  {modalError}
                </ThemedText>
              ) : null}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Language</ThemedText>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, name: t }))}
                  placeholder="e.g., English"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Language name"
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
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  subtitle: { opacity: 0.6, ...Typography.bodySmall },
  inlineAction: {},
  inlineActionText: { fontWeight: '700' },
  list: { gap: Spacing.sm },
  row: { padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md },
  dot: { width: 10, height: 10, borderRadius: Radii.sm },
  copy: { flex: 1, gap: Spacing.micro },
  name: { fontWeight: '700' },
  proficiency: { ...Typography.caption, opacity: 0.7 },
  iconButton: {
    width: 36,
    height: 36,
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
  quickAddRow: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  helper: { ...Typography.caption, opacity: 0.6 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: { fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  modalCard: { padding: Spacing.lg, gap: Spacing.md },
  modalContent: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  errorText: { ...Typography.caption },
  primaryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  primaryButtonText: { ...Typography.subheading },
});
