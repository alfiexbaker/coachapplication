import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POSITION_SKILL_ICONS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { UniversalSkillRating } from '@/types/progress-types';

interface CharacterBarProps {
  universalSkills: UniversalSkillRating[];
}

export const CharacterBar = memo(function CharacterBar({ universalSkills }: CharacterBarProps) {
  const { colors } = useTheme();
  if (universalSkills.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.border, 0.5),
          backgroundColor: withAlpha(colors.surface, 0.65),
        },
      ]}
    >
      <ThemedText style={styles.title}>Character</ThemedText>
      <Column gap="xxs">
        {universalSkills.map((entry, index) => (
          <View
            key={entry.skill}
            style={[
              styles.skillRow,
              index < universalSkills.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(colors.border, 0.4) }
                : undefined,
            ]}
          >
            <Row align="center" justify="between">
              <Row align="center" gap="xs" style={styles.skillLeft}>
                <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.border, 0.38) }]}>
                  <Ionicons
                    name={(POSITION_SKILL_ICONS[entry.skill] as keyof typeof Ionicons.glyphMap) ?? 'ellipse-outline'}
                    size={14}
                    color={withAlpha(colors.text, 0.78)}
                  />
                </View>
                <ThemedText style={styles.skillLabel}>
                  {entry.skill}
                </ThemedText>
              </Row>
              <Row align="center" gap="xs">
                <ThemedText style={[styles.ratingText, { color: colors.text }]}>
                  {entry.rating}/5
                </ThemedText>
                <View
                  style={[
                    styles.trendDot,
                    {
                      backgroundColor:
                        entry.trend === 'improving'
                          ? withAlpha(colors.success, 0.82)
                          : withAlpha(colors.border, 0.72),
                      borderColor: withAlpha(colors.background, 0.85),
                    },
                  ]}
                />
              </Row>
            </Row>
          </View>
        ))}
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.bodySmallSemiBold,
  },
  skillRow: {
    minHeight: 44,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
  },
  skillLeft: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flexShrink: 1,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
