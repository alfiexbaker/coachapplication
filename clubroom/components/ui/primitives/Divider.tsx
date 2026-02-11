/**
 * Divider Primitive
 *
 * Simple visual separator — horizontal by default, optionally vertical.
 *
 * Usage:
 *   <Divider />
 *   <Divider spacing={24} />
 *   <Divider vertical />
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DividerProps {
  /** Render as a vertical line instead of horizontal */
  vertical?: boolean;
  /** Margin around the divider (applies to both sides of the axis) */
  spacing?: number;
  /** Additional style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DividerInner({ vertical = false, spacing = 0, style }: DividerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: colors.border },
        vertical ? { marginHorizontal: spacing } : { marginVertical: spacing },
        style,
      ]}
    />
  );
}

export const Divider = React.memo(DividerInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
