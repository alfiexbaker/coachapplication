/**
 * Chip Primitive
 *
 * Pressable selection chip with optional icon and remove button.
 *
 * Usage:
 *   <Chip label="Tennis" selected onPress={toggle} />
 *   <Chip label="U12" icon="people" onPress={toggle} />
 *   <Chip label="Filter" removable onRemove={handleRemove} />
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Components, Fonts, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChipProps {
  /** Chip label text */
  label: string;
  /** Whether the chip is selected */
  selected?: boolean;
  /** Press handler (toggle selection) */
  onPress?: () => void;
  /** Ionicons icon name rendered before the label */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show a remove "x" button */
  removable?: boolean;
  /** Handler for the remove button */
  onRemove?: () => void;
  /** Disable interactions */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ChipInner({
  label,
  selected = false,
  onPress,
  icon,
  removable = false,
  onRemove,
  disabled = false,
}: ChipProps) {
  const { colors } = useTheme();
  const handleRemove = useCallback(() => {
    onRemove?.();
  }, [onRemove]);

  const themedStyles = useMemo(
    () => ({
      selected: {
        backgroundColor: withAlpha(colors.tint, 0.06),
        borderColor: colors.tint,
      },
      unselected: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
    }),
    [colors],
  );

  const iconColor = selected ? colors.tint : colors.muted;

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? themedStyles.selected : themedStyles.unselected,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
      ]}
    >
      <Row align="center" gap="xxs">
        {icon ? (
          <Ionicons
            name={icon}
            size={Components.icon.sm}
            color={iconColor}
          />
        ) : null}

        <Text
          style={[
            styles.label,
            { color: iconColor },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {removable ? (
          <Clickable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
            onPress={handleRemove}
            hitSlop={8}
            style={styles.removeButton}
          >
            <Ionicons
              name="close-circle"
              size={Components.icon.sm}
              color={iconColor}
            />
          </Clickable>
        ) : null}
      </Row>
    </Clickable>
  );
}

export const Chip = React.memo(ChipInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Components.chip.paddingHorizontal,
    paddingVertical: Components.chip.paddingVertical,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Typography.small,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
  removeButton: {
    marginLeft: Spacing.micro,
  },
});
