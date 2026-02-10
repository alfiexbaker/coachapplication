import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface DevSessionNotesProps {
  publicNotes: string;
  privateNotes: string;
  improvements: string;
  homework: string;
  onPublicNotesChange: (v: string) => void;
  onPrivateNotesChange: (v: string) => void;
  onImprovementsChange: (v: string) => void;
  onHomeworkChange: (v: string) => void;
  colors: ThemeColors;
}

export const DevSessionNotes = memo(function DevSessionNotes({
  publicNotes, privateNotes, improvements, homework,
  onPublicNotesChange, onPrivateNotesChange, onImprovementsChange, onHomeworkChange,
  colors,
}: DevSessionNotesProps) {
  return (
    <Column gap="md">
      {/* Public summary */}
      <Column gap="sm">
        <Row justify="space-between" align="center">
          <ThemedText type="subtitle" style={[Typography.subheading, { flex: 1 }]}>Session Summary</ThemedText>
          <Row style={[styles.badge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="eye" size={12} color={colors.success} />
            <ThemedText style={[Typography.micro, { color: colors.success }]}>Parents can see</ThemedText>
          </Row>
        </Row>
        <SurfaceCard style={{ padding: Spacing.md }}>
          <TextInput
            value={publicNotes}
            onChangeText={onPublicNotesChange}
            placeholder="What did you work on? How did the athlete perform?"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.inputLarge, { color: colors.foreground, backgroundColor: colors.background }]}
            textAlignVertical="top"
          />
        </SurfaceCard>
      </Column>

      {/* Improvements */}
      <Column gap="sm">
        <Row gap="xs" align="center">
          <Ionicons name="trending-up" size={18} color={colors.success} />
          <ThemedText type="subtitle" style={Typography.subheading}>Improvements Noted</ThemedText>
        </Row>
        <SurfaceCard style={{ padding: Spacing.md }}>
          <TextInput
            value={improvements}
            onChangeText={onImprovementsChange}
            placeholder="What improvements did you observe?"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.inputSmall, { color: colors.foreground, backgroundColor: colors.background }]}
            textAlignVertical="top"
          />
        </SurfaceCard>
      </Column>

      {/* Homework */}
      <Column gap="sm">
        <Row gap="xs" align="center">
          <Ionicons name="clipboard-outline" size={18} color={colors.tint} />
          <ThemedText type="subtitle" style={Typography.subheading}>Homework / Focus Areas</ThemedText>
        </Row>
        <SurfaceCard style={{ padding: Spacing.md }}>
          <TextInput
            value={homework}
            onChangeText={onHomeworkChange}
            placeholder="What should the athlete practice before next session?"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.inputSmall, { color: colors.foreground, backgroundColor: colors.background }]}
            textAlignVertical="top"
          />
        </SurfaceCard>
      </Column>

      {/* Private notes */}
      <Column gap="sm">
        <Row justify="space-between" align="center">
          <ThemedText type="subtitle" style={[Typography.subheading, { flex: 1 }]}>Private Notes</ThemedText>
          <Row style={[styles.badge, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
            <Ionicons name="lock-closed" size={12} color={colors.muted} />
            <ThemedText style={[Typography.micro, { color: colors.muted }]}>Coach only</ThemedText>
          </Row>
        </Row>
        <SurfaceCard style={{ padding: Spacing.md }}>
          <TextInput
            value={privateNotes}
            onChangeText={onPrivateNotesChange}
            placeholder="Internal notes not visible to parents..."
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.inputSmall, { color: colors.foreground, backgroundColor: colors.background }]}
            textAlignVertical="top"
          />
        </SurfaceCard>
      </Column>
    </Column>
  );
});

const styles = StyleSheet.create({
  badge: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  inputLarge: { ...Typography.body, minHeight: 100, padding: 0 },
  inputSmall: { ...Typography.bodySmall, minHeight: 60, padding: 0 },
});
