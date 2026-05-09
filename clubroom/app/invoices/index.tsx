import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { InvoiceList } from '@/components/invoices';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { invoiceService } from '@/services/invoice-service';
import { Invoice, InvoiceSummary, InvoiceFilter } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('InvoicesScreen');

// ============================================================================
// COMPONENT
// ============================================================================

export default function InvoicesScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [filter, setFilter] = useState<InvoiceFilter>({});

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<{ invoices: Invoice[]; summary: InvoiceSummary | null }>({
        invoices: [],
        summary: null,
      });
    }

    try {
      const invoicesData = filter.status || filter.dateFrom || filter.dateTo || filter.bookingId || filter.coachId
        ? await invoiceService.getInvoicesFiltered(currentUser.id, filter)
        : await invoiceService.getUserInvoices(currentUser.id);
      const summaryData = invoiceService.summarizeInvoices(currentUser.id, invoicesData);

      return ok<{ invoices: Invoice[]; summary: InvoiceSummary | null }>({
        invoices: invoicesData,
        summary: summaryData,
      });
    } catch (error) {
      logger.error('Failed to load invoices', error);
      return err(serviceError('UNKNOWN', 'Failed to load invoices.', error));
    }
  }, [currentUser?.id, filter]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{
    invoices: Invoice[];
    summary: InvoiceSummary | null;
  }>({
    load: loadData,
    deps: [
      currentUser?.id,
      filter.status,
      filter.dateFrom,
      filter.dateTo,
      filter.bookingId,
      filter.coachId,
    ],
    isEmpty: (value) => value.invoices.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: `invoices:${currentUser?.id ?? 'guest'}:${filter.status ?? 'all'}:${filter.dateFrom ?? 'none'}:${filter.dateTo ?? 'none'}:${filter.bookingId ?? 'none'}:${filter.coachId ?? 'none'}`,
  });

  const invoices = data?.invoices ?? [];
  const summary = data?.summary ?? null;

  const handleFilterChange = (newFilter: InvoiceFilter) => {
    setFilter(newFilter);
  };

  if (status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Invoices" subtitle="Your receipts and invoices" showBack />}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Invoices" subtitle="Your receipts and invoices" showBack />}
      >
        <ErrorState message={error?.message || 'Failed to load invoices.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer
        header={<PageHeader title="Invoices" subtitle="Your receipts and invoices" showBack />}
      >
        <EmptyState
          icon="receipt-outline"
          title="No invoices yet"
          message="Invoices for completed sessions will show up here."
          actionLabel="Refresh"
          onPressAction={onRefresh}
        />
      </PageContainer>
    );
  }

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.summaryCard}>
          <Row justify="between" align="center" style={styles.summaryHeader}>
            <ThemedText type="subtitle">Summary</ThemedText>
            <ThemedText style={[styles.summaryTotal, { color: palette.muted }]}>
              {summary.totalInvoices} invoices
            </ThemedText>
          </Row>

          <Row gap="lg" style={styles.summaryStats}>
            {/* Total Paid */}
            <Row align="start" gap="sm" style={styles.statItem}>
              <View
                style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
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
            </Row>

            {/* Pending */}
            <Row align="start" gap="sm" style={styles.statItem}>
              <View
                style={[styles.statIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
              >
                <Ionicons name="time" size={18} color={palette.warning} />
              </View>
              <View>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  Pending
                </ThemedText>
                <ThemedText type="defaultSemiBold">
                  {invoiceService.formatAmount(summary.totalPending)}
                </ThemedText>
                <ThemedText style={[styles.statCount, { color: palette.muted }]}>
                  {summary.pendingCount} invoices
                </ThemedText>
              </View>
            </Row>
          </Row>

          {/* Draft indicator */}
          {summary.draftCount > 0 && (
            <Row
              align="center"
              gap="xs"
              style={[styles.draftBanner, { backgroundColor: palette.surfaceSecondary }]}
            >
              <Ionicons name="document-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.draftText, { color: palette.muted }]}>
                {summary.draftCount} draft{summary.draftCount > 1 ? 's' : ''} pending
              </ThemedText>
            </Row>
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
        loading={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onFilterChange={handleFilterChange}
        showFilters={true}
        emptyMessage="No invoices yet"
        ListHeaderComponent={renderSummary() ?? undefined}
      />
    </PageContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  summaryHeader: {},
  summaryTotal: {
    ...Typography.small,
  },
  summaryStats: {},
  statItem: {
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
    ...Typography.caption,
  },
  statCount: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  draftBanner: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  draftText: {
    ...Typography.small,
  },
});
