/**
 * Center — Centers children both horizontally and vertically.
 *
 * Usage:
 *   <Center flex>
 *     <LoadingScreen />
 *   </Center>
 *
 *   <Center padding="md">
 *     <EmptyState ... />
 *   </Center>
 */

import React, { memo } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';

import { Spacing } from '@/constants/theme';

type SpacingKey = keyof typeof Spacing;

export interface CenterProps {
  flex?: boolean;
  padding?: SpacingKey | number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const Center = memo(function Center({ flex, padding, style, children }: CenterProps) {
  const px =
    padding === undefined ? undefined : typeof padding === 'number' ? padding : Spacing[padding];

  const computed: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    flex: flex ? 1 : undefined,
    padding: px,
  };

  return <View style={[computed, style]}>{children}</View>;
});
