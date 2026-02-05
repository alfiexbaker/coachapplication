import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CreatePackageForm } from '@/components/packages/CreatePackageForm';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

const logger = createLogger('ManagePackagesScreen');

/**
 * Coach package management screen - create, edit, and delete packages
 */
export default function ManagePackagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);
  const [stats, setStats] = useState({
    totalPackagesSold: 0,
    totalRevenue: 0,
    activePackages: 0,
    sessionsRedeemed: 0,
  });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [packagesData, statsData] = await Promise.all([
        packageService.getCoachPackages(currentUser.id),
        packageService.getCoachPackageStats(currentUser.id),
      ]);
      setPackages(packagesData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load packages:', error);
      showToast('Failed to load packages', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, showToast]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateSuccess = (pkg: SessionPackage) => {
    setShowCreateModal(false);
    setEditingPackage(null);
    showToast(editingPackage ? 'Package updated successfully!' : 'Package created successfully!', 'success');
    loadData();
  };

  const handleCreateError = (error: string) => {
    showToast(error, 'error');
  };

  const handleEditPackage = (pkg: SessionPackage) => {
    setEditingPackage(pkg);
    setShowCreateModal(true);
  };

  const handleToggleActive = async (pkg: SessionPackage) => {
    try {
      const updated = await packageService.updatePackage(pkg.id, { isActive: !pkg.isActive });
      if (updated) {
        showToast(
          pkg.isActive ? 'Package deactivated' : 'Package activated',
          'success'
        );
        loadData();
      }
    } catch {
      showToast('Failed to update package', 'error');
    }
  };

  const handleDeletePackage = (pkg: SessionPackage) => {
    Alert.alert(
      'Delete Package',
      `Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await packageService.deletePackage(pkg.id);
              if (success) {
                showToast('Package deleted', 'success');
                loadData();
              }
            } catch {
              showToast('Failed to delete package', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Manage Packages</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Create and manage session bundles
          </ThemedText>
        </View>
        <Clickable
          onPress={() => {
            setEditingPackage(null);
            setShowCreateModal(true);
          }}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
      >
        {/* Stats Overview */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <ThemedText type="defaultSemiBold" style={styles.statsTitle}>
              Package Performance
            </ThemedText>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText type="heading" style={[styles.statValue, { color: palette.tint }]}>
                  {stats.totalPackagesSold}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Sold
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="heading" style={[styles.statValue, { color: palette.success }]}>
                  {packageService.formatPrice(stats.totalRevenue)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Revenue
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="heading" style={[styles.statValue, { color: palette.warning }]}>
                  {stats.sessionsRedeemed}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Redeemed
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Package List */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Packages ({packages.length})
          </ThemedText>

          {packages.length === 0 ? (
            <EmptyState
              icon="pricetags-outline"
              title="No Packages Yet"
              message="Create your first session package to offer discounted bundles to your clients"
              actionLabel="Create Package"
              onPressAction={() => {
                setEditingPackage(null);
                setShowCreateModal(true);
              }}
            />
          ) : (
            <View style={styles.packageList}>
              {packages.map((pkg, index) => (
                <Animated.View key={pkg.id} entering={FadeInDown.delay(index * 50 + 100).springify()}>
                  <SurfaceCard style={styles.packageCard}>
                    <View style={styles.packageHeader}>
                      <View style={styles.packageInfo}>
                        <ThemedText type="defaultSemiBold" style={styles.packageName}>
                          {pkg.name}
                        </ThemedText>
                        <View style={styles.packageMeta}>
                          <ThemedText style={[styles.packageMetaText, { color: palette.muted }]}>
                            {pkg.sessionCount} sessions
                          </ThemedText>
                          <View style={[styles.dot, { backgroundColor: palette.muted }]} />
                          <ThemedText style={[styles.packageMetaText, { color: palette.muted }]}>
                            {packageService.formatPrice(pkg.price, pkg.currency)}
                          </ThemedText>
                          {pkg.discountPercent > 0 && (
                            <>
                              <View style={[styles.dot, { backgroundColor: palette.muted }]} />
                              <ThemedText style={[styles.packageMetaText, { color: palette.success }]}>
                                {pkg.discountPercent}% off
                              </ThemedText>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: pkg.isActive ? `${palette.success}15` : `${palette.error}15`,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.statusText,
                            { color: pkg.isActive ? palette.success : palette.error },
                          ]}
                        >
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.packageActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: palette.border }]}
                        onPress={() => handleEditPackage(pkg)}
                      >
                        <Ionicons name="create-outline" size={18} color={palette.tint} />
                        <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                          Edit
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: palette.border }]}
                        onPress={() => handleToggleActive(pkg)}
                      >
                        <Ionicons
                          name={pkg.isActive ? 'pause-outline' : 'play-outline'}
                          size={18}
                          color={pkg.isActive ? palette.warning : palette.success}
                        />
                        <ThemedText
                          style={[
                            styles.actionText,
                            { color: pkg.isActive ? palette.warning : palette.success },
                          ]}
                        >
                          {pkg.isActive ? 'Deactivate' : 'Activate'}
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: palette.border }]}
                        onPress={() => handleDeletePackage(pkg)}
                      >
                        <Ionicons name="trash-outline" size={18} color={palette.error} />
                      </TouchableOpacity>
                    </View>
                  </SurfaceCard>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingPackage(null);
        }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]} edges={['top']}>
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              {editingPackage ? 'Edit Package' : 'Create Package'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={() => {
                setShowCreateModal(false);
                setEditingPackage(null);
              }}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <CreatePackageForm
            editPackage={editingPackage || undefined}
            onSuccess={handleCreateSuccess}
            onError={handleCreateError}
            onCancel={() => {
              setShowCreateModal(false);
              setEditingPackage(null);
            }}
          />
        </SafeAreaView>
      </Modal>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
  },
  statsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsTitle: {
    fontSize: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
  },
  packageList: {
    gap: Spacing.sm,
  },
  packageCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  packageInfo: {
    flex: 1,
    gap: 4,
  },
  packageName: {
    fontSize: 15,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageMetaText: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  packageActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
