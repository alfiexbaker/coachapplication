import { forwardRef, memo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
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
    const rows: StatRowData[] = [
      { icon: 'calendar-outline', label: 'Sessions', value: `${summary.sessionsAttended}` },
      { icon: 'trending-up-outline', label: 'Skills Improved', value: `${summary.skillsImproved}` },
      { icon: 'ribbon-outline', label: 'Badges Earned', value: `${summary.badgesEarned}` },
      { icon: 'checkmark-circle-outline', label: 'Goals Completed', value: `${summary.goalsCompleted}` },
    ];

    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        {/* Header gradient band */}
        <View style={styles.header}>
          <Column gap="xxs" align="center">
            <ThemedText style={styles.headerMonth}>{monthTitle}</ThemedText>
            <ThemedText style={styles.headerName}>{athleteName}</ThemedText>
          </Column>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {rows.map((row) => (
            <View key={row.label} style={styles.statCell}>
              <Ionicons name={row.icon} size={18} color="#6366F1" />
              <ThemedText style={styles.statCellValue}>{row.value}</ThemedText>
              <ThemedText style={styles.statCellLabel}>{row.label}</ThemedText>
            </View>
          ))}
        </View>

        {/* Coach quote */}
        {coachQuote ? (
          <View style={styles.quoteSection}>
            <ThemedText style={styles.quoteText}>"{coachQuote}"</ThemedText>
            {coachName ? (
              <ThemedText style={styles.quoteName}>— Coach {coachName}</ThemedText>
            ) : null}
          </View>
        ) : null}

        {/* Branding */}
        <View style={styles.brandStrip}>
          <Row align="center" justify="center" gap="xxs">
            <Ionicons name="football" size={12} color="#94A3B8" />
            <ThemedText style={styles.brandText}>clubroom</ThemedText>
          </Row>
        </View>
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  card: {
    width: 360,
    backgroundColor: '#0F0F1A',
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
  },
  headerMonth: {
    ...Typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerName: {
    ...Typography.title,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  statCell: {
    width: '47%',
    backgroundColor: withAlpha('#FFFFFF', 0.05),
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  statCellValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statCellLabel: {
    ...Typography.micro,
    color: '#94A3B8',
    fontWeight: '600',
  },
  quoteSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  quoteText: {
    ...Typography.bodySmall,
    color: withAlpha('#FFFFFF', 0.8),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteName: {
    ...Typography.caption,
    color: '#6366F1',
    textAlign: 'center',
    fontWeight: '600',
  },
  brandStrip: {
    paddingVertical: Spacing.xs,
    backgroundColor: withAlpha('#FFFFFF', 0.03),
    alignItems: 'center',
  },
  brandText: {
    ...Typography.micro,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
