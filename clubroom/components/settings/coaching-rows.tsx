import { memo } from 'react';
import { View, StyleSheet, Switch, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface StepperProps {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  helperText?: string;
}

export const Stepper = memo(function Stepper({ label, value, onValueChange, min, max, step, suffix, helperText }: StepperProps) {
  const { colors } = useTheme();
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {helperText ? <ThemedText style={[styles.rowHelper, { color: colors.muted }]}>{helperText}</ThemedText> : null}
      </View>
      <View style={styles.stepperControl}>
        <Pressable onPress={() => canDecrement && onValueChange(value - step)}
          style={[styles.stepperButton, { backgroundColor: colors.background }, !canDecrement && styles.stepperButtonDisabled]}
          accessibilityLabel={`Decrease ${label}`}>
          <Ionicons name="remove" size={18} color={canDecrement ? colors.text : colors.border} />
        </Pressable>
        <ThemedText style={[styles.stepperValue, { color: colors.text }]}>{value}{suffix}</ThemedText>
        <Pressable onPress={() => canIncrement && onValueChange(value + step)}
          style={[styles.stepperButton, { backgroundColor: colors.background }, !canIncrement && styles.stepperButtonDisabled]}
          accessibilityLabel={`Increase ${label}`}>
          <Ionicons name="add" size={18} color={canIncrement ? colors.text : colors.border} />
        </Pressable>
      </View>
    </View>
  );
});

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  helperText?: string;
}

export const ToggleRow = memo(function ToggleRow({ label, value, onValueChange, helperText }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {helperText ? <ThemedText style={[styles.rowHelper, { color: colors.muted }]}>{helperText}</ThemedText> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.surface} />
    </View>
  );
});

interface NavigationRowProps {
  label: string;
  value?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const NavigationRow = memo(function NavigationRow({ label, value, onPress, icon }: NavigationRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable style={({ pressed }) => [styles.rowContainer, pressed && { backgroundColor: colors.background }]} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowLabelArea}>
        {icon && <View style={styles.navIconContainer}><Ionicons name={icon} size={18} color={colors.muted} /></View>}
        <ThemedText style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>{label}</ThemedText>
      </View>
      <View style={styles.navRight}>
        {value ? <ThemedText style={[styles.navValue, { color: colors.muted }]} numberOfLines={1}>{value}</ThemedText> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
});

export function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionHeaderText, { color: colors.muted }]}>{title}</ThemedText>
    </View>
  );
}

export function Separator() {
  const { colors } = useTheme();
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  rowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, minHeight: 52 },
  rowLabelArea: { flex: 1, flexDirection: 'column', marginRight: Spacing.sm },
  rowLabel: { ...Typography.body },
  rowHelper: { ...Typography.small, marginTop: Spacing.micro },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.sm },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepperButton: { width: 44, height: 44, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  stepperButtonDisabled: { opacity: 0.4 },
  stepperValue: { ...Typography.bodySemiBold, minWidth: 48, textAlign: 'center' },
  navIconContainer: { marginBottom: Spacing.micro },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs / 2 },
  navValue: { ...Typography.small },
  sectionHeader: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  sectionHeaderText: { ...Typography.caption, letterSpacing: 0.8 },
});
