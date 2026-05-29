/** InviteChildHeader — shows which child(ren) an invite is for (multi-child parents only). */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildInfo } from '@/types/child-context';

interface InviteChildHeaderProps {
  /** athleteIds from the invite */
  childIds: string[];
  /** From useChildContext() */
  getChildById: (id: string) => ChildInfo | undefined;
  /** True if parent has 2+ children */
  isMultiChild: boolean;
}

export const InviteChildHeader = function InviteChildHeader({
  childIds,
  getChildById,
  isMultiChild,
}: InviteChildHeaderProps) {
  const { colors } = useTheme();

  if (!isMultiChild || childIds.length === 0) return null;

  const resolvedChildren: ChildInfo[] = [];
  for (const id of childIds) {
    const child = getChildById(id);
    if (child) resolvedChildren.push(child);
  }

  if (resolvedChildren.length === 0) return null;

  const label =
    resolvedChildren.length === 1
      ? `This invite is for ${resolvedChildren[0].name}`
      : `For ${resolvedChildren.map((c) => c.name).join(' + ')}`;

  return (
    <Animated.View entering={FadeInDown.delay(40).springify()}>
      <SurfaceCard style={s.card}>
        <Row gap="md" align="center" accessibilityLabel={label}>
          <Row gap="xxs">
            {resolvedChildren.map((child) => (
              <View
                key={child.id}
                style={[s.avatar, { backgroundColor: withAlpha(child.colorCode, 0.12) }]}
              >
                <ThemedText style={[s.initials, { color: child.colorCode }]}>
                  {child.initials}
                </ThemedText>
              </View>
            ))}
          </Row>
          <ThemedText style={[s.label, { color: colors.text }]}>{label}</ThemedText>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: { padding: Spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...Typography.caption },
  label: { ...Typography.bodySmallSemiBold, flex: 1 },
});
