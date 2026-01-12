import { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { InvoiceList } from '@/components/invoices';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { invoiceService } from '@/services/invoice-service';
import { Invoice, InvoiceSummary, InvoiceFilter } from '@/constants/types';

// ============================================================================
// COMPONENT
// ============================================================================

export default function InvoicesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<InvoiceFilter>({});

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [invoicesData, summaryData] = await Promise.all([
        filter.status || filter.dateFrom || filter.dateTo
          ? invoiceService.getInvoicesFiltered(currentUser.id, filter)
          : invoiceService.getUserInvoices(currentUser.id),
        invoiceService.getInvoiceSummary(currentUser.id),
      ]);

      setInvoices(invoicesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, filter]);

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

  const handleFilterChange = (newFilter: InvoiceFilter) => {
    setFilter(newFilter);
  };

  // Reload when filter changes
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadData();
      }
    }, [filter])
  );

  if (loading) {
    return (
      <PageContainer
        header={<PageHeader title="Invoices" subtitle="Your receipts and invoices" showBack />}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading invoices...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <ThemedText type="subtitle">Summary</ThemedText>
            <ThemedText style={[styles.summaryTotal, { color: palette.muted }]}>
              {summary.totalInvoices} invoices
            </ThemedText>
          </View>

          <View style={styles.summaryStats}>
            {/* Total Paid */}
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              </View>
              <View>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Paid</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {invoiceService.formatAmount(summary.totalPaid)}
                </ThemedText>
                <ThemedText style={[styles.statCount, { color: palette.muted }]}>
                  {summary.paidCount} invoices
                </ThemedText>
              </View>
            </View>

            {/* Pending */}
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: `${palette.warning}15` }]}>
                <Ionicons name="time" size={18} color={palette.warning} />
              </View>
              <View>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Pending</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {invoiceService.formatAmount(summary.totalPending)}
                </ThemedText>
                <ThemedText style={[styles.statCount, { color: palette.muted }]}>
                  {summary.pendingCount} invoices
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Draft indicator */}
          {summary.draftCount > 0 && (
            <View style={[styles.draftBanner, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="document-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.draftText, { color: palette.muted }]}>
                {summary.draftCount} draft{summary.draftCount > 1 ? 's' : ''} pending
              </ThemedText>
            </View>
          )}
        </SurfaceCard>
      </Animated.View>
    );
  };

  return (
    <PageContainer
      header={<PageHeader title="Invoices" subtitle="Your receipts and invoices" showBack />}
      scrollable={false}
    >
      <InvoiceList
        invoices={invoices}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onFilterChange={handleFilterChange}
        showFilters={true}
        emptyMessage="No invoices yet"
        ListHeaderComponent={renderSummary()}
      />
    </PageContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
  summaryCard: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotal: {
    fontSize: 13,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
  },
  statCount: {
    fontSize: 11,
    marginTop: 2,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  draftText: {
    fontSize: 13,
  },
});
