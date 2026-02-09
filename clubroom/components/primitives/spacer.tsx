/**
 * Spacer — Fixed-size space between elements.
 *
 * Usage:
 *   <Spacer size="lg" />              // vertical 32px
 *   <Spacer size="sm" horizontal />   // horizontal 16px
 *   <Spacer size={12} />              // raw number escape hatch
 */

import React, { memo } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

type SpacingKey = keyof typeof Spacing;

export interface SpacerProps {
  size: SpacingKey | number;
  horizontal?: boolean;
}

export const Spacer = memo(function Spacer({ size, horizontal }: SpacerProps) {
  const px = typeof size === 'number' ? size : Spacing[size];
  return <View style={horizontal ? { width: px } : { height: px }} />;
});
