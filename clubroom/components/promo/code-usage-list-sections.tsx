import { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { promoService } from '@/services/promo-service';
import type { PromoCodeUsage } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Helpers ────────────────────────────────────────────────────

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return promoService.formatDate(dateString);
}

// ─── UsageItem ──────────────────────────────────────────────────

export interface UsageItemProps {
  item: PromoCodeUsage;
  showCode: boolean;
  showUser: boolean;
  palette: ThemeColors;
}

export const UsageItem = memo(function UsageItem({
  item,
  showCode,
  showUser,
  palette,
}: UsageItemProps) {
  return (
    <View style={styles.usageItem}>
      <View style={[styles.usageIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Ionicons name="checkmark-circle" size={20} color={palette.success} />
      </View>
      <View style={styles.usageContent}>
        <View style={styles.usageRow}>
          {showUser && (
            <ThemedText style={styles.userName} numberOfLines={1}>
              {item.userName || 'Unknown User'}
            </ThemedText>
          )}
          {showCode && (
            <ThemedText style={[styles.codeLabel, { color: palette.tint }]}>
              {item.code}
            </ThemedText>
          )}
          <ThemedText style={[styles.usageTime, { color: palette.muted }]}>
            {formatTimeAgo(item.usedAt)}
          </ThemedText>
        </View>
        <ThemedText style={[styles.creditAmount, { color: palette.success }]}>
          +{promoService.formatCredit(item.creditAmount)}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── CodeUsageSummary ───────────────────────────────────────────

export interface CodeUsageSummaryProps {
  totalRedemptions: number;
  totalCreditsAwarded: number;
  loading?: boolean;
}

export const CodeUsageSummary = memo(function CodeUsageSummary({
  totalRedemptions,
  totalCreditsAwarded,
  loading = false,
}: CodeUsageSummaryProps) {
  const { colors: palette } = useTheme();

  if (loading) {
    return (
      <SurfaceCard style={styles.summaryCard}>
        <ActivityIndicator size="small" color={palette.tint} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="people-outline" size={20} color={palette.tint} />
          </View>
          <View>
            <ThemedText type="subtitle" style={styles.summaryValue}>
              {totalRedemptions}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
              Redemptions
            </ThemedText>
          </View>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="cash-outline" size={20} color={palette.success} />
          </View>
          <View>
            <ThemedText type="subtitle" style={styles.summaryValue}>
              {promoService.formatCredit(totalCreditsAwarded)}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
              Credits Awarded
            </ThemedText>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  usageIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageRow: {
    flex: 1,
    gap: Spacing.micro,
  },
  userName: { ...Typography.bodySmallSemiBold },
  codeLabel: { ...Typography.caption },
  usageTime: { ...Typography.caption },
  creditAmount: { ...Typography.bodySmallSemiBold },
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { ...Typography.heading },
  summaryLabel: { ...Typography.caption },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.md,
  },
});
