/**
 * EditExperienceSection — Experience list + add/edit modal for coach profiles.
 */

import React, { memo } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
}

export const EditExperienceSection = memo(function EditExperienceSection({
  colors,
  experiences,
  onOpenModal,
  onRemove,
  modalVisible,
  draft,
  onDraftChange,
  onSave,
  onCloseModal,
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
        <ThemedText style={styles.subtitle}>
          Curate the highlights parents see first: current teams, academies, and playing history.
        </ThemedText>

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
                      {start} — {end}
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
            <Ionicons name="sparkles" size={20} color={colors.muted} />
            <ThemedText style={styles.emptyText}>
              Add academy roles, coaching gigs, or your playing career. Parents love to see the
              timeline.
            </ThemedText>
          </SurfaceCard>
        )}
      </SurfaceCard>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={onCloseModal}>
        <View style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.text, 0.35) }]}>
          <SurfaceCard style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Row justify="between" align="center">
              <ThemedText type="subtitle">Experience</ThemedText>
              <Clickable
                onPress={onCloseModal}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Clickable>
            </Row>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Role / Title</ThemedText>
                <TextInput
                  value={draft.title}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, title: t }))}
                  placeholder="Head Coach, Goalkeeping Coach..."
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Role title"
                />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Organisation / Club</ThemedText>
                <TextInput
                  value={draft.organization}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, organization: t }))}
                  placeholder="Club or academy name"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Organisation"
                />
              </View>
              <Row gap="md">
                <DateTimeField
                  mode="date"
                  label="Start Date"
                  value={draft.startDate}
                  onChange={(t) => onDraftChange((p) => ({ ...p, startDate: t }))}
                  style={styles.inlineField}
                />
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <Row justify="between" align="center">
                    <ThemedText style={styles.label}>End Date</ThemedText>
                    <Clickable
                      onPress={() =>
                        onDraftChange((p) => ({
                          ...p,
                          current: !p.current,
                          endDate: p.current ? p.endDate : '',
                        }))
                      }
                      style={styles.inlineAction}
                      accessibilityLabel="Toggle current"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: draft.current }}
                    >
                      <Row align="center" gap="xs">
                        <Ionicons
                          name={draft.current ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={draft.current ? colors.success : colors.muted}
                        />
                        <ThemedText style={styles.helper}>I currently do this</ThemedText>
                      </Row>
                    </Clickable>
                  </Row>
                  <DateTimeField
                    mode="date"
                    value={draft.endDate || ''}
                    onChange={(t) => onDraftChange((p) => ({ ...p, endDate: t }))}
                    placeholder={draft.current ? 'Present' : undefined}
                    disabled={draft.current}
                  />
                </View>
              </Row>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  value={draft.description}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, description: t }))}
                  placeholder="Highlight wins, age groups, or your philosophy."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={colors.muted}
                  style={[...inputStyle, styles.textArea]}
                  accessibilityLabel="Description"
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
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  subtitle: { opacity: 0.6, ...Typography.bodySmall },
  inlineAction: {},
  inlineActionText: { fontWeight: '700' },
  timeline: { gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  pillText: { ...Typography.caption },
  iconButton: {
    width: 36,
    height: 36,
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
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  inlineField: { flex: 1 },
  helper: { ...Typography.caption, opacity: 0.6 },
  primaryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  primaryButtonText: { ...Typography.subheading },
});
