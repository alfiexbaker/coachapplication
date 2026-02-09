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

  return (
    <SurfaceCard tactile onPress={onPress} style={styles.card}>
      <Row gap="sm" align="center">
        <View style={[
          styles.iconContainer,
          { backgroundColor: hasNeeds ? withAlpha(colors.warning, 0.09) : withAlpha(colors.muted, 0.06) },
        ]}>
          <Ionicons
            name="accessibility"
            size={Components.icon.md}
            color={hasNeeds ? colors.warning : colors.muted}
          />
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">Special Needs & Notes</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {hasNeeds
              ? `${disabilityCount} disabilities, ${allergyCount} allergies`
              : 'No accommodations documented'}
          </ThemedText>
        </View>
        <Row gap="xs">
          <View style={[
            styles.counter,
            { backgroundColor: disabilityCount > 0 ? colors.warning : withAlpha(colors.muted, 0.12) },
          ]}>
            <ThemedText style={[styles.counterText, { color: disabilityCount > 0 ? colors.onPrimary : colors.muted }]}>
              {disabilityCount}
            </ThemedText>
          </View>
          <View style={[
            styles.counter,
            { backgroundColor: allergyCount > 0 ? colors.error : withAlpha(colors.muted, 0.12) },
          ]}>
            <ThemedText style={[styles.counterText, { color: allergyCount > 0 ? colors.onPrimary : colors.muted }]}>
              {allergyCount}
            </ThemedText>
          </View>
        </Row>
        <Ionicons name="chevron-forward" size={Components.icon.md} color={colors.icon} />
      </Row>

      {hasNeeds && disabilityCount > 0 && (
        <View style={[styles.preview, { borderTopColor: withAlpha(colors.border, 0.3) }]}>
          {childProfile!.disabilities.slice(0, 2).map((d) => (
            <View key={d.id} style={[styles.tag, { backgroundColor: withAlpha(colors.warning, 0.07) }]}>
              <ThemedText style={[styles.tagText, { color: colors.warning }]}>{d.type}</ThemedText>
            </View>
          ))}
          {childProfile!.allergies.slice(0, 2).map((a, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: withAlpha(colors.error, 0.07) }]}>
              <ThemedText style={[styles.tagText, { color: colors.error }]}>{a}</ThemedText>
            </View>
          ))}
        </View>
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
    ...Typography.caption,
  },
  preview: {
    flexDirection: 'row',
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
