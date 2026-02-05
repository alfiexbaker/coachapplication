import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { createLogger } from '@/utils/logger';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { PromoCodeCard, CodeUsageList, CodeUsageSummary } from '@/components/promo';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { promoService } from '@/services/promo-service';
import type { PromoCode, PromoCodeUsage, PromoCodeStats } from '@/constants/types';

const logger = createLogger('AdminPromoCodesScreen');

type FilterType = 'all' | 'active' | 'expired' | 'exhausted' | 'inactive';

export default function AdminPromoCodesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Usage modal state
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [usageData, setUsageData] = useState<PromoCodeUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [codesData, statsData] = await Promise.all([
        promoService.getAllPromoCodes(),
        promoService.getCodeStats(),
      ]);

      setCodes(codesData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load promo codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleToggleActive = async (codeId: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await promoService.deactivateCode(codeId);
      } else {
        await promoService.reactivateCode(codeId);
      }
      await loadData();
    } catch (error) {
      logger.error('Failed to toggle code status:', error);
    }
  };

  const handleViewUsage = async (codeId: string) => {
    setSelectedCodeId(codeId);
    setUsageModalVisible(true);
    setUsageLoading(true);

    try {
      const usage = await promoService.getCodeUsage(codeId);
      setUsageData(usage);
    } catch (error) {
      logger.error('Failed to load usage:', error);
      setUsageData([]);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleCreateCode = () => {
    router.push('/admin/promo-codes/create');
  };

  const getFilteredCodes = (): PromoCode[] => {
    if (filter === 'all') return codes;

    return codes.filter((code) => {
      const status = promoService.getCodeStatus(code);
      return status === filter;
    });
  };

  const filteredCodes = getFilteredCodes();

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {stats.totalCodes}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Total Codes
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
                {stats.activeCodes}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Active
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={styles.statValue}>
                {stats.totalRedemptions}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Redeemed
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
                {promoService.formatCredit(stats.totalCreditsAwarded)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Awarded
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <View style={styles.filterContainer}>
        {(['all', 'active', 'expired', 'exhausted', 'inactive'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === f ? palette.tint : palette.surface,
                borderColor: filter === f ? palette.tint : palette.border,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === f ? '#FFFFFF' : palette.text },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderPromoCode = ({ item, index }: { item: PromoCode; index: number }) => (
    <Animated.View entering={FadeInDown.delay(150 + index * 50).springify()}>
      <PromoCodeCard
        promoCode={item}
        onToggleActive={handleToggleActive}
        onViewUsage={handleViewUsage}
      />
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}15` }]}>
        <Ionicons name="pricetag-outline" size={40} color={palette.muted} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
        {filter === 'all' ? 'No promo codes yet' : `No ${filter} codes`}
      </ThemedText>
      <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
        {filter === 'all'
          ? 'Create your first promo code to get started'
          : `No promo codes match the "${filter}" filter`}
      </ThemedText>
      {filter === 'all' && (
        <TouchableOpacity
          style={[styles.createButtonSmall, { backgroundColor: palette.tint }]}
          onPress={handleCreateCode}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <ThemedText style={styles.createButtonSmallText}>Create Code</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <>
      {renderStatsCard()}
      {renderFilters()}
      <View style={styles.listHeader}>
        <ThemedText type="subtitle" style={styles.listTitle}>
          Promo Codes ({filteredCodes.length})
        </ThemedText>
      </View>
    </>
  );

  const selectedCode = codes.find((c) => c.id === selectedCodeId);

  if (loading) {
    return (
      <PageContainer
        header={<PageHeader title="Promo Codes" subtitle="Manage promotional codes" showBack />}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading promo codes...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Promo Codes"
          subtitle="Manage promotional codes"
          showBack
          right={
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: palette.tint }]}
              onPress={handleCreateCode}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <ThemedText style={styles.createButtonText}>New</ThemedText>
            </TouchableOpacity>
          }
        />
      }
      gap={Spacing.md}
      scrollable={false}
    >
      <FlatList
        data={filteredCodes}
        keyExtractor={(item) => item.id}
        renderItem={renderPromoCode}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
      />

      {/* Usage Modal */}
      <Modal
        visible={usageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUsageModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: palette.background }]}
          edges={['top']}
        >
          <View style={styles.modalHeader}>
            <View>
              <ThemedText type="title" style={styles.modalTitle}>
                Usage History
              </ThemedText>
              {selectedCode && (
                <ThemedText style={[styles.modalSubtitle, { color: palette.tint }]}>
                  {selectedCode.code}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={() => setUsageModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedCode && (
              <CodeUsageSummary
                totalRedemptions={selectedCode.currentUses}
                totalCreditsAwarded={selectedCode.currentUses * selectedCode.creditAmount}
                loading={usageLoading}
              />
            )}

            <View style={styles.usageListContainer}>
              <ThemedText type="defaultSemiBold" style={styles.usageListTitle}>
                Recent Redemptions
              </ThemedText>
              <CodeUsageList
                usage={usageData}
                loading={usageLoading}
                emptyMessage="No redemptions yet for this code"
                showUser={true}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  statsCard: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listHeader: {
    marginTop: Spacing.xs,
  },
  listTitle: {
    fontSize: 18,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  createButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  createButtonSmallText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  usageListContainer: {
    flex: 1,
    gap: Spacing.md,
  },
  usageListTitle: {
    fontSize: 16,
  },
});
