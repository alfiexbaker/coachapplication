/**
 * EditCertificationsSection — Certifications list + add/edit modal for coach profiles.
 */

import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
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
}

export const EditCertificationsSection = memo(function EditCertificationsSection({
  colors, certifications, onOpenModal, onRemove,
  modalVisible, draft, onDraftChange, onSave, onCloseModal,
}: EditCertificationsSectionProps) {
  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Certifications</ThemedText>
          <Pressable onPress={() => onOpenModal()} style={styles.inlineAction} accessibilityLabel="Add certification" accessibilityRole="button">
            <Ionicons name="add-circle" size={22} color={colors.tint} />
            <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={styles.subtitle}>
          Show parents your coaching licenses, FA badges, and professional qualifications.
        </ThemedText>

        {certifications.length > 0 ? (
          <View style={styles.list}>
            {certifications.map((cert) => {
              const issueDate = cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
              const expiryDate = cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null;
              const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();

              return (
                <View key={cert.id} style={[styles.card, { borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.pill, { backgroundColor: isExpired ? withAlpha(colors.warning, 0.09) : withAlpha(colors.success, 0.09) }]}>
                      <Ionicons name={isExpired ? 'alert-circle' : 'ribbon'} size={14} color={isExpired ? colors.warning : colors.success} />
                      <ThemedText style={styles.pillText} lightColor={isExpired ? colors.warning : colors.success} darkColor={isExpired ? colors.warning : colors.success}>
                        {isExpired ? 'Expired' : 'Valid'}
                      </ThemedText>
                    </View>
                    <View style={styles.actions}>
                      <Pressable onPress={() => onOpenModal(cert)} style={[styles.iconButton, { borderColor: colors.border }]} accessibilityLabel="Edit certification" accessibilityRole="button">
                        <Ionicons name="pencil" size={16} color={colors.muted} />
                      </Pressable>
                      <Pressable onPress={() => onRemove(cert.id)} style={[styles.iconButton, { borderColor: colors.border }]} accessibilityLabel="Remove certification" accessibilityRole="button">
                        <Ionicons name="trash" size={16} color={colors.warning} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <ThemedText type="subtitle">{cert.name}</ThemedText>
                    <ThemedText style={styles.issuer}>{cert.issuer}</ThemedText>
                    <ThemedText style={styles.date}>Issued: {issueDate}{expiryDate ? ` \u2022 Expires: ${expiryDate}` : ''}</ThemedText>
                    {cert.credentialUrl ? (
                      <View style={styles.linkRow}>
                        <Ionicons name="link" size={12} color={colors.tint} />
                        <ThemedText style={[styles.link, { color: colors.tint }]} numberOfLines={1}>{cert.credentialUrl}</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <SurfaceCard style={[styles.emptyCard, { borderColor: colors.border }]}>
            <Ionicons name="ribbon-outline" size={20} color={colors.muted} />
            <ThemedText style={styles.emptyText}>
              Add your FA badges, UEFA licenses, or other coaching qualifications to build trust with parents.
            </ThemedText>
          </SurfaceCard>
        )}
      </SurfaceCard>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={onCloseModal}>
        <View style={styles.modalOverlay}>
          <SurfaceCard style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Certification</ThemedText>
              <Pressable onPress={onCloseModal} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Certification Name</ThemedText>
                <TextInput value={draft.name} onChangeText={(t) => onDraftChange((p) => ({ ...p, name: t }))} placeholder="e.g., UEFA B License, FA Level 2..." placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Certification name" />
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Issuing Organisation</ThemedText>
                <TextInput value={draft.issuer} onChangeText={(t) => onDraftChange((p) => ({ ...p, issuer: t }))} placeholder="e.g., UEFA, The FA, US Soccer..." placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Issuing organisation" />
              </View>
              <View style={styles.inlineFields}>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <ThemedText style={styles.label}>Issue Date</ThemedText>
                  <TextInput value={draft.issueDate} onChangeText={(t) => onDraftChange((p) => ({ ...p, issueDate: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Issue date" />
                </View>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <ThemedText style={styles.label}>Expiry Date (optional)</ThemedText>
                  <TextInput value={draft.expiryDate || ''} onChangeText={(t) => onDraftChange((p) => ({ ...p, expiryDate: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Expiry date" />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>Credential URL (optional)</ThemedText>
                <TextInput value={draft.credentialUrl || ''} onChangeText={(t) => onDraftChange((p) => ({ ...p, credentialUrl: t }))} placeholder="https://credentials.fa.com/..." keyboardType="url" autoCapitalize="none" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Credential URL" />
                <ThemedText style={styles.helper}>Link to your digital badge or certificate verification page</ThemedText>
              </View>
              <Pressable onPress={onSave} style={[styles.primaryButton, { backgroundColor: colors.tint }]} accessibilityLabel="Save certification" accessibilityRole="button">
                <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Save certification</ThemedText>
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
  list: { gap: Spacing.sm },
  card: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  pillText: { ...Typography.caption },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconButton: { width: 36, height: 36, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { gap: Spacing.xxs },
  issuer: { fontWeight: '600', opacity: 0.8 },
  date: { ...Typography.caption, opacity: 0.6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xxs },
  link: { ...Typography.caption, flex: 1 },
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
  inlineFields: { flexDirection: 'row', gap: Spacing.md },
  inlineField: { flex: 1 },
  helper: { ...Typography.caption, opacity: 0.6 },
  primaryButton: { marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.lg, alignItems: 'center' },
  primaryButtonText: { ...Typography.subheading },
});
