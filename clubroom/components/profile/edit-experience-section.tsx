/**
 * EditExperienceSection — Experience list + add/edit modal for coach profiles.
 */

import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
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
  colors, experiences, onOpenModal, onRemove,
  modalVisible, draft, onDraftChange, onSave, onCloseModal,
}: EditExperienceSectionProps) {
  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Experience</ThemedText>
          <Pressable onPress={() => onOpenModal()} style={styles.inlineAction} accessibilityLabel="Add experience" accessibilityRole="button">
            <Ionicons name="add-circle" size={22} color={colors.tint} />
            <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.subtitle}>
          Curate the highlights parents see first: current teams, academies, and playing history.
        </ThemedText>

        {experiences.length > 0 ? (
          <View style={styles.timeline}>
            {experiences.map((exp) => {
              const start = exp.startDate
                ? new Date(exp.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                : 'Start date';
              const end = exp.current
                ? 'Present'
                : exp.endDate
                  ? new Date(exp.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  : 'End date';

              return (
                <View key={exp.id} style={[styles.card, { borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.pill, { backgroundColor: exp.current ? withAlpha(colors.success, 0.09) : withAlpha(colors.tint, 0.09) }]}>
                      <Ionicons name={exp.current ? 'radio-button-on' : 'briefcase'} size={14} color={exp.current ? colors.success : colors.tint} />
                      <ThemedText style={styles.pillText} lightColor={exp.current ? colors.success : colors.tint} darkColor={exp.current ? colors.success : colors.tint}>
                        {exp.current ? 'Current' : 'Past'}
                      </ThemedText>
                    </View>
                    <View style={styles.actions}>
                      <Pressable onPress={() => onOpenModal(exp)} style={[styles.iconButton, { borderColor: colors.border }]} accessibilityLabel="Edit experience" accessibilityRole="button">
                        <Ionicons name="pencil" size={16} color={colors.muted} />
                      </Pressable>
                      <Pressable onPress={() => onRemove(exp.id)} style={[styles.iconButton, { borderColor: colors.border }]} accessibilityLabel="Remove experience" accessibilityRole="button">
                        <Ionicons name="trash" size={16} color={colors.warning} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <ThemedText type="subtitle">{exp.title}</ThemedText>
                    <ThemedText style={styles.org}>{exp.organization}</ThemedText>
                    <ThemedText style={styles.date}>{start} — {end}</ThemedText>
                    {exp.description ? <ThemedText style={styles.description}>{exp.description}</ThemedText> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <Ionicons name="sparkles" size={20} color={colors.muted} />
            <ThemedText style={styles.emptyText}>
              Add academy roles, coaching gigs, or your playing career. Parents love to see the timeline.
            </ThemedText>
          </SurfaceCard>
        )}
      </SurfaceCard>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={onCloseModal}>
        <View style={styles.modalOverlay}>
          <SurfaceCard style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Experience</ThemedText>
              <Pressable onPress={onCloseModal} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Role / Title</ThemedText>
                <TextInput value={draft.title} onChangeText={(t) => onDraftChange((p) => ({ ...p, title: t }))} placeholder="Head Coach, Goalkeeping Coach..." placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Role title" />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Organisation / Club</ThemedText>
                <TextInput value={draft.organization} onChangeText={(t) => onDraftChange((p) => ({ ...p, organization: t }))} placeholder="Club or academy name" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Organisation" />
              </View>
              <View style={styles.inlineFields}>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <ThemedText style={styles.label}>Start Date</ThemedText>
                  <TextInput value={draft.startDate} onChangeText={(t) => onDraftChange((p) => ({ ...p, startDate: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Start date" />
                </View>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={styles.label}>End Date</ThemedText>
                    <Pressable onPress={() => onDraftChange((p) => ({ ...p, current: !p.current, endDate: p.current ? p.endDate : '' }))} style={styles.inlineAction} accessibilityLabel="Toggle current" accessibilityRole="checkbox">
                      <Ionicons name={draft.current ? 'checkbox' : 'square-outline'} size={18} color={draft.current ? colors.success : colors.muted} />
                      <ThemedText style={styles.helper}>I currently do this</ThemedText>
                    </Pressable>
                  </View>
                  <TextInput value={draft.endDate || ''} onChangeText={(t) => onDraftChange((p) => ({ ...p, endDate: t }))} placeholder={draft.current ? 'Present' : 'YYYY-MM-DD'} editable={!draft.current} placeholderTextColor={colors.muted} style={[...inputStyle, { backgroundColor: draft.current ? colors.border : colors.card }]} accessibilityLabel="End date" />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput value={draft.description} onChangeText={(t) => onDraftChange((p) => ({ ...p, description: t }))} placeholder="Highlight wins, age groups, or your philosophy." multiline numberOfLines={3} textAlignVertical="top" placeholderTextColor={colors.muted} style={[...inputStyle, styles.textArea]} accessibilityLabel="Description" />
              </View>
              <Pressable onPress={onSave} style={[styles.primaryButton, { backgroundColor: colors.tint }]} accessibilityLabel="Save experience" accessibilityRole="button">
                <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Save experience</ThemedText>
              </Pressable>
            </ScrollView>
          </SurfaceCard>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { opacity: 0.6, ...Typography.bodySmall },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inlineActionText: { fontWeight: '700' },
  timeline: { gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  pillText: { ...Typography.caption },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconButton: { width: 36, height: 36, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { gap: Spacing.xxs },
  org: { fontWeight: '600', opacity: 0.8 },
  date: { ...Typography.caption, opacity: 0.6 },
  description: { lineHeight: 18, opacity: 0.8 },
  emptyCard: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, borderStyle: 'dashed', alignItems: 'center', gap: Spacing.xs },
  emptyText: { textAlign: 'center', opacity: 0.7 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { padding: Spacing.lg, gap: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalContent: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.subheading },
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  inlineFields: { flexDirection: 'row', gap: Spacing.md },
  inlineField: { flex: 1 },
  helper: { ...Typography.caption, opacity: 0.6 },
  primaryButton: { marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.lg, alignItems: 'center' },
  primaryButtonText: { ...Typography.subheading },
});
