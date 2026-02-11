import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { PromoCodeUsage } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { UsageItem } from './code-usage-list-sections';

// Re-export extracted components for backward compat
export { formatTimeAgo, UsageItem, CodeUsageSummary } from './code-usage-list-sections';
export type { UsageItemProps, CodeUsageSummaryProps } from './code-usage-list-sections';

interface CodeUsageListProps {
  usage: PromoCodeUsage[];
  loading?: boolean;
  emptyMessage?: string;
  limit?: number;
  showCode?: boolean;
  showUser?: boolean;
}

export function CodeUsageList({
  usage,
  loading = false,
  emptyMessage = 'No redemptions yet',
  limit,
  showCode = false,
  showUser = true,
}: CodeUsageListProps) {
  const { colors: palette } = useTheme();

  const displayUsage = limit ? usage.slice(0, limit) : usage;

  if (loading) {
    return (
      <Row align="center" justify="center" gap="sm" style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading usage history...
        </ThemedText>
      </Row>
    );
  }

  if (displayUsage.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={32} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{emptyMessage}</ThemedText>
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
          palette={palette}
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

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  loadingContainer: {
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
  moreIndicator: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  moreText: { ...Typography.smallSemiBold },
});
