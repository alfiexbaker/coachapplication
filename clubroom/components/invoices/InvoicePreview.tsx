import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

// ============================================================================
// TYPES
// ============================================================================

interface InvoicePreviewProps {
  invoice: Invoice;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const statusColor = invoiceService.getStatusColor(invoice.status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Invoice Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="display" style={styles.invoiceNumber}>
            {invoice.invoiceNumber}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {invoiceService.getStatusLabel(invoice.status)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <ThemedText style={[styles.amountLabel, { color: palette.muted }]}>Total</ThemedText>
          <ThemedText type="display" style={styles.amount}>
            {invoiceService.formatAmount(invoice.total)}
          </ThemedText>
        </View>
      </View>

      {/* Date Info */}
      <SurfaceCard style={styles.card}>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Issued</ThemedText>
            <ThemedText type="defaultSemiBold">{formatDate(invoice.createdAt)}</ThemedText>
          </View>
          {invoice.dueDate && invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Due Date</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
                {formatDate(invoice.dueDate)}
              </ThemedText>
            </View>
          )}
          {invoice.paidAt && (
            <View style={styles.dateItem}>
              <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Paid</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {formatDate(invoice.paidAt)}
              </ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>

      {/* From / To */}
      <View style={styles.partiesContainer}>
        <SurfaceCard style={[styles.card, styles.partyCard]}>
          <ThemedText style={[styles.partyLabel, { color: palette.muted }]}>FROM</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.partyName}>
            {invoice.coachBusinessName || invoice.coachName}
          </ThemedText>
          {invoice.coachBusinessEmail && (
            <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
              {invoice.coachBusinessEmail}
            </ThemedText>
          )}
          {invoice.coachBusinessAddress && (
            <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
              {invoice.coachBusinessAddress}
            </ThemedText>
          )}
        </SurfaceCard>

        <SurfaceCard style={[styles.card, styles.partyCard]}>
          <ThemedText style={[styles.partyLabel, { color: palette.muted }]}>BILL TO</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.partyName}>
            {invoice.userName}
          </ThemedText>
          {invoice.billingAddress && (
            <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
              {invoice.billingAddress}
            </ThemedText>
          )}
        </SurfaceCard>
      </View>

      {/* Session Details */}
      <SurfaceCard style={styles.card}>
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          SESSION DETAILS
        </ThemedText>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="fitness-outline" size={18} color={palette.muted} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Type</ThemedText>
              <ThemedText type="defaultSemiBold">{invoice.sessionType || 'Training Session'}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={18} color={palette.muted} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Athlete</ThemedText>
              <ThemedText type="defaultSemiBold">{invoice.athleteName}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Date</ThemedText>
              <ThemedText type="defaultSemiBold">
                {formatDate(invoice.sessionDate)} at {formatTime(invoice.sessionDate)}
              </ThemedText>
            </View>
          </View>

          {invoice.sessionLocation && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <View style={styles.detailContent}>
                <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Location</ThemedText>
                <ThemedText type="defaultSemiBold">{invoice.sessionLocation}</ThemedText>
              </View>
            </View>
          )}

          {invoice.sessionDuration && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={palette.muted} />
              <View style={styles.detailContent}>
                <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Duration</ThemedText>
                <ThemedText type="defaultSemiBold">{invoice.sessionDuration} minutes</ThemedText>
              </View>
            </View>
          )}
        </View>
      </SurfaceCard>

      {/* Pricing Breakdown */}
      <SurfaceCard style={styles.card}>
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          PRICING
        </ThemedText>

        <View style={styles.pricingRows}>
          <View style={styles.pricingRow}>
            <ThemedText>Subtotal</ThemedText>
            <ThemedText>{invoiceService.formatAmount(invoice.amount)}</ThemedText>
          </View>
          <View style={styles.pricingRow}>
            <ThemedText>VAT ({invoice.taxRate}%)</ThemedText>
            <ThemedText>{invoiceService.formatAmount(invoice.tax)}</ThemedText>
          </View>
          <View style={[styles.pricingRow, styles.totalRow, { borderTopColor: palette.border }]}>
            <ThemedText type="subtitle">Total</ThemedText>
            <ThemedText type="subtitle">{invoiceService.formatAmount(invoice.total)}</ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Notes */}
      {invoice.notes && (
        <SurfaceCard style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>NOTES</ThemedText>
          <ThemedText style={styles.notes}>{invoice.notes}</ThemedText>
        </SurfaceCard>
      )}

      {/* Void Reason */}
      {invoice.status === 'VOID' && invoice.voidReason && (
        <SurfaceCard style={[styles.card, { backgroundColor: `${palette.error}08` }]}>
          <View style={styles.voidHeader}>
            <Ionicons name="close-circle" size={18} color={palette.error} />
            <ThemedText style={[styles.sectionTitle, { color: palette.error, marginBottom: 0 }]}>
              VOIDED
            </ThemedText>
          </View>
          <ThemedText style={[styles.voidReason, { color: palette.error }]}>
            {invoice.voidReason}
          </ThemedText>
          {invoice.voidedAt && (
            <ThemedText style={[styles.voidDate, { color: palette.muted }]}>
              Voided on {formatDate(invoice.voidedAt)}
            </ThemedText>
          )}
        </SurfaceCard>
      )}

      {/* Sent Info */}
      {invoice.sentAt && invoice.sentTo && (
        <View style={styles.sentInfo}>
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={[styles.sentText, { color: palette.muted }]}>
            Sent to {invoice.sentTo} on {formatDate(invoice.sentAt)}
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  invoiceNumber: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  amount: {
    fontSize: 28,
  },
  card: {
    padding: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  dateItem: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partiesContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  partyCard: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  partyName: {
    fontSize: 15,
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sessionDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
  },
  pricingRows: {
    gap: Spacing.xs,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
  },
  voidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  voidReason: {
    fontSize: 14,
  },
  voidDate: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  sentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'center',
    paddingTop: Spacing.sm,
  },
  sentText: {
    fontSize: 13,
  },
});
