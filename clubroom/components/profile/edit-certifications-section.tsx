/**
 * EditCertificationsSection — Certifications list + add/edit modal for coach profiles.
 */

import React from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CoachCertification } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditCertificationsSectionProps {
  colors: ThemeColors;
  certifications: CoachCertification[];
  onOpenModal: (cert?: CoachCertification) => void;
  onRemove: (id: string) => void;
  // Modal
  modalVisible: boolean;
  draft: CoachCertification;
  onDraftChange: React.Dispatch<React.SetStateAction<CoachCertification>>;
  onSave: () => void;
  onCloseModal: () => void;
  modalError?: string | null;
}

export const EditCertificationsSection = function EditCertificationsSection({
  colors,
  certifications,
  onOpenModal,
  onRemove,
  modalVisible,
  draft,
  onDraftChange,
  onSave,
  onCloseModal,
  modalError,
}: EditCertificationsSectionProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <>
      <SurfaceCard style={styles.section}>
        <Row justify="between" align="center">
          <ThemedText type="subtitle">Qualifications</ThemedText>
          <Clickable
            onPress={() => onOpenModal()}
            style={styles.inlineAction}
            accessibilityLabel="Add qualification"
            accessibilityRole="button"
          >
            <Row align="center" gap="xs">
              <Ionicons name="add-circle" size={22} color={colors.tint} />
              <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
            </Row>
          </Clickable>
        </Row>
        {certifications.length > 0 ? (
          <View style={styles.list}>
            {certifications.map((cert) => (
              <View key={cert.id} style={[styles.card, { borderColor: colors.border }]}>
                <Row justify="between" align="center" style={styles.cardRow}>
                  <View style={styles.cardBody}>
                    <ThemedText type="subtitle" style={styles.qualificationName}>
                      {cert.name}
                    </ThemedText>
                    {cert.issuer ? (
                      <ThemedText style={styles.issuer}>{cert.issuer}</ThemedText>
                    ) : null}
                  </View>
                  <Row gap="sm" style={styles.cardActions}>
                    <Clickable
                      onPress={() => onOpenModal(cert)}
                      style={[styles.iconButton, { borderColor: colors.border }]}
                      accessibilityLabel="Edit qualification"
                      accessibilityRole="button"
                    >
                      <Ionicons name="pencil" size={16} color={colors.muted} />
                    </Clickable>
                    <Clickable
                      onPress={() => onRemove(cert.id)}
                      style={[styles.iconButton, { borderColor: colors.border }]}
                      accessibilityLabel="Remove qualification"
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash" size={16} color={colors.warning} />
                    </Clickable>
                  </Row>
                </Row>
              </View>
            ))}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <ThemedText style={styles.emptyText}>No qualifications added.</ThemedText>
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
              <ThemedText type="subtitle">Qualification</ThemedText>
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
                <ThemedText style={styles.label}>Name</ThemedText>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, name: t }))}
                  placeholder="UEFA B Licence"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Qualification name"
                  maxLength={120}
                />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Issuer (optional)</ThemedText>
                <TextInput
                  value={draft.issuer}
                  onChangeText={(t) => onDraftChange((p) => ({ ...p, issuer: t }))}
                  placeholder="The FA"
                  placeholderTextColor={colors.muted}
                  style={inputStyle}
                  accessibilityLabel="Qualification issuer"
                  maxLength={120}
                />
              </View>
              <Clickable
                onPress={onSave}
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                accessibilityLabel="Save qualification"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                  Save qualification
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
  list: { gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  cardRow: { width: '100%' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0, gap: Spacing.xxs },
  qualificationName: { flexShrink: 1 },
  cardActions: { flexShrink: 0 },
  issuer: { fontWeight: '600', opacity: 0.8 },
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
