import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PackageList } from '@/components/packages/PackageList';
import { MyPackages } from '@/components/packages/MyPackages';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

type TabType = 'browse' | 'my-packages';

/**
 * Main packages screen - browse available packages or view purchased packages
 */
export default function PackagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCoach = currentUser?.role === 'COACH';

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await packageService.discoverPackages();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPackages();
    }, [loadPackages])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  };

  const handlePackagePress = (pkg: SessionPackage) => {
    router.push({
      pathname: '/packages/[id]',
      params: { id: pkg.id },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
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
            onPress={() => router.push('/packages/manage')}
            style={[styles.manageButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </Clickable>
        )}
      </View>

      {/* Tab Navigation - Only for non-coaches */}
      {!isCoach && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'browse' && [styles.tabActive, { borderColor: palette.tint }],
            ]}
            onPress={() => setActiveTab('browse')}
          >
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
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'my-packages' && [styles.tabActive, { borderColor: palette.tint }],
            ]}
            onPress={() => setActiveTab('my-packages')}
          >
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
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
      >
        {activeTab === 'browse' || isCoach ? (
          <>
            {/* Info Banner */}
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <SurfaceCard style={[styles.infoBanner, { backgroundColor: `${palette.success}08` }]}>
                <View style={[styles.infoIcon, { backgroundColor: `${palette.success}15` }]}>
                  <Ionicons name="gift-outline" size={20} color={palette.success} />
                </View>
                <View style={styles.infoContent}>
                  <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
                    Save with Bundles
                  </ThemedText>
                  <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                    Buy 5 or 10 sessions at a discounted rate. Use them for future bookings with your coach.
                  </ThemedText>
                </View>
              </SurfaceCard>
            </Animated.View>

            {/* Package List */}
            <PackageList
              packages={packages}
              loading={loading}
              onPackagePress={handlePackagePress}
              showCoach={true}
              title="Available Packages"
              subtitle="From all coaches"
              emptyMessage="No packages available at the moment. Check back later!"
            />
          </>
        ) : (
          /* My Packages Tab */
          <MyPackages
            showHeader={false}
            onPackagePress={(purchase) => {
              // Could navigate to a purchase detail screen
              router.push({
                pathname: '/packages/[id]',
                params: { id: purchase.packageId },
              });
            }}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 15,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
