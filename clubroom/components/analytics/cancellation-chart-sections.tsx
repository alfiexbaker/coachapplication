import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { CancellationReason } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Constants ──────────────────────────────────────────────────

export const REASON_LABELS: Record<CancellationReason, string> = {
  CLIENT_REQUEST: 'Client Request',
  WEATHER: 'Weather',
  ILLNESS: 'Illness',
  SCHEDULING_CONFLICT: 'Scheduling',
  NO_SHOW: 'No Show',
  COACH_CANCELLED: 'Coach Cancelled',
  OTHER: 'Other',
};

export const REASON_ICONS: Record<CancellationReason, keyof typeof Ionicons.glyphMap> = {
  CLIENT_REQUEST: 'person-outline',
  WEATHER: 'rainy-outline',
  ILLNESS: 'medical-outline',
  SCHEDULING_CONFLICT: 'calendar-outline',
  NO_SHOW: 'close-circle-outline',
  COACH_CANCELLED: 'person-remove-outline',
  OTHER: 'help-circle-outline',
};

// ─── ReasonsBreakdown ───────────────────────────────────────────

export interface ReasonsBreakdownProps {
  byReason: { reason: CancellationReason; count: number; percentage: number }[];
  maxReasonCount: number;
  palette: ThemeColors;
}

export const ReasonsBreakdown = memo(function ReasonsBreakdown({
  byReason,
  maxReasonCount,
  palette,
}: ReasonsBreakdownProps) {
  if (byReason.length === 0) return null;

  return (
    <View style={styles.reasonsSection}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>By Reason</ThemedText>
      <View style={styles.reasonsList}>
        {byReason.map((reason) => (
          <Row key={reason.reason} style={styles.reasonRow}>
            <Row style={styles.reasonInfo}>
              <Ionicons
                name={REASON_ICONS[reason.reason]}
                size={16}
                color={palette.muted}
                style={styles.reasonIcon}
              />
              <ThemedText style={styles.reasonLabel}>{REASON_LABELS[reason.reason]}</ThemedText>
            </Row>
            <View style={[styles.reasonBarContainer, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.reasonBar,
                  {
                    width: `${(reason.count / maxReasonCount) * 100}%`,
                    backgroundColor: withAlpha(palette.error, 0.38),
                  },
                ]}
              />
            </View>
            <ThemedText style={styles.reasonCount}>{reason.count}</ThemedText>
            <ThemedText style={[styles.reasonPercent, { color: palette.muted }]}>
              ({reason.percentage}%)
            </ThemedText>
          </Row>
        ))}
      </View>
    </View>
  );
});

// ─── DayOfWeekBreakdown ─────────────────────────────────────────

export interface DayOfWeekBreakdownProps {
  byDayOfWeek: { dayOfWeek: number; dayName: string; count: number }[];
  palette: ThemeColors;
}

export const DayOfWeekBreakdown = memo(function DayOfWeekBreakdown({
  byDayOfWeek,
  palette,
}: DayOfWeekBreakdownProps) {
  if (byDayOfWeek.length === 0) return null;

  return (
    <View style={[styles.daysSection, { borderTopColor: palette.border }]}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
        By Day of Week
      </ThemedText>
      <Row style={styles.daysList}>
        {byDayOfWeek.map((day) => (
          <View key={day.dayOfWeek} style={styles.dayItem}>
            <ThemedText style={styles.dayName}>{day.dayName.slice(0, 3)}</ThemedText>
            <View style={[styles.dayBadge, { backgroundColor: withAlpha(palette.error, 0.12) }]}>
              <ThemedText style={[styles.dayCount, { color: palette.error }]}>
                {day.count}
              </ThemedText>
            </View>
          </View>
        ))}
      </Row>
    </View>
  );
});

// ─── NoticeFooter ───────────────────────────────────────────────

export interface NoticeFooterProps {
  avgNoticeHours: number;
  palette: ThemeColors;
}

export const NoticeFooter = memo(function NoticeFooter({
  avgNoticeHours,
  palette,
}: NoticeFooterProps) {
  return (
    <Row style={[styles.noticeSection, { borderTopColor: palette.border }]}>
      <Ionicons name="alarm-outline" size={16} color={palette.muted} />
      <ThemedText style={[styles.noticeText, { color: palette.muted }]}>
        Average notice: <ThemedText style={styles.noticeValue}>{avgNoticeHours}h</ThemedText> before
        session
      </ThemedText>
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  reasonsSection: {
    marginBottom: Spacing.md,
  },
  reasonsList: {
    gap: Spacing.sm,
  },
  reasonRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasonInfo: {
    alignItems: 'center',
    width: 100,
  },
  reasonIcon: {
    marginRight: Spacing.xxs,
  },
  reasonLabel: { ...Typography.smallSemiBold, flex: 1 },
  reasonBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  reasonBar: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  reasonCount: { ...Typography.smallSemiBold, width: 24, textAlign: 'right' },
  reasonPercent: { ...Typography.caption, width: 36, textAlign: 'right' },
  daysSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.md,
  },
  daysList: {
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dayName: { ...Typography.caption },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
    minWidth: 28,
    alignItems: 'center',
  },
  dayCount: { ...Typography.caption },
  noticeSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  noticeText: { ...Typography.small },
  noticeValue: {
    fontWeight: '600',
  },
});
