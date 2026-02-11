/**
 * CreatePackageForm — Sub-components.
 */
import { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FootballObjective } from '@/constants/types';

/* ─── Option Picker (session count, validity, etc.) ─── */
interface OptionPickerProps<T extends string | number> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}
export const OptionPicker = memo(function OptionPicker<T extends string | number>({ options, selected, onSelect }: OptionPickerProps<T>) {
  const { colors: palette } = useTheme();
  return (
    <Row wrap gap="xs">
      {options.map((opt) => (
        <Clickable
          key={String(opt.value)}
          onPress={() => onSelect(opt.value)}
          style={[styles.optionButton, { backgroundColor: selected === opt.value ? palette.tint : palette.surface, borderColor: selected === opt.value ? palette.tint : palette.border }]}
          accessibilityRole="button"
          accessibilityLabel={opt.label}
          accessibilityState={{ selected: selected === opt.value }}
        >
          <ThemedText style={[styles.optionText, { color: selected === opt.value ? palette.onPrimary : palette.text }]}>{opt.label}</ThemedText>
        </Clickable>
      ))}
    </Row>
  );
}) as <T extends string | number>(props: OptionPickerProps<T>) => React.JSX.Element;

/* ─── Focus Area Picker ─── */
interface FocusAreaPickerProps { options: FootballObjective[]; selected: FootballObjective[]; onToggle: (f: FootballObjective) => void; }
export const FocusAreaPicker = memo(function FocusAreaPicker({ options, selected, onToggle }: FocusAreaPickerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row wrap gap="xs">
      {options.map((focus) => {
        const isSelected = selected.includes(focus);
        return (
          <Clickable
            key={focus}
            onPress={() => onToggle(focus)}
            style={[styles.focusChip, { backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: isSelected ? palette.tint : palette.border }]}
            accessibilityRole="button"
            accessibilityLabel={focus}
            accessibilityState={{ selected: isSelected }}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color={palette.tint} />}
            <ThemedText style={[styles.focusChipText, { color: isSelected ? palette.tint : palette.text }]}>{focus}</ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
});

/* ─── Price Preview ─── */
interface PricePreviewProps { pricePerSession: number; }
export const PricePreview = memo(function PricePreview({ pricePerSession }: PricePreviewProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={[styles.previewCard, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
      <Row align="center" gap="xs">
        <Ionicons name="calculator-outline" size={16} color={palette.success} />
        <ThemedText style={[styles.previewText, { color: palette.success }]}>{'\u00A3'}{pricePerSession.toFixed(2)} per session</ThemedText>
      </Row>
    </SurfaceCard>
  );
});

/* ─── Form Footer ─── */
interface FormFooterProps {
  onCancel?: () => void; onSubmit: () => void; submitting: boolean;
  isEditing: boolean;
}
export const PackageFormFooter = memo(function PackageFormFooter({ onCancel, onSubmit, submitting, isEditing }: FormFooterProps) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="sm" style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
      {onCancel && (
        <Clickable style={[styles.cancelButton, { borderColor: palette.border }]} onPress={onCancel} disabled={submitting} accessibilityRole="button" accessibilityLabel="Cancel package form" accessibilityState={{ disabled: submitting }}>
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </Clickable>
      )}
      <Clickable style={[styles.submitButton, { backgroundColor: palette.tint }, submitting ? styles.buttonDisabled : undefined]} onPress={onSubmit} disabled={submitting} accessibilityRole="button" accessibilityLabel={isEditing ? 'Save package changes' : 'Create package'} accessibilityState={{ disabled: submitting }}>
        {submitting ? (
          <ActivityIndicator size="small" color={palette.onPrimary} />
        ) : (
          <>
            <Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.submitButtonText, { color: palette.onPrimary }]}>{isEditing ? 'Save Changes' : 'Create Package'}</ThemedText>
          </>
        )}
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  optionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1.5, minWidth: 60, alignItems: 'center' },
  optionText: { ...Typography.bodySmallSemiBold },
  focusChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.md, borderWidth: 1.5 },
  focusChipText: { ...Typography.smallSemiBold },
  previewCard: { padding: Spacing.sm, marginBottom: Spacing.md },
  previewText: { ...Typography.bodySmallSemiBold },
  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1.5 },
  cancelButtonText: { ...Typography.subheading },
  submitButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radii.lg },
  submitButtonText: { ...Typography.subheading },
  buttonDisabled: { opacity: 0.6 },
});
