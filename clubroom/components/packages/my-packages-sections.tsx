import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { packageService } from '@/services/package-service';
import type { PackagePurchase, PackagePurchaseStatus } from '@/constants/types';

/* ---------- Helpers ---------- */

export function getStatusColor(status: PackagePurchaseStatus, palette: ThemeColors): string {
  switch (status) {
    case 'ACTIVE':
      return palette.success;
    case 'EXPIRED':
      return palette.error;
    case 'EXHAUSTED':
      return palette.warning;
    case 'REFUNDED':
      return palette.muted;
    default:
      return palette.muted;
  }
}

export function getStatusLabel(status: PackagePurchaseStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'EXPIRED':
      return 'Expired';
    case 'EXHAUSTED':
      return 'All Used';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

/* ---------- PurchaseListItem ---------- */

export interface PurchaseListItemProps {
  purchase: PackagePurchase;
  index: number;
  onPress?: (purchase: PackagePurchase) => void;
  palette: ThemeColors;
}

export const PurchaseListItem = memo(function PurchaseListItem({
  purchase,
  index,
  onPress,
  palette,
}: PurchaseListItemProps) {
  const statusColor = getStatusColor(purchase.status, palette);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard
        style={styles.purchaseCard}
        onPress={onPress ? () => onPress(purchase) : undefined}
      >
        <Row justify="space-between" align="center">
          <View style={styles.purchaseInfo}>
            <ThemedText type="defaultSemiBold" style={styles.purchaseName} numberOfLines={1}>
              {purchase.packageId}
            </ThemedText>
            <ThemedText style={[styles.coachName, { color: palette.muted }]}>
              {purchase.coachId}
            </ThemedText>

            <Row align="center" gap="sm" style={styles.progressRow}>
              <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: palette.success,
                      width: `${(purchase.sessionsUsed / purchase.sessionsTotal) * 100}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.progressText, { color: palette.muted }]}>
                {purchase.sessionsRemaining}/{purchase.sessionsTotal} left
              </ThemedText>
            </Row>
          </View>

          <View style={styles.purchaseStatus}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: withAlpha(statusColor, 0.09) },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(purchase.status)}
              </ThemedText>
            </View>
            {purchase.status === 'ACTIVE' && (
              <ThemedText style={[styles.expiryText, { color: palette.muted }]}>
                {packageService.formatExpirationDate(purchase.expiresAt)}
              </ThemedText>
            )}
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  purchaseCard: {
    padding: Spacing.md,
  },
  purchaseInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  purchaseName: { ...Typography.body },
  coachName: { ...Typography.caption },
  progressRow: {
    marginTop: Spacing.xxs,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  progressText: { ...Typography.caption, minWidth: 50, textAlign: 'right' },
  purchaseStatus: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
    marginLeft: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  expiryText: { ...Typography.caption },
});
