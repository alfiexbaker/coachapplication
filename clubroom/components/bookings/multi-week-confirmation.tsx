/**
 * Multi-Week Confirmation
 *
 * Summary view of selected weeks with total cost and a confirm CTA.
 * Displayed as a bottom sheet / overlay before final booking.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { WeekRow } from './multi-week-picker';
import { Row } from '@/components/primitives';

interface MultiWeekConfirmationProps {
  selectedWeeks: WeekRow[];
  coachName: string;
  sessionType: string;
  location: string;
  currency?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatWeekDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

const WeekSummaryRow = memo(function WeekSummaryRow({
  week,
  currency,
  palette,
}: {
  week: WeekRow;
  currency: string;
  palette: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Row style={[styles.weekSummaryRow, { borderBottomColor: palette.border }]}>
      <View style={styles.weekSummaryLeft}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
          {formatWeekDate(week.weekDate)}
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {formatTimeDisplay(week.startTime)} - {formatTimeDisplay(week.endTime)}
        </ThemedText>
      </View>
      <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
        {currency}
        {week.price}
      </ThemedText>
    </Row>
  );
});

export function MultiWeekConfirmation({
  selectedWeeks,
  coachName,
  sessionType,
  location,
  currency = '\u00A3',
  loading = false,
  onConfirm,
  onCancel,
}: MultiWeekConfirmationProps) {
  const { colors: palette } = useTheme();

  const totalCost = selectedWeeks.reduce((sum, w) => sum + w.price, 0);

  const handleConfirm = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onConfirm();
  }, [onConfirm]);

  return (
    <SurfaceCard style={styles.card} tactile={false}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
          Confirm {selectedWeeks.length} Week{selectedWeeks.length !== 1 ? 's' : ''}
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {sessionType} with {coachName}
        </ThemedText>
      </View>

      {/* Location */}
      {location ? (
        <Row style={[styles.locationBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="location-outline" size={16} color={palette.tint} />
          <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
            {location}
          </ThemedText>
        </Row>
      ) : null}

      {/* Week list */}
      <View style={styles.weekList}>
        {selectedWeeks.map((week) => (
          <WeekSummaryRow key={week.weekDate} week={week} currency={currency} palette={palette} />
        ))}
      </View>

      {/* Total */}
      <Row style={[styles.totalRow, { borderTopColor: palette.border }]}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
          Total
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
          {currency}
          {totalCost.toFixed(0)}
        </ThemedText>
      </Row>

      {/* Actions */}
      <Row style={styles.actions}>
        <Button variant="outline" onPress={onCancel} style={styles.cancelButton}>
          Back
        </Button>
        <Button
          variant="primary"
          onPress={handleConfirm}
          disabled={loading || selectedWeeks.length === 0}
          style={styles.confirmButton}
        >
          {loading
            ? 'Booking...'
            : `Confirm ${selectedWeeks.length} Week${selectedWeeks.length !== 1 ? 's' : ''}`}
        </Button>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  header: {
    gap: Spacing.micro,
  },
  locationBanner: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  weekList: {
    gap: 0,
  },
  weekSummaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekSummaryLeft: {
    gap: Spacing.micro,
  },
  totalRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});
