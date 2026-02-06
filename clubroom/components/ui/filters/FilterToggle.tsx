/**
 * FilterToggle - On/off toggle for boolean filters.
 *
 * Displays label with switch control.
 * Optionally shows description text.
 */

import { View, Switch, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
