/**
 * CreateCodeForm — Visual sections: preset row, toggle cards, footer.
 */
import { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PresetRowProps {
  presets: number[];
  selected: string;
  onSelect: (value: string) => void;
  prefix?: string;
}

export const PresetRow = memo(function PresetRow({ presets, selected, onSelect, prefix }: PresetRowProps) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="xs" wrap>
      {presets.map((value) => {
        const isActive = selected === String(value);
        return (
          <Clickable
            key={value}
            style={[styles.presetButton, { backgroundColor: isActive ? palette.tint : palette.surface, borderColor: isActive ? palette.tint : palette.border }]}
            onPress={() => onSelect(String(value))}
          >
            <ThemedText style={[styles.presetText, { color: isActive ? palette.onPrimary : palette.text }]}>
              {prefix}{value}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
});

interface ErrorBannerProps {
  message: string;
}

export const ErrorBanner = memo(function ErrorBanner({ message }: ErrorBannerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" gap="sm" style={[styles.errorBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
      <Ionicons name="alert-circle" size={18} color={palette.error} />
      <ThemedText style={[styles.errorBannerText, { color: palette.error }]}>{message}</ThemedText>
    </Row>
  );
});

interface FormFooterProps {
  onCancel?: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export const FormFooter = memo(function FormFooter({ onCancel, onSubmit, submitting }: FormFooterProps) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="sm" style={[styles.footer, { borderTopColor: palette.border }]}>
      {onCancel && (
        <Clickable style={[styles.cancelButton, { borderColor: palette.border }]} onPress={onCancel} disabled={submitting}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </Clickable>
      )}
      <Clickable
        style={[styles.submitButton, { backgroundColor: palette.tint, opacity: submitting ? 0.6 : 1 }, !onCancel ? styles.submitButtonFull : undefined]}
        onPress={onSubmit} disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={palette.onPrimary} />
        ) : (
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="add-circle-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>Create Code</ThemedText>
          </Row>
        )}
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  presetButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  presetText: { ...Typography.bodySmallSemiBold },
  errorBanner: { padding: Spacing.md, borderRadius: Radii.md },
  errorBannerText: { ...Typography.bodySmallSemiBold, flex: 1 },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1 },
  cancelButtonText: { ...Typography.subheading },
  submitButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.lg },
  submitButtonFull: { flex: 1 },
  submitButtonText: { ...Typography.subheading },
});
