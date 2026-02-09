import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BodyPart, InjurySeverity } from '@/constants/types';
import { BODY_PART_CATEGORIES, SEVERITY_OPTIONS } from '@/hooks/use-group-roster';

export interface InjuryReportModalProps {
  visible: boolean;
  athleteName: string | undefined;
  bodyPart: BodyPart | null;
  severity: InjurySeverity;
  description: string;
  saving: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onBodyPartChange: (part: BodyPart) => void;
  onSeverityChange: (severity: InjurySeverity) => void;
  onDescriptionChange: (text: string) => void;
  onSubmit: () => void;
}

export const InjuryReportModal = memo(function InjuryReportModal({
  visible, athleteName, bodyPart, severity, description, saving, colors,
  onClose, onBodyPartChange, onSeverityChange, onDescriptionChange, onSubmit,
}: InjuryReportModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>Report Injury</ThemedText>
            {athleteName && <ThemedText style={[Typography.small, { color: colors.muted }]}>{athleteName}</ThemedText>}
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} showsVerticalScrollIndicator={false}>
          {/* Severity */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>Severity</ThemedText>
            <Row gap="sm">
              {SEVERITY_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[styles.severityOption, {
                    backgroundColor: severity === option.value ? option.color : withAlpha(option.color, 0.09),
                    borderColor: option.color,
                  }]}
                  onPress={() => onSeverityChange(option.value)}
                >
                  <ThemedText style={[Typography.smallSemiBold, { color: severity === option.value ? colors.onPrimary : option.color }]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </Row>
          </View>

          {/* Body Part */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>Body Part *</ThemedText>
            {BODY_PART_CATEGORIES.map(cat => (
              <View key={cat.label} style={{ marginBottom: Spacing.md }}>
                <ThemedText style={[styles.catLabel, { color: colors.muted }]}>{cat.label}</ThemedText>
                <View style={styles.partGrid}>
                  {cat.parts.map(({ part, label }) => (
                    <Pressable
                      key={part}
                      style={[styles.partChip, {
                        backgroundColor: bodyPart === part ? colors.tint : colors.surface,
                        borderColor: bodyPart === part ? colors.tint : colors.border,
                      }]}
                      onPress={() => onBodyPartChange(part)}
                    >
                      <ThemedText style={[Typography.caption, { color: bodyPart === part ? colors.onPrimary : colors.text }]}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>Description *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={onDescriptionChange}
              placeholder="What happened? How did the injury occur?"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Info */}
          <View style={[styles.info, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
            <Ionicons name="information-circle" size={20} color={colors.tint} />
            <ThemedText style={[Typography.small, { color: colors.muted, flex: 1 }]}>
              This injury will be logged to the athlete&apos;s health records and automatically shared with their parent/guardian.
            </ThemedText>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button onPress={onSubmit} disabled={saving || !bodyPart || !description.trim()} style={{ flex: 1 }}>
            {saving ? 'Submitting...' : 'Report Injury'}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  section: { marginBottom: Spacing.lg },
  severityOption: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center' },
  catLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  partGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  partChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, minHeight: 100 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
