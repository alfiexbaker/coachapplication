import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Components, Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EarningsProjectionProps {
  /** Confirmed earnings for the current month (already completed sessions). */
  confirmedEarnings: number;
  /** Pending earnings from booked-but-not-yet-completed sessions. */
  pendingEarnings: number;
  /** Projected total for the month (confirmed + pending + estimate). */
  projectedTotal: number;
  /** Name of the session type that earns the most. */
  bestSessionType?: string;
  /** Day of the week with the most bookings. */
  busiestDay?: string;
  /** Percentage of clients who rebook (0-100). */
  repeatRate?: number;
  /** Currency symbol (defaults to GBP). */
  currencySymbol?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, symbol: string) {
  return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EarningsProjection({
  confirmedEarnings,
  pendingEarnings,
  projectedTotal,
  bestSessionType,
  busiestDay,
  repeatRate,
  currencySymbol = '\u00A3',
}: EarningsProjectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Bar widths as a percentage of the projected total
  const maxBarTotal = projectedTotal > 0 ? projectedTotal : 1;
  const confirmedPct = Math.min((confirmedEarnings / maxBarTotal) * 100, 100);
  const pendingPct = Math.min((pendingEarnings / maxBarTotal) * 100, 100);

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="trending-up" size={Components.icon.md} color={palette.success} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            This Month
          </ThemedText>
          <ThemedText style={[Typography.title, { color: palette.text }]}>
            {formatCurrency(projectedTotal, currencySymbol)}
          </ThemedText>
        </View>
      </View>

      {/* Bar visualisation */}
      <View style={styles.barSection}>
        <View style={[styles.barTrack, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.barSegment,
              {
                width: `${confirmedPct}%`,
                backgroundColor: palette.success,
                borderTopLeftRadius: Radii.sm,
                borderBottomLeftRadius: Radii.sm,
              },
            ]}
          />
          <View
            style={[
              styles.barSegment,
              {
                width: `${pendingPct}%`,
                backgroundColor: palette.warning,
              },
            ]}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Confirmed {formatCurrency(confirmedEarnings, currencySymbol)}
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.warning }]} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Pending {formatCurrency(pendingEarnings, currencySymbol)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
        {bestSessionType ? (
          <View style={styles.statItem}>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Best Session
            </ThemedText>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {bestSessionType}
            </ThemedText>
          </View>
        ) : null}

        {busiestDay ? (
          <View style={styles.statItem}>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Busiest Day
            </ThemedText>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {busiestDay}
            </ThemedText>
          </View>
        ) : null}

        {repeatRate != null ? (
          <View style={styles.statItem}>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Repeat Rate
            </ThemedText>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {repeatRate}%
            </ThemedText>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  barSection: {
    gap: Spacing.xs,
  },
  barTrack: {
    height: Spacing.xs,
    borderRadius: Radii.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  legendDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Spacing.xs / 2,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    gap: Spacing.micro,
  },
});
