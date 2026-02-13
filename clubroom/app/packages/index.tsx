import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { PackageList } from '@/components/packages/PackageList';
import { MyPackages } from '@/components/packages/MyPackages';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

type TabType = 'browse' | 'my-packages';

/**
 * Main packages screen - browse available packages or view purchased packages
 */
export default function PackagesScreen() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('browse');

  const isCoach = currentUser?.role === 'COACH';

  const loadPackages = useCallback(async () => {
    return packageService.discoverPackages();
  }, []);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<SessionPackage[]>({
    load: loadPackages,
    deps: [],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
  });

  const packages = data ?? [];

  const handleOpenPackage = useCallback((packageId: string) => {
    router.push(Routes.package(packageId));
  }, []);
  const handleOpenManagePackages = useCallback(() => {
    router.push(Routes.PACKAGES_MANAGE);
  }, []);
  const handlePackagePress = useCallback(
    (pkg: SessionPackage) => {
      handleOpenPackage(pkg.id);
    },
    [handleOpenPackage],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Session Packages</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Save with session bundles
          </ThemedText>
        </View>
        {isCoach && (
          <Clickable
            accessibilityLabel="Manage packages"
            onPress={handleOpenManagePackages}
            style={[styles.manageButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="settings-outline" size={18} color={palette.onPrimary} />
          </Clickable>
        )}
      </Row>

      {/* Tab Navigation - Only for non-coaches */}
      {!isCoach && (
        <Row gap="sm" style={styles.tabContainer}>
          <Clickable
            style={[
              styles.tab,
              activeTab === 'browse' && [
                styles.tabActive,
                { borderColor: palette.tint, backgroundColor: palette.surfaceSecondary },
              ],
            ]}
            onPress={() => setActiveTab('browse')}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons
                name="pricetags-outline"
                size={18}
                color={activeTab === 'browse' ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === 'browse' ? palette.tint : palette.muted },
                ]}
              >
                Browse
              </ThemedText>
            </Row>
          </Clickable>

          <Clickable
            style={[
              styles.tab,
              activeTab === 'my-packages' && [
                styles.tabActive,
                { borderColor: palette.tint, backgroundColor: palette.surfaceSecondary },
              ],
            ]}
            onPress={() => setActiveTab('my-packages')}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons
                name="wallet-outline"
                size={18}
                color={activeTab === 'my-packages' ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  { color: activeTab === 'my-packages' ? palette.tint : palette.muted },
                ]}
              >
                My Packages
              </ThemedText>
            </Row>
          </Clickable>
        </Row>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {activeTab === 'browse' || isCoach ? (
          <>
            {/* Info Banner */}
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <SurfaceCard
                style={[styles.infoBanner, { backgroundColor: withAlpha(palette.success, 0.03) }]}
              >
                <Row align="start" gap="md">
                  <View
                    style={[styles.infoIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}
                  >
                    <Ionicons name="gift-outline" size={20} color={palette.success} />
                  </View>
                  <View style={styles.infoContent}>
                    <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
                      Save with Bundles
                    </ThemedText>
                    <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                      Buy 5 or 10 sessions at a discounted rate. Use them for future bookings with
                      your coach.
                    </ThemedText>
                  </View>
                </Row>
              </SurfaceCard>
            </Animated.View>

            {/* Package List */}
            {status === 'loading' ? (
              <LoadingState variant="list" />
            ) : status === 'error' ? (
              <ErrorState message={error?.message ?? 'Failed to load packages.'} onRetry={retry} />
            ) : status === 'empty' ? (
              <EmptyState
                icon="pricetags-outline"
                title="No packages available"
                message="Coaches have not published any packages yet. Pull down to refresh."
              />
            ) : (
              <PackageList
                packages={packages}
                loading={false}
                onPackagePress={handlePackagePress}
                showCoach={true}
                title="Available Packages"
                subtitle="From all coaches"
                emptyMessage="No packages available at the moment. Check back later!"
              />
            )}
          </>
        ) : (
          /* My Packages Tab */
          <MyPackages
            showHeader={false}
            onPackagePress={(purchase) => handleOpenPackage(purchase.packageId)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    ...Typography.bodySmallSemiBold,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
  },
  infoBanner: {
    padding: Spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  infoTitle: {
    ...Typography.body,
  },
  infoText: {
    ...Typography.small,
  },
});
