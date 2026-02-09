import { useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { packageService } from '@/services/package-service';
import type { PackagePurchase } from '@/constants/types';

// Re-export extracted components for backward compat
export { getStatusColor, getStatusLabel, PurchaseListItem } from './my-packages-sections';
export type { PurchaseListItemProps } from './my-packages-sections';

import { PurchaseListItem } from './my-packages-sections';

const logger = createLogger('MyPackages');

export interface MyPackagesProps {
  activeOnly?: boolean;
  limit?: number;
  onPackagePress?: (purchase: PackagePurchase) => void;
  showHeader?: boolean;
  onViewAll?: () => void;
}

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

      <View style={styles.list}>
        {purchases.map((purchase, index) => (
          <PurchaseListItem
            key={purchase.id}
            purchase={purchase}
            index={index}
            onPress={onPackagePress}
            palette={palette}
          />
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
});

export default MyPackages;
