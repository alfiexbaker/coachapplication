/**
 * Admin Promo Codes Screen
 *
 * Manage promotional codes with stats, filters, and usage history.
 * All state/logic in usePromoCodes hook. Usage modal extracted to component.
 */

import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { PromoCodeCard } from '@/components/promo';
import { PromoUsageModal } from '@/components/promo/promo-usage-modal';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { usePromoCodes, type FilterType } from '@/hooks/use-promo-codes';
import { promoService } from '@/services/promo-service';

const FILTERS: FilterType[] = ['all', 'active', 'expired', 'exhausted', 'inactive'];

export default function AdminPromoCodesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = usePromoCodes();

  if (c.loading) return <LoadingState variant="list" />;
  if (c.error) return <ErrorState message="Failed to load promo codes" onRetry={c.handleRefresh} />;

  const renderHeader = () => (
    <>
      {/* Stats */}
      {c.stats && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <Row style={styles.statsRow}>
              {[
                { value: c.stats.totalCodes, label: 'Total Codes' },
                { value: c.stats.activeCodes, label: 'Active', color: palette.success },
                { value: c.stats.totalRedemptions, label: 'Redeemed' },
                { value: promoService.formatCredit(c.stats.totalCreditsAwarded), label: 'Awarded', color: palette.success },
              ].map((stat, i) => (
                <View key={stat.label} style={styles.statItem}>
                  {i > 0 && <View style={[styles.statDivider, { backgroundColor: palette.border }]} />}
                  <ThemedText type="title" style={[styles.statValue, stat.color ? { color: stat.color } : undefined]}>{stat.value}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{stat.label}</ThemedText>
                </View>
              ))}
            </Row>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Filters */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Row style={styles.filterContainer}>
          {FILTERS.map((f) => (
            <Clickable key={f} style={[styles.filterButton, {
              backgroundColor: c.filter === f ? palette.tint : palette.surface,
              borderColor: c.filter === f ? palette.tint : palette.border,
            }]} onPress={() => c.setFilter(f)}>
              <ThemedText style={[styles.filterText, { color: c.filter === f ? palette.onPrimary : palette.text }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </ThemedText>
            </Clickable>
          ))}
        </Row>
      </Animated.View>

      <View style={styles.listHeader}>
        <ThemedText type="subtitle" style={styles.listTitle}>Promo Codes ({c.filteredCodes.length})</ThemedText>
      </View>
    </>
  );

  return (
    <PageContainer
      header={
        <PageHeader title="Promo Codes" subtitle="Manage promotional codes" showBack
          right={
            <Clickable style={[styles.createButton, { backgroundColor: palette.tint }]} onPress={c.handleCreateCode}>
              <Row align="center" gap="xs">
                <Ionicons name="add" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>New</ThemedText>
              </Row>
            </Clickable>
          }
        />
      }
      gap={Spacing.md} scrollable={false}
    >
      <FlatList data={c.filteredCodes} keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(150 + index * 50).springify()}>
            <PromoCodeCard promoCode={item} onToggleActive={c.handleToggleActive} onViewUsage={c.handleViewUsage} />
          </Animated.View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
              <Ionicons name="pricetag-outline" size={40} color={palette.muted} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
              {c.filter === 'all' ? 'No promo codes yet' : `No ${c.filter} codes`}
            </ThemedText>
            <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
              {c.filter === 'all' ? 'Create your first promo code to get started' : `No promo codes match the "${c.filter}" filter`}
            </ThemedText>
            {c.filter === 'all' && (
              <Clickable style={[styles.createButtonSmall, { backgroundColor: palette.tint }]} onPress={c.handleCreateCode}>
                <Row align="center" gap="xs">
                  <Ionicons name="add" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.createButtonSmallText, { color: palette.onPrimary }]}>Create Code</ThemedText>
                </Row>
              </Clickable>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} tintColor={palette.tint} />}
      />

      <PromoUsageModal visible={c.usageModalVisible} selectedCode={c.selectedCode}
        usageData={c.usageData} usageLoading={c.usageLoading} onClose={c.closeUsageModal} />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  listContent: { paddingBottom: Spacing.xl, gap: Spacing.md },
  statsCard: { padding: Spacing.md },
  statsRow: { alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
  statDivider: { width: 1, height: 36, position: 'absolute', left: 0 },
  filterContainer: { gap: Spacing.xs, flexWrap: 'wrap' },
  filterButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  filterText: { ...Typography.smallSemiBold },
  listHeader: { marginTop: Spacing.xs },
  listTitle: { ...Typography.heading },
  createButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  createButtonText: { ...Typography.bodySmallSemiBold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { width: 80, height: 80, borderRadius: Radii['3xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.subheading },
  emptyDescription: { ...Typography.bodySmall, textAlign: 'center', paddingHorizontal: Spacing.lg },
  createButtonSmall: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.md },
  createButtonSmallText: { ...Typography.bodySmallSemiBold },
});
