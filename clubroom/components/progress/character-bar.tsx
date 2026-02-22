import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

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
  const { width } = useWindowDimensions();
  const compact = width <= 390;
  if (universalSkills.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.border, 0.6),
          backgroundColor: withAlpha(colors.surface, 0.56),
        },
      ]}
    >
      <BlurView
        tint="systemThinMaterial"
        intensity={26}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <ThemedText style={styles.title}>Character</ThemedText>
      <Row wrap gap="xs">
        {universalSkills.map((entry) => (
          <View
            key={entry.skill}
            style={[
              styles.skillPill,
              compact ? styles.skillPillCompact : styles.skillPillWide,
              {
                borderColor: withAlpha(colors.border, 0.6),
                backgroundColor: withAlpha(colors.background, 0.55),
              },
            ]}
          >
            <Row align="center" justify="between">
              <Row align="center" gap="xxs" style={styles.skillLeft}>
                <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.border, 0.38) }]}>
                  <Ionicons
                    name={(POSITION_SKILL_ICONS[entry.skill] as keyof typeof Ionicons.glyphMap) ?? 'ellipse-outline'}
                    size={13}
                    color={withAlpha(colors.text, 0.78)}
                  />
                </View>
                <ThemedText style={styles.skillLabel} numberOfLines={1}>
                  {entry.skill}
                </ThemedText>
              </Row>
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
            <Row align="center" justify="between">
              <Row align="center" gap="xxs" style={styles.segmentRow}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <View
                    key={`${entry.skill}_${index}`}
                    style={[
                      styles.segment,
                      {
                        backgroundColor:
                          index < entry.rating
                            ? withAlpha(colors.tint, 0.76)
                            : withAlpha(colors.border, 0.42),
                      },
                    ]}
                  />
                ))}
              </Row>
              <ThemedText style={[styles.pointsText, { color: colors.muted }]}>
                {entry.rating}/5
              </ThemedText>
            </Row>
            <ThemedText style={[styles.skillValue, { color: colors.muted }]} numberOfLines={1}>
              {entry.ratingLabel}
            </ThemedText>
          </View>
        ))}
      </Row>
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
  skillPill: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    minHeight: 56,
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  skillPillWide: {
    flex: 1,
    minWidth: 86,
  },
  skillPillCompact: {
    width: '48%',
  },
  skillLeft: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillLabel: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  skillValue: {
    ...Typography.micro,
    fontWeight: '500',
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  segmentRow: {
    flex: 1,
  },
  segment: {
    height: 6,
    flex: 1,
    borderRadius: Radii.pill,
  },
  pointsText: {
    ...Typography.micro,
    fontWeight: '700',
    marginLeft: Spacing.xs,
    minWidth: 30,
    textAlign: 'right',
  },
});
