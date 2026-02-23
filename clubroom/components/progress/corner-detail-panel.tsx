import { memo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillLevel } from '@/services/progress-service';
import type { FourCornerDisplay } from '@/types/progress-types';

interface CornerDetailPanelProps {
  corner: FourCornerDisplay;
  skills: SkillLevel[];
}

function mapTrendIcon(trend: SkillLevel['trend']): {
  name: ComponentProps<typeof Ionicons>['name'];
  label: string;
} {
  switch (trend) {
    case 'improving':
      return { name: 'trending-up', label: 'Improving' };
    case 'declining':
      return { name: 'trending-down', label: 'Declining' };
    case 'steady':
    default:
      return { name: 'remove', label: 'Steady' };
  }
}

function toDotScore(level: number): number {
  return Math.max(1, Math.min(5, Math.ceil(level / 2)));
}

export const CornerDetailPanel = memo(function CornerDetailPanel({
  corner,
  skills,
}: CornerDetailPanelProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutUp.duration(220)}>
      <SurfaceCard
        style={[
          styles.card,
          {
            borderColor: withAlpha(corner.color, 0.35),
            backgroundColor: withAlpha(corner.color, 0.08),
          },
        ]}
      >
        <Column gap="xs">
          <Row align="center" gap="xs">
            <Ionicons
              name={corner.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={18}
              color={corner.color}
            />
            <ThemedText style={styles.title}>{corner.label} Skills</ThemedText>
          </Row>

          {skills.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              No tracked skills yet in this corner.
            </ThemedText>
          ) : (
            <Column gap="xxs">
              {skills.map((skill, index) => {
                const trend = mapTrendIcon(skill.trend);
                const dotScore = toDotScore(skill.level);

                return (
                  <Animated.View
                    key={skill.skill}
                    entering={FadeInDown.delay(index * 50).duration(220)}
                  >
                    <Row
                      align="center"
                      justify="between"
                      style={[styles.skillRow, { borderColor: withAlpha(colors.border, 0.6) }]}
                    >
                      <Column gap="xxs" style={styles.skillInfo}>
                        <ThemedText style={styles.skillName}>{skill.skill}</ThemedText>
                        <Row align="center" gap="xxs">
                          <Ionicons name={trend.name} size={12} color={colors.muted} />
                          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
                            {trend.label}
                          </ThemedText>
                        </Row>
                      </Column>

                      <Row align="center" gap="xxs">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <View
                            key={`${skill.skill}-${dot}`}
                            style={[
                              styles.dot,
                              {
                                backgroundColor:
                                  dot <= dotScore
                                    ? withAlpha(corner.color, 0.95)
                                    : withAlpha(colors.border, 0.35),
                              },
                            ]}
                          />
                        ))}
                      </Row>
                    </Row>
                  </Animated.View>
                );
              })}
            </Column>
          )}
        </Column>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  title: {
    ...Typography.bodySmallSemiBold,
  },
  emptyText: {
    ...Typography.bodySmall,
  },
  skillRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skillInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  skillName: {
    ...Typography.bodySmallSemiBold,
  },
  metaText: {
    ...Typography.caption,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
});
