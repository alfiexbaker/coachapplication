import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PositionRole } from '@/types/progress-types';

interface PositionToggleProps {
  positions: Array<{ role: PositionRole; sessionCount: number }>;
  selected: PositionRole;
  onChange: (role: PositionRole) => void;
}

export const PositionToggle = memo(function PositionToggle({
  positions,
  selected,
  onChange,
}: PositionToggleProps) {
  const { colors } = useTheme();
  if (positions.length <= 1) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: withAlpha(colors.border, 0.75),
          backgroundColor: withAlpha(colors.surface, 0.52),
        },
      ]}
    >
      <BlurView
        tint="systemThinMaterial"
        intensity={30}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Row gap="xs">
          {positions.map((item) => {
            const active = item.role === selected;
            const positionLabel = POSITION_LABELS[item.role];
            return (
              <Clickable
                key={item.role}
                onPress={() => onChange(item.role)}
                style={[
                  styles.pill,
                  {
                    borderColor: active
                      ? withAlpha(colors.tint, 0.55)
                      : withAlpha(colors.border, 0.85),
                    backgroundColor: active
                      ? withAlpha(colors.tint, 0.2)
                      : withAlpha(colors.background, 0.5),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Show ${POSITION_LABELS[item.role]} progress`}
                accessibilityState={{ selected: active }}
              >
                <Row align="center" justify="between" gap="xs">
                  <Row align="center" gap="xxs" style={styles.leftMeta}>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={14} color={withAlpha(colors.muted, 0.8)} />
                    )}
                    <ThemedText
                      style={[
                        styles.text,
                        {
                          color: colors.text,
                          fontWeight: active ? '700' : '600',
                        },
                      ]}
                    >
                      {positionLabel}
                    </ThemedText>
                  </Row>
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: active
                          ? withAlpha(colors.tint, 0.18)
                          : withAlpha(colors.background, 0.58),
                        borderColor: active
                          ? withAlpha(colors.tint, 0.35)
                          : withAlpha(colors.border, 0.65),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.countText,
                        {
                          color: active ? colors.text : colors.muted,
                        },
                      ]}
                    >
                      {item.sessionCount}
                    </ThemedText>
                  </View>
                </Row>
              </Clickable>
            );
          })}
        </Row>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  scroll: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  pill: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    minWidth: 150,
  },
  leftMeta: {
    flexShrink: 1,
  },
  text: {
    ...Typography.caption,
    letterSpacing: 0.1,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  countText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
