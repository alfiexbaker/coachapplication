/**
 * FilterToggle - On/off toggle for boolean filters.
 *
 * Displays label with switch control.
 * Optionally shows description text.
 */

import { View, Switch, StyleSheet } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface FilterToggleProps {
  /** Toggle label */
  label: string;
  /** Optional description */
  description?: string;
  /** Current value */
  value: boolean;
  /** Value change handler */
  onChange: (value: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
}

export function FilterToggle({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: FilterToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" justify="between" style={styles.container}>
      <View style={styles.labelContainer}>
        <ThemedText style={[styles.label, { color: palette.text }]}>
          {label}
        </ThemedText>
        {description && (
          <ThemedText style={[styles.description, { color: palette.muted }]}>
            {description}
          </ThemedText>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: palette.border, true: withAlpha(palette.tint, 0.5) }}
        thumbColor={value ? palette.tint : palette.surface}
        ios_backgroundColor={palette.border}
      />
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  labelContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
  description: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
});
