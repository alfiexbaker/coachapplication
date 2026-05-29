/**
 * Row — Horizontal flex layout primitive.
 *
 * Replaces raw `View` + `flexDirection: 'row'` boilerplate.
 * Maps Spacing keys to design tokens automatically.
 *
 * Usage:
 *   <Row gap="sm" align="center" justify="between" padding="md">
 *     <Avatar />
 *     <ThemedText>Name</ThemedText>
 *   </Row>
 */

import React from 'react';
import {
  View,
  type ViewStyle,
  type StyleProp,
  type AccessibilityRole,
  type AccessibilityState,
} from 'react-native';

import { Spacing } from '@/constants/theme';

type SpacingKey = keyof typeof Spacing;

type AlignItems = 'start' | 'end' | 'center' | 'stretch' | 'baseline' | 'flex-start' | 'flex-end';

type JustifyContent =
  | 'start'
  | 'end'
  | 'center'
  | 'between'
  | 'around'
  | 'evenly'
  | 'flex-start'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

const alignMap: Record<AlignItems, ViewStyle['alignItems']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  baseline: 'baseline',
  'flex-start': 'flex-start',
  'flex-end': 'flex-end',
};

const justifyMap: Record<JustifyContent, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
  'flex-start': 'flex-start',
  'flex-end': 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
};

export interface RowProps {
  gap?: SpacingKey | number;
  align?: AlignItems;
  justify?: JustifyContent;
  padding?: SpacingKey | number;
  paddingH?: SpacingKey | number;
  paddingV?: SpacingKey | number;
  wrap?: boolean;
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

function resolveSpacing(value: SpacingKey | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return Spacing[value];
}

export const Row = function Row({
  gap,
  align,
  justify,
  padding,
  paddingH,
  paddingV,
  wrap,
  flex,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  testID,
}: RowProps) {
  const computed: ViewStyle = {
    flexDirection: 'row',
    gap: resolveSpacing(gap),
    alignItems: align ? alignMap[align] : undefined,
    justifyContent: justify ? justifyMap[justify] : undefined,
    padding: resolveSpacing(padding),
    paddingHorizontal: resolveSpacing(paddingH),
    paddingVertical: resolveSpacing(paddingV),
    flexWrap: wrap ? 'wrap' : undefined,
    flex: flex ? 1 : undefined,
  };

  return (
    <View
      style={[computed, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      {children}
    </View>
  );
};
