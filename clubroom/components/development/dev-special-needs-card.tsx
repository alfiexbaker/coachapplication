import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Components, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

export interface DevSpecialNeedsCardProps {
  childProfile: ChildProfile | null;
  colors: ThemeColors;
  onPress: () => void;
}

export const DevSpecialNeedsCard = memo(function DevSpecialNeedsCard({
  childProfile,
  colors,
  onPress,
}: DevSpecialNeedsCardProps) {
  const hasNeeds = childProfile?.hasSpecialNeeds ?? false;
  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const totalItems = disabilityCount + allergyCount;
  const previewItems = [
    ...(childProfile?.disabilities.map((d) => d.type) ?? []),
    ...(childProfile?.allergies ?? []),
  ].slice(0, 3);

  return (
    <SurfaceCard tactile onPress={onPress} style={styles.card}>
      <Row gap="sm" align="center">
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: hasNeeds ? withAlpha(colors.tint, 0.09) : withAlpha(colors.muted, 0.06),
            },
          ]}
        >
          <Ionicons
            name="accessibility"
            size={Components.icon.md}
            color={hasNeeds ? colors.tint : colors.muted}
          />
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">Needs & Notes</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {hasNeeds
              ? `${totalItems} item${totalItems === 1 ? '' : 's'} recorded`
              : 'No accommodations recorded'}
          </ThemedText>
        </View>
        <View style={[styles.counter, { backgroundColor: withAlpha(colors.muted, 0.12) }]}>
          <ThemedText style={[styles.counterText, { color: colors.text }]}>{totalItems}</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={Components.icon.md} color={colors.icon} />
      </Row>

      {hasNeeds && previewItems.length > 0 && (
        <Row style={[styles.preview, { borderTopColor: withAlpha(colors.border, 0.3) }]}>
          {previewItems.map((item) => (
            <View key={item} style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.08) }]}>
              <ThemedText style={[styles.tagText, { color: colors.text }]}>{item}</ThemedText>
            </View>
          ))}
          {totalItems > previewItems.length && (
            <View style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.08) }]}>
              <ThemedText style={[styles.tagText, { color: colors.muted }]}>
                +{totalItems - previewItems.length} more
              </ThemedText>
            </View>
          )}
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  counter: {
    minWidth: Components.icon.lg,
    height: Components.icon.lg,
    borderRadius: Components.icon.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  counterText: {
    ...Typography.smallSemiBold,
  },
  preview: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  tag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
  tagText: {
    ...Typography.micro,
    textTransform: 'none',
  },
});
