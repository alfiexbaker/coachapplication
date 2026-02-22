import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface FamilyHighlightItem {
  athleteId: string;
  athleteName: string;
  sessionsAttended: number;
  streakWeeks: number;
  mostImprovedSkill?: string;
}

interface FamilyHighlightsProps {
  highlights: FamilyHighlightItem[];
}

function buildFooterCopy(count: number): string {
  if (count <= 1) {
    return 'Progress is building this month.';
  }
  if (count === 2) {
    return 'Both kids are progressing!';
  }
  return 'All kids are progressing in their own way!';
}

export const FamilyHighlights = memo(function FamilyHighlights({
  highlights,
}: FamilyHighlightsProps) {
  const { colors } = useTheme();

  if (highlights.length < 2) {
    return null;
  }

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <ThemedText style={styles.title}>Family Highlights</ThemedText>
        <Column gap="sm">
          {highlights.map((item) => (
            <Column
              key={item.athleteId}
              gap="xxs"
              style={[
                styles.highlightRow,
                {
                  borderColor: withAlpha(colors.border, 0.8),
                },
              ]}
            >
              <Row align="center" gap="xxs" wrap>
                <Ionicons name="person-circle-outline" size={14} color={colors.tint} />
                <ThemedText style={styles.metaStrong}>{item.athleteName}</ThemedText>
                <ThemedText style={[styles.meta, { color: colors.muted }]}>
                  {item.sessionsAttended} sessions
                </ThemedText>
                <Row align="center" gap="micro">
                  <Ionicons name="flame" size={12} color={colors.warning} />
                  <ThemedText style={[styles.meta, { color: colors.warning }]}>
                    {item.streakWeeks}
                  </ThemedText>
                </Row>
              </Row>
              <ThemedText style={[styles.subline, { color: colors.muted }]}>
                Most improved: {item.mostImprovedSkill ?? 'Consistent effort'}
              </ThemedText>
            </Column>
          ))}
        </Column>
        <ThemedText style={[styles.footer, { color: colors.success }]}>
          {buildFooterCopy(highlights.length)}
        </ThemedText>
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
  },
  highlightRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.xs,
  },
  metaStrong: {
    ...Typography.bodySmallSemiBold,
  },
  meta: {
    ...Typography.caption,
  },
  subline: {
    ...Typography.bodySmall,
  },
  footer: {
    ...Typography.bodySmallSemiBold,
  },
});
