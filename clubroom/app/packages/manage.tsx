/**
 * Manage Packages Screen
 *
 * Coach package management — create, edit, toggle, delete session bundles.
 * All state/logic in usePackageManage hook.
 */

import { View, StyleSheet, ScrollView, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { EmptyState } from '@/components/ui/empty-state';
import { CreatePackageForm } from '@/components/packages/CreatePackageForm';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePackageManage } from '@/hooks/use-package-manage';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

export default function ManagePackagesScreen() {
  const { colors: palette } = useTheme();
  const c = usePackageManage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Manage Packages</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>Create and manage session bundles</ThemedText>
        </View>
        <Clickable accessibilityLabel="Create package" onPress={c.openCreateModal} style={[styles.addButton, { backgroundColor: palette.tint }]}>
          <Ionicons name="add" size={20} color={palette.onPrimary} />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} tintColor={palette.tint} />}>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <ThemedText type="defaultSemiBold" style={styles.statsTitle}>Package Performance</ThemedText>
            <View style={styles.statsGrid}>
              {[
                { value: c.stats.totalPackagesSold, label: 'Sold', color: palette.tint },
                { value: packageService.formatPrice(c.stats.totalRevenue), label: 'Revenue', color: palette.success },
                { value: c.stats.sessionsRedeemed, label: 'Redeemed', color: palette.warning },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <ThemedText type="heading" style={[styles.statValue, { color: s.color }]}>{s.value}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{s.label}</ThemedText>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Package List */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Your Packages ({c.packages.length})</ThemedText>
          {c.packages.length === 0 ? (
            <EmptyState icon="pricetags-outline" title="No Packages Yet"
              message="Create your first session package to offer discounted bundles to your clients"
              actionLabel="Create Package" onPressAction={c.openCreateModal} />
          ) : (
            <View style={styles.packageList}>
              {c.packages.map((pkg, index) => (
                <PackageCard key={pkg.id} pkg={pkg} index={index}
                  onEdit={c.handleEditPackage} onToggle={c.handleToggleActive} onDelete={c.handleDeletePackage} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={c.showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={c.closeModal}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]} edges={['top']}>
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>{c.editingPackage ? 'Edit Package' : 'Create Package'}</ThemedText>
            <Clickable accessibilityLabel="Close" style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]} onPress={c.closeModal}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <CreatePackageForm editPackage={c.editingPackage || undefined}
            onSuccess={c.handleCreateSuccess} onError={c.handleCreateError} onCancel={c.closeModal} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PackageCard({ pkg, index, onEdit, onToggle, onDelete }: {
  pkg: SessionPackage; index: number;
  onEdit: (p: SessionPackage) => void; onToggle: (p: SessionPackage) => void; onDelete: (p: SessionPackage) => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 50 + 100).springify()}>
      <SurfaceCard style={styles.packageCard}>
        <View style={styles.packageHeader}>
          <View style={styles.packageInfo}>
            <ThemedText type="defaultSemiBold">{pkg.name}</ThemedText>
            <View style={styles.packageMeta}>
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>{pkg.sessionCount} sessions</ThemedText>
              <View style={[styles.dot, { backgroundColor: palette.muted }]} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>{packageService.formatPrice(pkg.price, pkg.currency)}</ThemedText>
              {pkg.discountPercent > 0 && (<><View style={[styles.dot, { backgroundColor: palette.muted }]} />
                <ThemedText style={[styles.metaText, { color: palette.success }]}>{pkg.discountPercent}% off</ThemedText></>)}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: pkg.isActive ? withAlpha(palette.success, 0.09) : withAlpha(palette.error, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: pkg.isActive ? palette.success : palette.error }]}>
              {pkg.isActive ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.packageActions}>
          <Clickable style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => onEdit(pkg)}>
            <Ionicons name="create-outline" size={18} color={palette.tint} /><ThemedText style={[styles.actionText, { color: palette.tint }]}>Edit</ThemedText>
          </Clickable>
          <Clickable style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => onToggle(pkg)}>
            <Ionicons name={pkg.isActive ? 'pause-outline' : 'play-outline'} size={18} color={pkg.isActive ? palette.warning : palette.success} />
            <ThemedText style={[styles.actionText, { color: pkg.isActive ? palette.warning : palette.success }]}>{pkg.isActive ? 'Deactivate' : 'Activate'}</ThemedText>
          </Clickable>
          <Clickable accessibilityLabel="Delete package" style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => onDelete(pkg)}>
            <Ionicons name="trash-outline" size={18} color={palette.error} />
          </Clickable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  headerTitle: { flex: 1 },
  subtitle: { ...Typography.small, marginTop: Spacing.micro },
  addButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.lg },
  statsCard: { padding: Spacing.md, gap: Spacing.md },
  statsTitle: { ...Typography.body },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: Spacing.xxs },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.heading },
  packageList: { gap: Spacing.sm },
  packageCard: { padding: Spacing.md, gap: Spacing.sm },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  packageInfo: { flex: 1, gap: Spacing.xxs },
  packageMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  metaText: { ...Typography.caption },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  statusText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  packageActions: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm, borderWidth: 1 },
  actionText: { ...Typography.caption },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.lg },
  modalTitle: { ...Typography.title },
  closeButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
