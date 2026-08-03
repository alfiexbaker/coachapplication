/**
 * EditExperienceSection — Experience list + add/edit modal for coach profiles.
 */

import React from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View, Keyboard } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CoachExperience } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditExperienceSectionProps {
  colors: ThemeColors;
  experiences: CoachExperience[];
  onOpenModal: (experience?: CoachExperience) => void;
  onRemove: (id: string) => void;
  // Modal
  modalVisible: boolean;
  draft: CoachExperience;
  onDraftChange: React.Dispatch<React.SetStateAction<CoachExperience>>;
  onSave: () => void;
  onCloseModal: () => void;
  modalError?: string | null;
}

export const EditExperienceSection = function EditExperienceSection({
  colors,
  experiences,
  onOpenModal,
  onRemove,
  modalVisible,
  draft,
  onDraftChange,
  onSave,
  onCloseModal,
  modalError,
}: EditExperienceSectionProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <>
      <SurfaceCard style={styles.section}>
        <Row justify="between" align="center">
          <ThemedText type="subtitle">Experience</ThemedText>
          <Clickable
            onPress={() => onOpenModal()}
            style={styles.inlineAction}
            accessibilityLabel="Add experience"
            accessibilityRole="button"
          >
            <Row align="center" gap="xs">
              <Ionicons name="add-circle" size={22} color={colors.tint} />
              <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
            </Row>
          </Clickable>
        </Row>

        {experiences.length > 0 ? (
          <View style={styles.timeline}>
            {experiences.map((exp) => {
              const start = exp.startDate
                ? new Date(exp.startDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Start date';
              const end = exp.current
                ? 'Present'
                : exp.endDate
                  ? new Date(exp.endDate).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'End date';

              return (
                <View key={exp.id} style={[styles.card, { borderColor: colors.border }]}>
                  <Row justify="between" align="center">
                    <Row
                      align="center"
                      gap="xs"
                      style={[
                        styles.pill,
                        {
                          backgroundColor: exp.current
                            ? withAlpha(colors.success, 0.09)
                            : withAlpha(colors.tint, 0.09),
                        },
                      ]}
                    >
                      <Ionicons
                        name={exp.current ? 'radio-button-on' : 'briefcase'}
                        size={14}
                        color={exp.current ? colors.success : colors.tint}
                      />
                      <ThemedText
                        style={styles.pillText}
                        lightColor={exp.current ? colors.success : colors.tint}
                        darkColor={exp.current ? colors.success : colors.tint}
                      >
                        {exp.current ? 'Current' : 'Past'}
                      </ThemedText>
                    </Row>
                    <Row gap="sm">
                      <Clickable
                        onPress={() => onOpenModal(exp)}
                        style={[styles.iconButton, { borderColor: colors.border }]}
                        accessibilityLabel="Edit experience"
                        accessibilityRole="button"
                      >
                        <Ionicons name="pencil" size={16} color={colors.muted} />
                      </Clickable>
                      <Clickable
                        onPress={() => onRemove(exp.id)}
                        style={[styles.iconButton, { borderColor: colors.border }]}
                        accessibilityLabel="Remove experience"
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash" size={16} color={colors.warning} />
                      </Clickable>
                    </Row>
                  </Row>
                  <View style={styles.cardBody}>
                    <ThemedText type="subtitle">{exp.title}</ThemedText>
                    <ThemedText style={styles.org}>{exp.organization}</ThemedText>
                    <ThemedText style={styles.date}>
                      {start} - {end}
                    </ThemedText>
                    {exp.description ? (
                      <ThemedText style={styles.description}>{exp.description}</ThemedText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <ThemedText style={styles.emptyText}>No experience added.</ThemedText>
          </SurfaceCard>
        )}
      </SurfaceCard>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          onCloseModal();
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.text, 0.35) }]}>
          <SurfaceCard style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Row justify="between" align="center">
              <ThemedText type="subtitle">Experience</ThemedText>
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
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {modalError ? (
                <ThemedText
                  style={[styles.errorText, { color: colors.error }]}
                  accessibilityRole="alert"
                >
                  {modalError}
                </ThemedText>
              ) : null}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Role</ThemedText>
                <TextInput
                  value={draft.title}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, title: t }))}
                  placeholder="Head coach"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Role title"
                  maxLength={120}
                />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Club or organisation</ThemedText>
                <TextInput
                  value={draft.organization}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, organization: t }))}
                  placeholder="Club or academy name"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Organisation"
                  maxLength={120}
                />
              </View>
              <DateTimeField
                mode="date"
                label="Start date"
                value={draft.startDate}
                onChange={(t) => onDraftChange((p) => ({ ...p, startDate: t }))}
              />
              <Clickable
                onPress={() =>
                  onDraftChange((p) => ({
                    ...p,
                    current: !p.current,
                    endDate: p.current ? p.endDate : '',
                  }))
                }
                style={styles.currentToggle}
                accessibilityLabel="Current role"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.current }}
              >
                <Row align="center" gap="xs">
                  <Ionicons
                    name={draft.current ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={draft.current ? colors.success : colors.muted}
                  />
                  <ThemedText>Current role</ThemedText>
                </Row>
              </Clickable>
              {!draft.current ? (
                <DateTimeField
                  mode="date"
                  label="End date (optional)"
                  value={draft.endDate || ''}
                  onChange={(t) => onDraftChange((p) => ({ ...p, endDate: t }))}
                />
              ) : null}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  value={draft.description}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, description: t }))}
                  placeholder="Age group, responsibilities, results"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={colors.muted}
                  style={[...inputStyle, styles.textArea]}
                  accessibilityLabel="Description"
                  maxLength={1000}
                />
              </View>
              <Clickable
                onPress={onSave}
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                accessibilityLabel="Save experience"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                  Save experience
                </ThemedText>
              </Clickable>
            </ScrollView>
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
  timeline: { gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  pillText: { ...Typography.caption },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { gap: Spacing.xxs },
  org: { fontWeight: '600', opacity: 0.8 },
  date: { ...Typography.caption, opacity: 0.6 },
  description: { lineHeight: 18, opacity: 0.8 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: { textAlign: 'center', opacity: 0.7 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', maxHeight: '90%', padding: Spacing.lg, gap: Spacing.md },
  modalScroll: { flexShrink: 1 },
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
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  currentToggle: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
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
