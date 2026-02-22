import { memo, type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS } from '@/constants/position-skills';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FourCornerRatings, PositionRole } from '@/types/progress-types';
import type { BadgeCategory } from '@/constants/user-types';

interface CornerDotsCompactProps {
  corners: FourCornerRatings | null;
  effort: number;
  positionPlayed?: PositionRole;
}

export const CornerDotsCompact = memo(function CornerDotsCompact({
  corners,
  effort,
  positionPlayed,
}: CornerDotsCompactProps) {
  const { colors } = useTheme();
  const labels: Record<BadgeCategory, string> = positionPlayed
    ? {
        technical: POSITION_LABELS[positionPlayed],
        physical: 'Work Rate',
        psychological: 'Mindset',
        social: 'Communication',
      }
    : {
        technical: 'Technical',
        physical: 'Physical',
        psychological: 'Psychological',
        social: 'Social',
      };
  const entries = corners
    ? [
        {
          key: 'technical' as BadgeCategory,
          label: labels.technical,
          icon: 'football-outline',
          value: corners.technical,
        },
        {
          key: 'physical' as BadgeCategory,
          label: labels.physical,
          icon: 'fitness-outline',
          value: corners.physical,
        },
        {
          key: 'psychological' as BadgeCategory,
          label: labels.psychological,
          icon: 'bulb-outline',
          value: corners.psychological,
        },
        {
          key: 'social' as BadgeCategory,
          label: labels.social,
          icon: 'people-outline',
          value: corners.social,
        },
      ]
    : [];

  return (
    <Column gap="xxs">
      {entries.length > 0 ? (
        <Row wrap gap="xxs">
          {entries.map((entry) => (
            <Row
              key={entry.key}
              align="center"
              gap="xxs"
              style={[
                styles.badge,
                {
                  borderColor: withAlpha(CORNER_COLORS[entry.key], 0.3),
                  backgroundColor: withAlpha(CORNER_COLORS[entry.key], 0.08),
                },
              ]}
            >
              <Ionicons
                name={entry.icon as ComponentProps<typeof Ionicons>['name']}
                size={12}
                color={CORNER_COLORS[entry.key]}
              />
              <ThemedText style={styles.badgeText}>
                {entry.label} {entry.value}/5
              </ThemedText>
            </Row>
          ))}
        </Row>
      ) : null}
      <Row align="center" gap="xxs">
        <Ionicons name="flash-outline" size={12} color={colors.muted} />
        <ThemedText style={[styles.effortText, { color: colors.muted }]}>
          Effort {effort}/5
        </ThemedText>
      </Row>
    </Column>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    minHeight: 24,
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
  },
  effortText: {
    ...Typography.caption,
  },
});
