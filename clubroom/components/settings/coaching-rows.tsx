import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
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

export const Stepper = function Stepper({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  suffix,
  helperText,
}: StepperProps) {
  const { colors } = useTheme();
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <Row align="center" justify="space-between" style={styles.rowContainerPadding}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {helperText ? (
          <ThemedText style={[styles.rowHelper, { color: colors.muted }]}>{helperText}</ThemedText>
        ) : null}
      </View>
      <Row align="center" gap="xs">
        <Clickable
          onPress={() => canDecrement && onValueChange(value - step)}
          style={[
            styles.stepperButton,
            { backgroundColor: colors.background },
            !canDecrement && styles.stepperButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDecrement }}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color={canDecrement ? colors.text : colors.border} />
        </Clickable>
        <ThemedText style={[styles.stepperValue, { color: colors.text }]}>
          {value}
          {suffix}
        </ThemedText>
        <Clickable
          onPress={() => canIncrement && onValueChange(value + step)}
          style={[
            styles.stepperButton,
            { backgroundColor: colors.background },
            !canIncrement && styles.stepperButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canIncrement }}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color={canIncrement ? colors.text : colors.border} />
        </Clickable>
      </Row>
    </Row>
  );
};

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  helperText?: string;
}

export const ToggleRow = function ToggleRow({
  label,
  value,
  onValueChange,
  helperText,
}: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <Row align="center" justify="space-between" style={styles.rowContainerPadding}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={[styles.rowLabel, { color: colors.text }]}>{label}</ThemedText>
        {helperText ? (
          <ThemedText style={[styles.rowHelper, { color: colors.muted }]}>{helperText}</ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.success }}
        thumbColor={colors.surface}
      />
    </Row>
  );
};

interface NavigationRowProps {
  label: string;
  value?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const NavigationRow = function NavigationRow({
  label,
  value,
  onPress,
  icon,
}: NavigationRowProps) {
  const { colors } = useTheme();
  return (
    <Clickable
      style={({ pressed }) => [
        styles.rowContainer,
        pressed && { backgroundColor: colors.background },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowLabelArea}>
        {icon && (
          <View style={styles.navIconContainer}>
            <Ionicons name={icon} size={18} color={colors.muted} />
          </View>
        )}
        <ThemedText style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
      <Row align="center" gap={4}>
        {value ? (
          <ThemedText style={[styles.navValue, { color: colors.muted }]} numberOfLines={1}>
            {value}
          </ThemedText>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Row>
    </Clickable>
  );
};

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
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  rowContainerPadding: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  rowLabelArea: { flex: 1, marginRight: Spacing.sm },
  rowLabel: { ...Typography.body },
  rowHelper: { ...Typography.small, marginTop: Spacing.micro },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.sm },
  stepperControl: {
    /* layout moved to Row */
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: { opacity: 0.4 },
  stepperValue: { ...Typography.bodySemiBold, minWidth: 48, textAlign: 'center' },
  navIconContainer: { marginBottom: Spacing.micro },
  navRight: {
    /* layout moved to Row */
  },
  navValue: { ...Typography.small },
  sectionHeader: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionHeaderText: { ...Typography.caption, letterSpacing: 0.8 },
});
