import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { Button } from '@/components/primitives/button';

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
  const [previewId, setPreviewId] = useState<CosmeticId>(selectedId);

  useEffect(() => {
    setPreviewId(selectedId);
  }, [selectedId]);

  const handlePreviewSelect = useCallback(
    (id: CosmeticId, unlocked: boolean) => {
      if (!unlocked) {
        const lockedCosmetic = cosmetics.find((cosmetic) => cosmetic.id === id);
        Alert.alert(
          'Style locked',
          lockedCosmetic
            ? `${lockedCosmetic.label} unlocks at ${lockedCosmetic.requiredBadges} badges.`
            : 'Earn more badges to unlock this style.',
        );
        return;
      }
      void HapticPatterns.tap();
      setPreviewId(id);
    },
    [cosmetics],
  );

  const hasChanges = previewId !== selectedId;
  const previewCosmetic = useMemo(
    () => cosmetics.find((cosmetic) => cosmetic.id === previewId) ?? null,
    [cosmetics, previewId],
  );

  const handleApply = useCallback(() => {
    if (!hasChanges) return;
    void HapticPatterns.tap();
    onSelect(previewId);
  }, [hasChanges, onSelect, previewId]);

  const handleReset = useCallback(() => {
    setPreviewId(selectedId);
  }, [selectedId]);

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

        <View
          style={[
            styles.previewCard,
            {
              borderColor: previewCosmetic
                ? withAlpha(previewCosmetic.borderColors[0], 0.4)
                : withAlpha(colors.border, 0.5),
              backgroundColor: previewCosmetic
                ? withAlpha(previewCosmetic.borderColors[0], 0.08)
                : withAlpha(colors.surface, 0.5),
            },
          ]}
        >
          <Row align="center" justify="between">
            <Column gap="micro">
              <ThemedText style={styles.previewLabel}>Preview</ThemedText>
              <ThemedText style={[styles.previewValue, { color: colors.text }]}>
                {previewCosmetic?.label ?? 'Selected style'}
              </ThemedText>
            </Column>
            <View
              style={[
                styles.previewSwatch,
                {
                  backgroundColor: previewCosmetic?.borderColors[0] ?? colors.tint,
                  borderColor: withAlpha(colors.onPrimary, 0.35),
                },
              ]}
            />
          </Row>
        </View>

        <Row gap="xs" style={styles.grid}>
          {cosmetics.map((cosmetic, index) => {
            const isSelected = cosmetic.id === selectedId;
            const isPreview = cosmetic.id === previewId;
            const locked = !cosmetic.unlocked;

            return (
              <Animated.View
                key={cosmetic.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.itemWrap}
              >
                <Clickable
                  onPress={() => handlePreviewSelect(cosmetic.id, cosmetic.unlocked)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    locked
                      ? `${cosmetic.label} — locked, need ${cosmetic.requiredBadges} badges`
                      : `${cosmetic.label} card style`
                  }
                  accessibilityHint={
                    locked ? 'Shows unlock requirement' : 'Applies this card style'
                  }
                  style={[
                    styles.item,
                    {
                      borderColor: isSelected
                        ? cosmetic.borderColors[0]
                        : isPreview
                        ? cosmetic.borderColors[0]
                        : withAlpha(colors.border, 0.5),
                      backgroundColor: isSelected || isPreview
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
                    ) : isPreview ? (
                      <Ionicons name="eye-outline" size={12} color={colors.onPrimary} />
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
        <Row gap="xs">
          <Button
            variant="secondary"
            onPress={handleReset}
            disabled={!hasChanges}
            style={styles.actionButton}
          >
            Reset
          </Button>
          <Button
            onPress={handleApply}
            disabled={!hasChanges}
            style={styles.actionButton}
          >
            Apply
          </Button>
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
  previewCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  previewLabel: {
    ...Typography.caption,
  },
  previewValue: {
    ...Typography.bodySmallSemiBold,
  },
  previewSwatch: {
    width: 30,
    height: 42,
    borderRadius: Radii.sm,
    borderWidth: 1,
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
  actionButton: {
    flex: 1,
  },
});
