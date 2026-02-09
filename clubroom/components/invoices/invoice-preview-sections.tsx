/**
 * Extracted sub-components for InvoicePreview.
 *
 * formatDate / formatTime — date formatting helpers.
 * InvoiceHeader — invoice number, status, amount.
 * InvoiceDateCard — issue/due/paid dates.
 * InvoicePartiesRow — from/to party cards.
 * InvoiceSessionDetails — session info card.
 * InvoicePricingCard — pricing breakdown.
 * InvoiceVoidCard — void reason card.
 * InvoiceSentInfo — sent confirmation.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── InvoiceHeader ───────────────────────────────────────────────────────────

interface InvoiceHeaderProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoiceHeader = memo(function InvoiceHeader({
  invoice,
  palette,
}: InvoiceHeaderProps) {
  const statusColor = invoiceService.getStatusColor(invoice.status);

  return (
    <View style={styles.header}>
      <View>
        <ThemedText type="display" style={styles.invoiceNumber}>
          {invoice.invoiceNumber}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
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
  );
});

// ─── InvoiceDateCard ─────────────────────────────────────────────────────────

interface InvoiceDateCardProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoiceDateCard = memo(function InvoiceDateCard({
  invoice,
  palette,
}: InvoiceDateCardProps) {
  return (
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
  );
});

// ─── InvoicePartiesRow ───────────────────────────────────────────────────────

interface InvoicePartiesRowProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoicePartiesRow = memo(function InvoicePartiesRow({
  invoice,
  palette,
}: InvoicePartiesRowProps) {
  return (
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
  );
});

// ─── InvoiceSessionDetails ───────────────────────────────────────────────────

interface InvoiceSessionDetailsProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoiceSessionDetails = memo(function InvoiceSessionDetails({
  invoice,
  palette,
}: InvoiceSessionDetailsProps) {
  return (
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
  );
});

// ─── InvoicePricingCard ──────────────────────────────────────────────────────

interface InvoicePricingCardProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoicePricingCard = memo(function InvoicePricingCard({
  invoice,
  palette,
}: InvoicePricingCardProps) {
  return (
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
  );
});

// ─── InvoiceVoidCard ─────────────────────────────────────────────────────────

interface InvoiceVoidCardProps {
  voidReason: string;
  voidedAt?: string;
  palette: ThemeColors;
}

export const InvoiceVoidCard = memo(function InvoiceVoidCard({
  voidReason,
  voidedAt,
  palette,
}: InvoiceVoidCardProps) {
  return (
    <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
      <View style={styles.voidHeader}>
        <Ionicons name="close-circle" size={18} color={palette.error} />
        <ThemedText style={[styles.sectionTitle, { color: palette.error, marginBottom: 0 }]}>
          VOIDED
        </ThemedText>
      </View>
      <ThemedText style={[styles.voidReason, { color: palette.error }]}>
        {voidReason}
      </ThemedText>
      {voidedAt && (
        <ThemedText style={[styles.voidDate, { color: palette.muted }]}>
          Voided on {formatDate(voidedAt)}
        </ThemedText>
      )}
    </SurfaceCard>
  );
});

// ─── InvoiceSentInfo ─────────────────────────────────────────────────────────

interface InvoiceSentInfoProps {
  sentTo: string;
  sentAt: string;
  palette: ThemeColors;
}

export const InvoiceSentInfo = memo(function InvoiceSentInfo({
  sentTo,
  sentAt,
  palette,
}: InvoiceSentInfoProps) {
  return (
    <View style={styles.sentInfo}>
      <Ionicons name="checkmark-circle" size={16} color={palette.success} />
      <ThemedText style={[styles.sentText, { color: palette.muted }]}>
        Sent to {sentTo} on {formatDate(sentAt)}
      </ThemedText>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
  invoiceNumber: { ...Typography.display, marginBottom: Spacing.xs },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statusText: { ...Typography.smallSemiBold },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  amount: { ...Typography.display },
  card: {
    padding: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  dateItem: {
    gap: Spacing.micro,
  },
  dateLabel: {
    ...Typography.caption,
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
    ...Typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  partyName: { ...Typography.body, marginBottom: Spacing.xxs },
  partyDetail: { ...Typography.small, lineHeight: 18 },
  sectionTitle: {
    ...Typography.caption,
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
    gap: Spacing.micro,
  },
  detailLabel: { ...Typography.caption },
  pricingRows: {
    gap: Spacing.xs,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xxs,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  voidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  voidReason: { ...Typography.bodySmall },
  voidDate: { ...Typography.caption, marginTop: Spacing.xs },
  sentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'center',
    paddingTop: Spacing.sm,
  },
  sentText: { ...Typography.small },
});
