import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CardCosmetic, CosmeticId } from '@/hooks/use-card-cosmetics';
import { HapticPatterns } from '@/utils/haptics';

interface CosmeticSelectorProps {
  cosmetics: CardCosmetic[];
  selectedId: CosmeticId;
  onSelect: (id: CosmeticId) => void;
}

export const CosmeticSelector = memo(function CosmeticSelector({
  cosmetics,
  selectedId,
  onSelect,
}: CosmeticSelectorProps) {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (id: CosmeticId, unlocked: boolean) => {
      if (!unlocked) return;
      void HapticPatterns.tap();
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between">
          <Column gap="micro">
            <ThemedText style={styles.title}>Card Style</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
              Unlock styles by earning badges
            </ThemedText>
          </Column>
          <Ionicons name="color-palette-outline" size={20} color={colors.muted} />
        </Row>

        <Row gap="xs" style={styles.grid}>
          {cosmetics.map((cosmetic, index) => {
            const isSelected = cosmetic.id === selectedId;
            const locked = !cosmetic.unlocked;

            return (
              <Animated.View
                key={cosmetic.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.itemWrap}
              >
                <Clickable
                  onPress={() => handleSelect(cosmetic.id, cosmetic.unlocked)}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={
                    locked
                      ? `${cosmetic.label} — locked, need ${cosmetic.requiredBadges} badges`
                      : `${cosmetic.label} card style`
                  }
                  style={[
                    styles.item,
                    {
                      borderColor: isSelected
                        ? cosmetic.borderColors[0]
                        : withAlpha(colors.border, 0.5),
                      backgroundColor: isSelected
                        ? withAlpha(cosmetic.borderColors[0], 0.08)
                        : withAlpha(colors.surface, 0.5),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: locked
                          ? withAlpha(colors.border, 0.3)
                          : cosmetic.borderColors[0],
                      },
                    ]}
                  >
                    {locked ? (
                      <Ionicons name="lock-closed" size={12} color={colors.muted} />
                    ) : isSelected ? (
                      <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                    ) : null}
                  </View>

                  <ThemedText
                    style={[
                      styles.itemLabel,
                      { color: locked ? colors.muted : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {cosmetic.label}
                  </ThemedText>

                  {locked ? (
                    <ThemedText style={[styles.lockHint, { color: colors.muted }]}>
                      {cosmetic.requiredBadges} badges
                    </ThemedText>
                  ) : null}
                </Clickable>
              </Animated.View>
            );
          })}
        </Row>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  grid: {
    flexWrap: 'wrap',
  },
  itemWrap: {
    width: '30%',
    marginBottom: Spacing.xs,
  },
  item: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xxs,
    minHeight: 72,
    justifyContent: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    ...Typography.micro,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockHint: {
    ...Typography.micro,
    fontSize: Typography.micro.fontSize,
  },
});
