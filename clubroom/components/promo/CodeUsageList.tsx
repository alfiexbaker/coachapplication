import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { promoService } from '@/services/promo-service';
import type { PromoCodeUsage } from '@/constants/types';

interface CodeUsageListProps {
  /** Array of usage records to display */
  usage: PromoCodeUsage[];
  /** Whether data is loading */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Maximum number of items to show (for preview) */
  limit?: number;
  /** Show the code column (for user's redemption history) */
  showCode?: boolean;
  /** Show the user column (for code usage history) */
  showUser?: boolean;
}

function UsageItem({
  item,
  showCode,
  showUser,
}: {
  item: PromoCodeUsage;
  showCode: boolean;
  showUser: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatTimeAgo = (dateString: string): string => {
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
  };

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
}

export function CodeUsageList({
  usage,
  loading = false,
  emptyMessage = 'No redemptions yet',
  limit,
  showCode = false,
  showUser = true,
}: CodeUsageListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const displayUsage = limit ? usage.slice(0, limit) : usage;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading usage history...
        </ThemedText>
      </View>
    );
  }

  if (displayUsage.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={32} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          {emptyMessage}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayUsage.map((item) => (
        <UsageItem
          key={item.id}
          item={item}
          showCode={showCode}
          showUser={showUser}
        />
      ))}
      {limit && usage.length > limit && (
        <View style={styles.moreIndicator}>
          <ThemedText style={[styles.moreText, { color: palette.muted }]}>
            +{usage.length - limit} more redemptions
          </ThemedText>
        </View>
      )}
    </View>
  );
}

interface CodeUsageSummaryProps {
  /** Total redemptions */
  totalRedemptions: number;
  /** Total credits awarded */
  totalCreditsAwarded: number;
  /** Loading state */
  loading?: boolean;
}

export function CodeUsageSummary({
  totalRedemptions,
  totalCreditsAwarded,
  loading = false,
}: CodeUsageSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: { ...Typography.bodySmall },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emptyText: { ...Typography.bodySmall },
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
  moreIndicator: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  moreText: { ...Typography.smallSemiBold },
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
