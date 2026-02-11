/**
 * FilterChip - Single selectable filter chip.
 *
 * The atomic building block of the filter system.
 * Can be used standalone or composed into groups.
 */

import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, Components, Borders, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface FilterChipProps {
  /** Chip label text */
  label: string;
  /** Is this chip currently selected/active */
  active?: boolean;
  /** Press handler */
  onPress: () => void;
  /** Optional icon name (Ionicons) */
  icon?: string;
  /** Show checkmark when active (default: false) */
  showCheckmark?: boolean;
  /** Show dropdown chevron (default: false) */
  showChevron?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Disabled state */
  disabled?: boolean;
  /** Optional count badge */
  count?: number;
}

export function FilterChip({
  label,
  active = false,
  onPress,
  icon,
  showCheckmark = false,
  showChevron = false,
  size = 'md',
  disabled = false,
  count,
}: FilterChipProps) {
  const { colors: palette } = useTheme();

  const iconSize = size === 'sm' ? 14 : Components.icon.sm;
  const height = size === 'sm' ? 32 : Components.button.height;

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          height,
          backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
          borderColor: active ? palette.tint : palette.border,
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
        },
        size === 'sm' ? styles.chipSm : undefined,
      ]}
    >
      <Row align="center" gap={Spacing.xs / 2}>
        {icon && (
          <Ionicons
            name={(active ? icon.replace('-outline', '') : icon) as keyof typeof Ionicons.glyphMap}
            size={iconSize}
            color={active ? palette.tint : palette.muted}
          />
        )}

        <ThemedText
          style={[
            styles.label,
            size === 'sm' ? styles.labelSm : undefined,
            { color: active ? palette.tint : palette.muted },
            active ? styles.labelActive : undefined,
          ]}
        >
          {label}
          {count !== undefined && count > 0 && ` (${count})`}
        </ThemedText>

        {showCheckmark && active && (
          <Ionicons name="checkmark" size={iconSize} color={palette.tint} />
        )}

        {showChevron && active && (
          <Ionicons name="chevron-down" size={12} color={palette.tint} />
        )}
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: Borders.width.thin,
  },
  chipSm: {
    paddingHorizontal: Spacing.xs,
  },
  label: {
    ...Typography.small,
    fontWeight: '500',
  },
  labelSm: { ...Typography.caption },
  labelActive: {
    fontWeight: '600',
  },
});
