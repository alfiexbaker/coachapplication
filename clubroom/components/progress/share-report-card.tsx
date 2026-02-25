import { forwardRef, memo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MonthSummary } from '@/types/progress-types';

interface ShareReportCardProps {
  athleteName: string;
  monthTitle: string;
  summary: MonthSummary;
  coachQuote?: string;
  coachName?: string;
}

interface StatRowData {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

export const ShareReportCard = memo(
  forwardRef<View, ShareReportCardProps>(function ShareReportCard(
    { athleteName, monthTitle, summary, coachQuote, coachName },
    ref,
  ) {
    const { colors } = useTheme();
    const rows: StatRowData[] = [
      { icon: 'calendar-outline', label: 'Sessions', value: `${summary.sessionsAttended}` },
      { icon: 'trending-up-outline', label: 'Skills Improved', value: `${summary.skillsImproved}` },
      { icon: 'ribbon-outline', label: 'Badges Earned', value: `${summary.badgesEarned}` },
      { icon: 'checkmark-circle-outline', label: 'Goals Completed', value: `${summary.goalsCompleted}` },
    ];

    return (
      <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: colors.background }]}>
        {/* Header gradient band */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Column gap="xxs" align="center">
            <ThemedText style={[styles.headerMonth, { color: colors.muted }]}>{monthTitle}</ThemedText>
            <ThemedText style={[styles.headerName, { color: colors.text }]}>{athleteName}</ThemedText>
          </Column>
        </View>

        {/* Stats grid */}
        <Row wrap style={styles.statsGrid}>
          {rows.map((row) => (
            <View key={row.label} style={[styles.statCell, { backgroundColor: withAlpha(colors.tint, 0.05) }]}>
              <Ionicons name={row.icon} size={18} color={colors.tint} />
              <ThemedText style={[styles.statCellValue, { color: colors.text }]}>{row.value}</ThemedText>
              <ThemedText style={[styles.statCellLabel, { color: colors.muted }]}>{row.label}</ThemedText>
            </View>
          ))}
        </Row>

        {/* Coach quote */}
        {coachQuote ? (
          <View style={styles.quoteSection}>
            <ThemedText style={[styles.quoteText, { color: withAlpha(colors.text, 0.8) }]}>"{coachQuote}"</ThemedText>
            {coachName ? (
              <ThemedText style={[styles.quoteName, { color: colors.tint }]}>— Coach {coachName}</ThemedText>
            ) : null}
          </View>
        ) : null}

        {/* Branding */}
        <View style={[styles.brandStrip, { backgroundColor: withAlpha(colors.border, 0.3) }]}>
          <Row align="center" justify="center" gap="xxs">
            <Ionicons name="football" size={12} color={colors.muted} />
            <ThemedText style={[styles.brandText, { color: colors.muted }]}>clubroom</ThemedText>
          </Row>
        </View>
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  card: {
    width: 360,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  headerMonth: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerName: {
    ...Typography.title,
    fontWeight: '800',
  },
  statsGrid: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  statCell: {
    width: '47%',
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statCellValue: {
    fontSize: Typography.hero.fontSize,
    fontWeight: '800',
  },
  statCellLabel: {
    ...Typography.micro,
    fontWeight: '600',
  },
  quoteSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  quoteText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteName: {
    ...Typography.caption,
    textAlign: 'center',
    fontWeight: '600',
  },
  brandStrip: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  brandText: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
