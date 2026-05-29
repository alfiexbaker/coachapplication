/**
 * Column — Vertical flex layout primitive.
 *
 * Provides gap/padding props mapped to Spacing tokens.
 * Default flexDirection is column (React Native default), so this mainly
 * adds convenient token-based spacing.
 *
 * Usage:
 *   <Column gap="md" padding="sm">
 *     <Section title="Teams" />
 *     <TeamList />
 *   </Column>
 */

import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';

import { Spacing } from '@/constants/theme';

type SpacingKey = keyof typeof Spacing;

export interface ColumnProps {
  gap?: SpacingKey | number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  padding?: SpacingKey | number;
  paddingH?: SpacingKey | number;
  paddingV?: SpacingKey | number;
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function resolveSpacing(value: SpacingKey | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return Spacing[value];
}

export const Column = function Column({
  gap,
  align,
  justify,
  padding,
  paddingH,
  paddingV,
  flex,
  style,
  children,
}: ColumnProps) {
  const computed: ViewStyle = {
    gap: resolveSpacing(gap),
    alignItems: align,
    justifyContent: justify,
    padding: resolveSpacing(padding),
    paddingHorizontal: resolveSpacing(paddingH),
    paddingVertical: resolveSpacing(paddingV),
    flex: flex ? 1 : undefined,
  };

  return <View style={[computed, style]}>{children}</View>;
};
