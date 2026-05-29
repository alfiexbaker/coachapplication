import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

import { formatDate, formatTime } from './invoice-preview-helpers';
import { styles } from './invoice-preview-styles';

interface InvoiceSessionDetailsProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoiceSessionDetails = function InvoiceSessionDetails({
  invoice,
  palette,
}: InvoiceSessionDetailsProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
        SESSION DETAILS
      </ThemedText>

      <View style={styles.sessionDetails}>
        <Row align="flex-start" gap="sm">
          <Ionicons name="fitness-outline" size={18} color={palette.muted} />
          <View style={styles.detailContent}>
            <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Type</ThemedText>
            <ThemedText type="defaultSemiBold">
              {invoice.sessionType || 'Training Session'}
            </ThemedText>
          </View>
        </Row>

        <Row align="flex-start" gap="sm">
          <Ionicons name="person-outline" size={18} color={palette.muted} />
          <View style={styles.detailContent}>
            <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Athlete</ThemedText>
            <ThemedText type="defaultSemiBold">{invoice.athleteId || 'Athlete'}</ThemedText>
          </View>
        </Row>

        <Row align="flex-start" gap="sm">
          <Ionicons name="calendar-outline" size={18} color={palette.muted} />
          <View style={styles.detailContent}>
            <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>Date</ThemedText>
            <ThemedText type="defaultSemiBold">
              {formatDate(invoice.sessionDate)} at {formatTime(invoice.sessionDate)}
            </ThemedText>
          </View>
        </Row>

        {invoice.sessionLocation && (
          <Row align="flex-start" gap="sm">
            <Ionicons name="location-outline" size={18} color={palette.muted} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>
                Location
              </ThemedText>
              <ThemedText type="defaultSemiBold">{invoice.sessionLocation}</ThemedText>
            </View>
          </Row>
        )}

        {invoice.sessionDuration != null && (
          <Row align="flex-start" gap="sm">
            <Ionicons name="time-outline" size={18} color={palette.muted} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>
                Duration
              </ThemedText>
              <ThemedText type="defaultSemiBold">{invoice.sessionDuration} minutes</ThemedText>
            </View>
          </Row>
        )}
      </View>
    </SurfaceCard>
  );
};

interface InvoicePricingCardProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoicePricingCard = function InvoicePricingCard({
  invoice,
  palette,
}: InvoicePricingCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>PRICING</ThemedText>

      <View style={styles.pricingRows}>
        <Row justify="space-between" align="center" style={styles.pricingRow}>
          <ThemedText>Subtotal</ThemedText>
          <ThemedText>{invoiceService.formatAmount(invoice.amount)}</ThemedText>
        </Row>
        <Row justify="space-between" align="center" style={styles.pricingRow}>
          <ThemedText>VAT ({invoice.taxRate}%)</ThemedText>
          <ThemedText>{invoiceService.formatAmount(invoice.tax)}</ThemedText>
        </Row>
        <Row
          justify="space-between"
          align="center"
          style={[styles.pricingRow, styles.totalRow, { borderTopColor: palette.border }]}
        >
          <ThemedText type="subtitle">Total</ThemedText>
          <ThemedText type="subtitle">{invoiceService.formatAmount(invoice.total)}</ThemedText>
        </Row>
      </View>
    </SurfaceCard>
  );
};

interface InvoiceVoidCardProps {
  voidReason: string;
  voidedAt?: string;
  palette: ThemeColors;
}

export const InvoiceVoidCard = function InvoiceVoidCard({
  voidReason,
  voidedAt,
  palette,
}: InvoiceVoidCardProps) {
  return (
    <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
      <Row align="center" gap="xs" style={styles.voidHeader}>
        <Ionicons name="close-circle" size={18} color={palette.error} />
        <ThemedText style={[styles.sectionTitle, { color: palette.error, marginBottom: 0 }]}>
          VOIDED
        </ThemedText>
      </Row>
      <ThemedText style={[styles.voidReason, { color: palette.error }]}>{voidReason}</ThemedText>
      {voidedAt && (
        <ThemedText style={[styles.voidDate, { color: palette.muted }]}>
          Voided on {formatDate(voidedAt)}
        </ThemedText>
      )}
    </SurfaceCard>
  );
};

interface InvoiceSentInfoProps {
  sentTo: string;
  sentAt: string;
  palette: ThemeColors;
}

export const InvoiceSentInfo = function InvoiceSentInfo({
  sentTo,
  sentAt,
  palette,
}: InvoiceSentInfoProps) {
  return (
    <Row align="center" gap="xs" justify="center" style={styles.sentInfo}>
      <Ionicons name="checkmark-circle" size={16} color={palette.success} />
      <ThemedText style={[styles.sentText, { color: palette.muted }]}>
        Sent to {sentTo} on {formatDate(sentAt)}
      </ThemedText>
    </Row>
  );
};
