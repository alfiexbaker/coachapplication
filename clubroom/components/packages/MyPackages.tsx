import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { packageService } from '@/services/package-service';
import type { PackagePurchase, PackagePurchaseStatus } from '@/constants/types';

const logger = createLogger('MyPackages');

/**
 * Props for the MyPackages component
 */
export interface MyPackagesProps {
  /** Whether to show only active packages */
  activeOnly?: boolean;
  /** Maximum number of packages to show */
  limit?: number;
  /** Callback when a package is pressed */
  onPackagePress?: (purchase: PackagePurchase) => void;
  /** Whether to show header */
  showHeader?: boolean;
  /** Callback to view all packages */
  onViewAll?: () => void;
}

/**
 * Component for displaying a user's purchased packages.
 * Shows session count, expiration, and status.
 */
export function MyPackages({
  activeOnly = false,
  limit,
  onPackagePress,
  showHeader = true,
  onViewAll,
}: MyPackagesProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [purchases, setPurchases] = useState<PackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadPurchases() {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
          const data = activeOnly
            ? await packageService.getActiveUserPackages(currentUser.id)
            : await packageService.getUserPackages(currentUser.id);
          setPurchases(limit ? data.slice(0, limit) : data);
        } catch (error) {
          logger.error('Failed to load purchases', error);
        } finally {
          setLoading(false);
        }
      }
      loadPurchases();
    }, [currentUser?.id, activeOnly, limit])
  );

  const getStatusColor = (status: PackagePurchaseStatus) => {
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
  };

  const getStatusLabel = (status: PackagePurchaseStatus) => {
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
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading your packages...
        </ThemedText>
      </View>
    );
  }

  if (purchases.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              My Packages
            </ThemedText>
          </View>
        )}
        <EmptyState
          icon="pricetags-outline"
          title="No Packages Yet"
          message="Purchase a session package to save on training sessions"
          actionLabel="Browse Packages"
          onPressAction={() => router.push(Routes.PACKAGES)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            My Packages
          </ThemedText>
          {onViewAll && purchases.length > 0 && (
            <Pressable onPress={onViewAll}>
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {/* Purchase List */}
      <View style={styles.list}>
        {purchases.map((purchase, index) => (
          <Animated.View key={purchase.id} entering={FadeInDown.delay(index * 50).springify()}>
            <SurfaceCard
              style={styles.purchaseCard}
              onPress={onPackagePress ? () => onPackagePress(purchase) : undefined}
            >
              <View style={styles.purchaseContent}>
                {/* Left: Package Info */}
                <View style={styles.purchaseInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.purchaseName} numberOfLines={1}>
                    {purchase.packageName}
                  </ThemedText>
                  <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                    {purchase.coachName}
                  </ThemedText>

                  {/* Session Progress */}
                  <View style={styles.progressRow}>
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
                  </View>
                </View>

                {/* Right: Status & Expiry */}
                <View style={styles.purchaseStatus}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: withAlpha(getStatusColor(purchase.status), 0.09) },
                    ]}
                  >
                    <ThemedText
                      style={[styles.statusText, { color: getStatusColor(purchase.status) }]}
                    >
                      {getStatusLabel(purchase.status)}
                    </ThemedText>
                  </View>
                  {purchase.status === 'ACTIVE' && (
                    <ThemedText style={[styles.expiryText, { color: palette.muted }]}>
                      {packageService.formatExpirationDate(purchase.expiresAt)}
                    </ThemedText>
                  )}
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: { ...Typography.bodySmall },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...Typography.heading },
  viewAllText: { ...Typography.bodySmallSemiBold },
  list: {
    gap: Spacing.sm,
  },
  purchaseCard: {
    padding: Spacing.md,
  },
  purchaseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  purchaseName: { ...Typography.body },
  coachName: { ...Typography.caption },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  progressText: { ...Typography.caption, minWidth: 50,
    textAlign: 'right' },
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
  statusText: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  expiryText: { ...Typography.caption },
});

export default MyPackages;
